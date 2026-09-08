import mongoose from 'mongoose';

// Email subscription schema
const emailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
});


export default mongoose.model('EmailSubscription', emailSchema);