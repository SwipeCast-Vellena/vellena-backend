const express=require("express");
const {protect,isModel, isAgency}=require("../middlewares/authMiddleware.js");
const {getModelProfile,createOrUpdateModelProfile,getApprovedMatches,getModelProfileByUserId}=require("../controllers/modelController.js");

const router=express.Router();

router.post("/profile",protect,isModel,createOrUpdateModelProfile);
router.get("/profile",protect,isModel,getModelProfile);
router.get("/approved-matches", protect,isModel, getApprovedMatches);
router.get("/profile/:id",protect,(isAgency),getModelProfileByUserId);

module.exports=router;