import express from "express";
import { getCompanyByIco } from "../Controllers/IcoController.js";

const router = express.Router();
router.get("/ico-lookup/:ico", getCompanyByIco);
// Compatibility for clients already deployed with the previous URL.
router.get("/ico/:ico", getCompanyByIco);
export default router;
