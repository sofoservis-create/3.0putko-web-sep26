

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

const router = express.Router();

router.get("/:userId", getUserById);
router.get('/:id', authenticate, restrict(['guest']), getSingleUser);
router.get('/',  getAllUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/profile/me/:id', authenticate, restrict(['guest']), getUserProfile);

export default router;