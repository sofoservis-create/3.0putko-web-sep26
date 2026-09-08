// Routes/dac7Routes.js
import express from "express";
import {
  getDac7Summary,
  exportDac7Xml,
  rebuildDac7,
} from "../Controllers/Dac7Controller.js";
import { requireAdmin } from "../auth/authorize.js";

const router = express.Router();

// Every route here is admin-only. The export carries each host's legal name,
// tax identification number, address, bank details and annual revenue — it was
// previously downloadable by anyone who knew the URL.

// Review the aggregate before filing.
router.get("/dac7/:year", requireAdmin, getDac7Summary);

// The annual filing itself (due 31 January).
router.get("/dac7/:year/export.xml", requireAdmin, exportDac7Xml);

// Recompute a year from the underlying reservations.
router.post("/dac7/:year/rebuild", requireAdmin, rebuildDac7);

export default router;
