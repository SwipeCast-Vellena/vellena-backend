const express=require("express");
const {protect,isModel}=require("../middlewares/authMiddleware.js");
const {getModelProfile,createOrUpdateModelProfile,getAllModels,getApprovedMatches}=require("../controllers/modelController.js");

const router=express.Router();

router.post("/profile",protect,isModel,createOrUpdateModelProfile);
router.get("/profile",protect,isModel,getModelProfile);
router.get("/models",protect,getAllModels);
router.get("/approved-matches", protect,isModel, getApprovedMatches);

module.exports=router;