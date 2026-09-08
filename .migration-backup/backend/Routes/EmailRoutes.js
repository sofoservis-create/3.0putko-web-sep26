import express from 'express';
import { subscribeEmail, getEmails } from '../Controllers/SubscribeController.js';

const router = express.Router();

// Route to subscribe a new email
router.post('/', subscribeEmail);

// Route to get all subscribed emails
router.get('/emails', getEmails);

export default router;
