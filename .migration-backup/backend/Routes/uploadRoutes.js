import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadExcel } from "../Controllers/uploadController.js";

import { requireAdmin } from "../auth/authorize.js";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `hosts_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log("📂 Uploading file:", file.originalname);
    if (!file.originalname.match(/\.(xls|xlsx)$/)) {
      return cb(new Error("Only Excel files are allowed"), false);
    }
    cb(null, true);
  },
});

// The host-import spreadsheet is parsed with `xlsx@0.18.5`, which carries an
// unfixed prototype-pollution advisory (GHSA-4r6h-8v6p-xvw6 — there is no
// patched version on npm) and a ReDoS (GHSA-5pgg-2g8v-p4x9). Handing that parser
// a file from an anonymous caller, which is what this route did, is a remote
// code execution risk against the API process; the import also writes Host
// records wholesale. Admin only.
router.post("/upload-excel", requireAdmin, upload.single("file"), uploadExcel);

export default router;
