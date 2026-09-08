import express from 'express';
import { handleFacebookEvent } from '../Controllers/facebookEventsController.js';

const router = express.Router();

router.post('/facebook-events', handleFacebookEvent);

export default router;