import { importHostsFromExcel } from "../utils/importHost.js";

export const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    await importHostsFromExcel(filePath);

    res.status(200).json({ success: true, message: "Hosts imported successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: `Error processing file: ${error.message}` });
  }
};
