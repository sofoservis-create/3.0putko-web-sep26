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

// IP address plus user agent plus a timestamp identifies a person; this is
// personal data and it was kept indefinitely. Twelve months is the usual ceiling
// for a security audit trail — long enough to investigate an incident, short
// enough to be defensible under GDPR Art. 5(1)(e).
LoginHistorySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 }
);

export default mongoose.models.LoginHistory || mongoose.model("LoginHistory", LoginHistorySchema);
