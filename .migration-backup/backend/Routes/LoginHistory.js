// routes/historyRoutes.js
import express from "express";
import { filterLoginHistoriesByDate, getAllLoginHistories } from "../Controllers/LoginHistoryController.js";


const router = express.Router();

router.get("/login-histories", getAllLoginHistories); // All or ?hostId=123
router.get("/login-histories/filter", filterLoginHistoriesByDate); // ?startDate=2025-02-02&endDate=2025-05-21&hostId=optional

export default router;
