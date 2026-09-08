import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  message: { type: String, required: true }, // Simple string
  users: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reciver: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Host",
    required: true,
  },
}, { timestamps: true });


// Export the mongoose model
export default mongoose.model("Messages", MessageSchema);
