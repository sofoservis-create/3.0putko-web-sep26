import mongoose from "mongoose";

// Register results are shared: several hosts may legitimately use the same IČO.
const CompanyLookupSchema = new mongoose.Schema(
  {
    ico: { type: String, required: true, unique: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    complete: { type: Boolean, default: false },
    fetchedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CompanyLookup", CompanyLookupSchema);
