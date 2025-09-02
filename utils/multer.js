const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db/db.js"); // <-- add DB access

const UPLOAD_DIR = "uploads/model_photos";
const MAX_PHOTOS_PER_GROUP = 3;

// ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const groupLabel = (req.body.groupLabel || "Portfolio").trim() || "Portfolio";

    // Check DB for current photo count
    const sql = `
      SELECT COUNT(*) AS count
      FROM model_photo
      WHERE model_id = (SELECT id FROM model WHERE user_id = ?)
        AND group_label = ?
    `;
    db.query(sql, [userId, groupLabel], (err, results) => {
      if (err) return cb(new Error("Database error"), false);

      if (results[0].count >= MAX_PHOTOS_PER_GROUP) {
        return cb(new Error(`Photo limit reached for group "${groupLabel}"`), false);
      }

      cb(null, UPLOAD_DIR);
    });
  },
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
  limits: { files: MAX_PHOTOS_PER_GROUP, fileSize: 60 * 1024 * 1024 },
}).array("files", MAX_PHOTOS_PER_GROUP);
