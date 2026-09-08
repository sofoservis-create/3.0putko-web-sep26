// controllers/historyController.js
import LoginHistory from "../models/LoginHistory.js";

// GET all login histories (optionally filtered by host)
export const getAllLoginHistories = async (req, res) => {
  try {
    const { hostId } = req.query; // Optional filter by host

    const filter = hostId ? { hostId } : {};

    const histories = await LoginHistory.find(filter)
      .sort({ timestamp: -1 })
      .populate("hostId", "email name") // Adjust based on Host fields
      .lean();

    res.status(200).json({
      success: true,
      count: histories.length,
      histories,
    });
  } catch (error) {
    console.error("Error fetching all login histories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Filter login histories between two dates
export const filterLoginHistoriesByDate = async (req, res) => {
    try {
      const { startDate, endDate, hostId } = req.query;
  
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }
  
      const start = new Date(startDate);
      const end = new Date(endDate);
  
      // Adjust end to include the whole day (23:59:59)
      end.setHours(23, 59, 59, 999);
  
      const filter = {
        timestamp: { $gte: start, $lte: end },
      };
  
      if (hostId) {
        filter.hostId = hostId;
      }
  
      const filteredHistories = await LoginHistory.find(filter)
        .sort({ timestamp: -1 })
        .populate("hostId", "email name")
        .lean();
  
      res.status(200).json({
        success: true,
        count: filteredHistories.length,
        filteredHistories,
      });
    } catch (error) {
      console.error("Error filtering login histories:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  