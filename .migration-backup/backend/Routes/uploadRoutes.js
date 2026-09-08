import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadExcel } from "../Controllers/uploadController.js";

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

router.post("/upload-excel", upload.single("file"), uploadExcel);

export default router;
