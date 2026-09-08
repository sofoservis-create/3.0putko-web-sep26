// controllers/emailController.js
import EmailSubscription from '../models/EmailSubscription.js';

export const subscribeEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Save email to the database
    const newSubscriber = new EmailSubscription({ email });
    await newSubscriber.save();
    res.status(201).json({ message: 'Subscription successful' });
  } catch (error) {
    if (error.code === 11000) { // Duplicate email error
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(500).json({ error: 'An error occurred while subscribing' });
  }
};

export const getEmails = async (req, res) => {
    try {
      const emails = await EmailSubscription.find(); // Fetch all emails from the DB
      res.status(200).json(emails);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while fetching emails' });
    }
  };