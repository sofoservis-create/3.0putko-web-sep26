import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { email, password, name, phone, photo, gender, role } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      email,
      password: hashedPassword,
      name,
      phone,
      photo,
      gender,
      role: role || "superadmin",
    });

    // Save admin to database
    await newAdmin.save();

    // Generate JWT token
    const token = jwt.sign(
      { adminId: newAdmin._id, role: newAdmin.role }, // Include role in token
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ status:"true", message: "Admin registered successfully", token, admin: newAdmin });
  } catch (error) {
    console.error(  'Error registering admin:', error.message); // Log the exact error
    res.status(500).json({ message: 'Error registering admin' });
  }
};
// Login Admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token with role
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role }, // Include role
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, admin });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in admin' });
  }
};

// Get All Admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Error getting admins' });
  }
};

// Get Admin by ID
export const getAdminById = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const admin = await Admin.findById(adminId).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Error getting admin' });
  }
};

// Update Admin
export const updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const { name, phone, photo, gender } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.name = name;
    admin.phone = phone;
    admin.photo = photo;
    admin.gender = gender;

    await admin.save();

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin' });
  }
};

// Delete Admin
export const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    await Admin.findByIdAndDelete(adminId);
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting admin' });
  }
};