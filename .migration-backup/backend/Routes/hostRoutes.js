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
import { requireAdmin } from "../auth/authorize.js";

const router = express.Router();

// Express matches the FIRST route whose path fits, so the authenticated
// '/:id' route below was unreachable: '/:userId' has the identical shape and
// was declared first, so every request landed on the public handler and the
// auth check never ran. Ordered so the guarded route wins.
router.get('/:id', authenticate, restrict(['host']), getSingleHost);
// Public route for fetching host by ID
router.get("/:userId", getHostById);
router.get('/', requireAdmin, getAllHosts);
router.put('/:id', updateHost);
router.delete('/:id', deleteHost);
router.get('/profile/me/:id', authenticate, restrict(['host']), getHostProfile);

export default router;
