// models/LoginHistory.js
import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Host",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ip: String,
  userAgent: String,
});

export default mongoose.models.LoginHistory || mongoose.model("LoginHistory", LoginHistorySchema);
