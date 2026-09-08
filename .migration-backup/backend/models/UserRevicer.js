import mongoose from "mongoose";

const ReceiverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
   
  },
  userReceivers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true,
    unique: true, // Each user will have one unique document
  }]
}, { timestamps: true });

// Export the mongoose model
export default mongoose.model("Receiver", ReceiverSchema);
