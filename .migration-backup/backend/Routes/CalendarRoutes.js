import express from 'express';
import fetchICal, { fetchICalByUrl } from '../Controllers/Calendar.js';

const router = express.Router();

// Route to fetch Airbnb iCal calendar
router.get("/calendar/:calendarId/:secretToken", fetchICal);

// Generic ICS fetch route by full URL
router.get("/calendar", fetchICalByUrl);

export default router;