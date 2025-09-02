const express = require("express");
const { protect, isModel, isAgency } = require("../middlewares/authMiddleware.js");
const {
  uploadModelPhotos,
  listMyModelPhotos,
  listPhotosByModelId,
} = require("../controllers/modelPhotosController.js");

const router = express.Router();

// Save photos (ONLY save, no delete/replace), max 3 per group
router.post("/", protect, isModel, uploadModelPhotos);

// Fetch my photos (optionally filter by groupLabel)
router.get("/", protect, isModel, listMyModelPhotos);

// (Optional) Agency fetches a model's photos
router.get("/by-model/:modelId", protect, isAgency, listPhotosByModelId);

module.exports = router;
