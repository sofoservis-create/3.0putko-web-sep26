import mongoose from "mongoose";

// Webhook idempotency ledger. Stripe retries any delivery that does not return
// 2xx, so without this a retry would re-run the whole handler: duplicate
// confirmation emails, duplicate calendar entries, duplicate side effects.
const ProcessedWebhookEventSchema = new mongoose.Schema({
  stripeEventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String },
  processedAt: { type: Date, default: Date.now },
  // Rows are claimed before handling and only marked complete afterwards, so a
  // crash mid-handler leaves a visible "processing" row rather than a silent gap.
  status: {
    type: String,
    enum: ["processing", "completed", "failed"],
    default: "processing",
    index: true,
  },
  error: { type: String },
});

// Housekeeping: Stripe only retries for ~3 days, so old rows carry no value.
ProcessedWebhookEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const ProcessedWebhookEvent = mongoose.model(
  "ProcessedWebhookEvent",
  ProcessedWebhookEventSchema
);

export default ProcessedWebhookEvent;
