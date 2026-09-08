

import express from "express";
import { 
    updateUser,
    deleteUser, 
    getAllUser, 
    getSingleUser,
    getUserProfile,
    getUserById,
} 
from "../Controllers/userController.js";
import { authenticate, restrict } from "../auth/verifyToken.js";
import { requireAdmin } from "../auth/authorize.js";

const router = express.Router();

// Declared before '/:userId' so the guarded handler is actually reachable —
// Express matches the first route of a fitting shape, so the authenticated one
// below was dead code and every request fell through to the public handler.
router.get('/:id', authenticate, restrict(['guest']), getSingleUser);
router.get("/:userId", getUserById);
// The full user list is a PII dump; it was public.
router.get('/', requireAdmin, getAllUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/profile/me/:id', authenticate, restrict(['guest']), getUserProfile);

export default router;