const express=require("express");
const {protect,isModel}=require("../middlewares/authMiddleware.js");
const {getModelProfile,createOrUpdateModelProfile}=require("../controllers/modelController.js");

const router=express.Router();

router.post("/profile",protect,isModel,createOrUpdateModelProfile);
router.get("/profile",protect,isModel,getModelProfile);

module.exports=router;