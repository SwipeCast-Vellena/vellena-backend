const express=require("express");
const {protect,isAgency}=require("../middlewares/authMiddleware.js");
const {getAgencyProfile,createOrUpdateAgencyProfile}=require("../controllers/agencyController.js");

const router= express.Router();

router.post("/profile", protect,isAgency,createOrUpdateAgencyProfile);
router.get("/profile",protect,isAgency,getAgencyProfile);

module.exports=router;