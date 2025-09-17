const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db/db.js"); // <-- add DB access

const UPLOAD_DIR = "uploads/model_photos";
const MAX_PHOTOS_FREE = 3;
const MAX_PHOTOS_PRO = 10;

// ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const groupLabel = (req.body.groupLabel || "Portfolio").trim() || "Portfolio";

    // Check DB for current photo count AND Pro status
    const sql = `
      SELECT 
        COUNT(mp.id) AS count,
        m.is_pro
      FROM model m
      LEFT JOIN model_photo mp ON m.id = mp.model_id
      WHERE m.user_id = ?
      GROUP BY m.id, m.is_pro
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) return cb(new Error("Database error"), false);

      if (!results.length) return cb(new Error("Model profile not found"), false);

      const currentCount = results[0].count || 0;
      const isPro = !!results[0].is_pro;
      const maxPhotos = isPro ? MAX_PHOTOS_PRO : MAX_PHOTOS_FREE;

      console.log(`📁 Multer check - User: ${userId}, Current: ${currentCount}, Max: ${maxPhotos}, isPro: ${isPro}`);

      if (currentCount >= maxPhotos) {
        return cb(new Error(`Photo limit reached. ${isPro ? 'Pro' : 'Free'} accounts can upload up to ${maxPhotos} photos.`), false);
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
  limits: { files: MAX_PHOTOS_PRO, fileSize: 60 * 1024 * 1024 }, // Allow up to Pro limit
}).array("files", MAX_PHOTOS_PRO); // Allow up to Pro limit
