const express=require("express");
const {protect,isAgency}=require("../middlewares/authMiddleware.js");

const {createOrUpdateCampaign,getCampaigns}=require("../controllers/campaignController.js")

const router=express.Router();

router.post("/campaigns",protect,isAgency,createOrUpdateCampaign);
router.put("/campaigns/:id",protect,isAgency,createOrUpdateCampaign)
router.get("/campaigns",protect,getCampaigns);

module.exports=router;