const express = require("express");
const { protect, isAgency, isModel } = require("../middlewares/authMiddleware.js");

const { createOrUpdateCampaign, getCampaigns, getAgencyCampaigns, getCampaignById } = require("../controllers/campaignController.js");
const { applyToCampaign, approveMatch, getMatchStatus, getMyModelId } = require("../controllers/applicationController.js");

const router = express.Router();

// campaigns
router.post("/campaigns", protect, isAgency, createOrUpdateCampaign);
router.put("/campaigns/:id", protect, isAgency, createOrUpdateCampaign);
router.get("/campaigns/:id", protect, getCampaignById);
router.get("/campaigns", protect, getCampaigns);
router.get("/specific-campaigns",protect,isAgency,getAgencyCampaigns);

// apply to campaign
router.post("/campaigns_apply/:id/apply", protect, isModel, applyToCampaign);

// agency approves campaign match
router.post("/campaigns/:campaignId/approve/:modelId", protect, isAgency, approveMatch);

// check match status
router.get("/campaigns/:campaignId/matches/:modelId/status", protect, getMatchStatus);

router.get("/model-id", protect, getMyModelId);

module.exports = router;
