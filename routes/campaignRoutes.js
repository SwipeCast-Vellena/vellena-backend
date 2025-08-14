const express=require("express");
const {protect,isAgency,isModel}=require("../middlewares/authMiddleware.js");

const {createOrUpdateCampaign,getCampaigns}=require("../controllers/campaignController.js")
const {applyToCampaign}=require("../controllers/applicationController.js");

const router=express.Router();

router.post("/campaigns",protect,isAgency,createOrUpdateCampaign);
router.put("/campaigns/:id",protect,isAgency,createOrUpdateCampaign)
router.get("/campaigns",protect,getCampaigns);
router.post("/campaigns_apply/:id/apply",protect,isModel,applyToCampaign);

module.exports=router;