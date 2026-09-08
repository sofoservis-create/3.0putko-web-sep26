import express from 'express';
import { registerAdmin, loginAdmin, getAllAdmins, getAdminById, updateAdmin, deleteAdmin } from '../Controllers/AdminController.js';
import { requireAdmin, requireAdminOrBootstrap } from '../auth/authorize.js';


const router = express.Router();

// Register Admin — only an existing admin may create another, with an exemption
// on a fresh install where none exists yet. This was open to the internet, so
// anyone could POST themselves a superadmin account and from there reach every
// other admin-gated route.
router.post('/register', requireAdminOrBootstrap, registerAdmin);

// Login Admin
router.post('/login', loginAdmin);

// Get All Admins
router.get('/', requireAdmin, getAllAdmins);

// Get Admin by ID
router.get('/:adminId', requireAdmin, getAdminById);

// Update Admin
router.patch('/:adminId', requireAdmin, updateAdmin);

// Delete Admin
router.delete('/:adminId', requireAdmin, deleteAdmin);

export default router;