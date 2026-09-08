import express from "express";
import { 
    updateHost,
    deleteHost,
    getAllHosts,
    getSingleHost,
    getHostProfile,
    getHostById
} 
from "../Controllers/HostController.js";
import { authenticate, restrict } from "../auth/verifyToken.js";

const router = express.Router();

// Public route for fetching host by ID
router.get("/:userId", getHostById);
router.get('/:id', authenticate, restrict(['host']), getSingleHost);
router.get('/', getAllHosts);
router.put('/:id', updateHost);
router.delete('/:id', deleteHost);
router.get('/profile/me/:id', authenticate, restrict(['host']), getHostProfile);

export default router;
