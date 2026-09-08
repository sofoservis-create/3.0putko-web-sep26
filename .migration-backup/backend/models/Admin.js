import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: Number }, // Changed from Number to String
  photo: { type: String },
  role: { type: String, enum: ["superadmin"], default: "superadmin" }, // Add role
  // isAdmin: { type: Boolean, default: true },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" }, // Added default value
}, { timestamps: true }); // Added timestamps

export default mongoose.model("admin", AdminSchema);
