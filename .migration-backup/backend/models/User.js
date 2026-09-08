import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    name: { type: String, required: true },
    phone: { type: String }, // Changed from Number to String
    photo: { type: String },
    role: {
      type: String,
      enum: ["guest", "admin"],
      default: "guest",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    address: {
        type: String,
        required: false,
    },
    aboutYou: {
        type: String,
        required: false,
    },
    // Address information
    streetNumber: { type: String },
    city: { type: String },
    zipcode: { type: String },
    country: { type: String },
    // Identification information
    idNumber: { type: String },  // National ID or similar
    tin: { type: String },  // Tax Identification Number
    vatNumber: { type: String },  
    companyName: { type: String },  // VAT number for companies
    phoneNumber: { type: String },  // Alternative phone number
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Accommodation',
  }],
  // Reset Password Fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

export default mongoose.model("User", UserSchema);
