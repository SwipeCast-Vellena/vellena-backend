const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = "uploads/model_photos";

// ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"), false);
  cb(null, true);
};

exports.uploadUpTo3 = multer({
  storage,
  fileFilter,
  limits: { files: 3, fileSize: 60 * 1024 * 1024 }, // 60MB per file cap
}).array("files", 3); // field name: files
