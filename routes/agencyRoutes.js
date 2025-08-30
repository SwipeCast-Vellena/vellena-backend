const express=require("express");
const {protect,isAgency}=require("../middlewares/authMiddleware.js");
const {getAgencyProfile,createOrUpdateAgencyProfile}=require("../controllers/agencyController.js");
const { getAllModels } = require("../controllers/modelController.js");

const router= express.Router();

router.post("/profile", protect,isAgency,createOrUpdateAgencyProfile);
router.get("/profile",protect,isAgency,getAgencyProfile);
router.get("/model-profiles",protect,isAgency,getAllModels);

module.exports=router;