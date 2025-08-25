const express = require("express");
const { protect, isAgency, isModel } = require("../middlewares/authMiddleware.js");

const { createOrUpdateCampaign, getCampaigns } = require("../controllers/campaignController.js");
const { applyToCampaign, approveMatch, getMatchStatus } = require("../controllers/applicationController.js");

const router = express.Router();

// campaigns
router.post("/campaigns", protect, isAgency, createOrUpdateCampaign);
router.put("/campaigns/:id", protect, isAgency, createOrUpdateCampaign);
router.get("/campaigns", protect, getCampaigns);

// apply to campaign
router.post("/campaigns_apply/:id/apply", protect, isModel, applyToCampaign);

// agency approves campaign match
router.post("/campaigns/:campaignId/approve/:modelId", protect, isAgency, approveMatch);

// check match status
router.get("/campaigns/:campaignId/matches/:modelId/status", protect, getMatchStatus);

module.exports = router;
