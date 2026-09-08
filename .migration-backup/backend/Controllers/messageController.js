import Message from "../models/messageModel.js";
import mongoose from "mongoose";
import { getTransporter } from "../utils/mailer.js";
import { brandShell, logoAttachments } from "../utils/emailLayout.js";
import User from "../models/User.js";

// Add a new message
export const addMessage = async (req, res) => {
  const { message, users, sender, reciver } = req.body;

  try {
    // Validate that users and sender are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(sender)) {
      return res.status(400).json({ message: "Invalid sender ID" });
    }

    users.forEach((userId) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: `Invalid user ID: ${userId}` });
      }
    });

    // Create the message document
    const newMessage = new Message({
      message,
      users,
      sender,
      reciver
    });

    // Save to the database
    await newMessage.save();

    res.status(201).json({ message: "Message added successfully", data: newMessage });
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Get messages between two users
// Backend route (GET with query params)
export const getMessages = async (req, res) => {
  const { userId1, userId2 } = req.query; // Get from query parameters

  try {
    // Validate that userId1 and userId2 are valid ObjectIds
    // if (!mongoose.Types.ObjectId.isValid(userId1) && !mongoose.Types.ObjectId.isValid(userId2)) {
    //   return res.status(400).json({ message: "Invalid user IDs" });
    // }

    // Find all messages where both users are part of the conversation
    const messages = await Message.find({
      users: { $all: [userId1, userId2] },
    }).sort({ createdAt: 1 }); // Sort by creation date (ascending)

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


export async function handler(req, res) {
  if (req.method === "POST") {
    const { email, message, subject } = req.body;

     // Create reusable transporter object using SMTP transport
    let transporter = getTransporter();

    // Email options.
    //
    // `message` is caller-supplied HTML and is placed in the body as-is — this
    // endpoint has always been a passthrough. It is wrapped in the Putko shell
    // so it at least arrives looking like the rest of our mail.
    //
    // SECURITY: this route (POST /api/send) has no authentication, so the
    // recipient, subject and body are all attacker-controlled. See the note in
    // Routes/message.js.
    let mailOptions = {
      from: '"Putko Support" <support@putko.sk>', // Must match the authenticated email
      to: email, // Recipient email
      subject: subject || "Reservation Confirmation",
      attachments: logoAttachments(),
      html: brandShell({
        preheader: subject || "Reservation Confirmation",
        title: subject || "Reservation Confirmation",
        bodyHtml: message || "",
      }),
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error sending email", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  } else {
    res.status(405).json({ message: "Only POST requests allowed" });
  }
}

// Get all messages by second user ID in the users array
export const getMessagesBySecondUser = async (req, res) => {
  const { secondUserId } = req.body; // Assume the second user ID is passed in the request body

  try {
    // Validate the secondUserId is a valid ObjectId
  

    // Find all messages where the second user in the array matches the secondUserId
    const messages = await Message.find({
      "users.1": secondUserId, // Query where the second index (users[1]) is the provided user ID
    }).sort({ createdAt: 1 }); // Sort by creation date (ascending)
    console.log(messages)

    // Return the messages
    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages by second user ID:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Controller function to fetch receivers by sender
export const fetchReceiversBySender = async (req, res) => {
  const { senderId } = req.params; // Extract senderId from request parameters

  try {
    // Find all messages sent by the particular sender
    const messages = await Message.find({ sender: senderId })
      .populate({
        path: 'users', // Populate the 'users' field (receivers)
        select: 'name email _id', // Select desired fields from the User model
      })
      .exec();

    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this sender.' });
    }

    // Extract receivers' details from the messages
    const receivers = messages.map(message => message.users);

    // Flatten the array and remove duplicate receiver details based on user _id
    const uniqueReceivers = [...new Map(receivers.flat().map(user => [user._id.toString(), user])).values()];

    // Respond with the list of unique receiver details
    res.status(200).json({ receivers: uniqueReceivers });
  } catch (error) {
    console.error('Error fetching receivers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
 
// Controller function to fetch all receivers who have interacted with a specific sender
export const getReceiversBySenderId = async (req, res) => {
  const { senderId } = req.params; // Extract senderId from request parameters

  try {
    // Find all messages sent by the particular sender
    const messages = await Message.find({ sender: senderId })
      .populate({
        path: 'users', // Populate the 'users' field (all receivers)
        select: 'name email _id', // Select desired fields from the User model
      })
      .exec();

    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this sender.' });
    }

    // Create a Set to store unique receivers
    const receiverIds = new Set();

    // Loop through messages and add receivers to the set
    messages.forEach(message => {
      message.users.forEach(receiver => {
        if (receiver._id.toString() !== senderId) { // Exclude the sender from the receivers
          receiverIds.add(receiver._id.toString());
        }
      });
    });

    // Fetch detailed info for each unique receiver
    const receivers = await Promise.all(
      Array.from(receiverIds).map(async (id) => {
        const user = await User.findById(id).select('name email _id');
        return user;
      })
    );

    // Respond with the list of unique receiver details
    res.status(200).json({ receivers });
  } catch (error) {
    console.error('Error fetching receivers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getSendersByReceiverId = async (req, res) => {
  const { receiverId } = req.params; // Extract receiverId from request parameters

  try {
    // Find all messages where the receiver is involved
    const messages = await Message.find({ users: { $in: [receiverId] } })
      .populate({
        path: 'users', // Populate the 'users' field (all senders)
        select: 'name email _id', // Select desired fields from the User model
      })
      .exec();

    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this receiver.' });
    }

    // Create a Set to store unique senders
    const senderIds = new Set();

    // Loop through messages and add senders to the set
    messages.forEach(message => {
      message.users.forEach(sender => {
        if (sender._id.toString() !== receiverId) { // Exclude the receiver from the senders
          senderIds.add(sender._id.toString());
        }
      });
    });

    // Fetch detailed info for each unique sender
    const senders = await Promise.all(
      Array.from(senderIds).map(async (id) => {
        const user = await User.findById(id).select('name email _id');
        return user;
      })
    );

    // Respond with the list of unique sender details
    res.status(200).json({ senders });
  } catch (error) {
    console.error('Error fetching senders:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
