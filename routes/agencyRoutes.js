const express=require("express");
const {protect,isAgency}=require("../middlewares/authMiddleware.js");
const {getAgencyProfile,createOrUpdateAgencyProfile,getApprovedMatchesForAgency}=require("../controllers/agencyController.js");
const { getAllModels } = require("../controllers/modelController.js");
const { pdfUpload, uploadPdf } = require("../controllers/uploadController.js");
const db=require("../db/db.js")

const router= express.Router();

router.post("/profile", protect,isAgency,createOrUpdateAgencyProfile);
router.get("/profile",protect,isAgency,getAgencyProfile);
router.post("/upload-pdf", protect, isAgency, pdfUpload, uploadPdf);
router.get("/model-profiles",protect,isAgency,getAllModels);
router.get("/approved-matches", protect,isAgency, getApprovedMatchesForAgency);


router.get("/pending-matches", protect, (req, res) => {
    const userId = req.user.id;
  
    // 1) find agency profile id for this user
    const lookup = "SELECT id FROM agency WHERE agency_id = ?";
    db.query(lookup, [userId], (err, rows) => {
      if (err) return res.status(500).json({ msg: "DB error", error: err.message });
      if (rows.length === 0) return res.status(400).json({ msg: "Agency profile not found" });
  
      const agencyProfileId = rows[0].id;
      // 2) use agencyProfileId in campaign_matches.agency_id
      const sql = `
        SELECT m.*, cm.campaign_id, cm.score, cm.agency_approved, cm.matched_at
        FROM campaign_matches cm
        JOIN model m ON m.id = cm.model_id
        WHERE cm.agency_id = ? AND cm.agency_approved = 0
      `;
      db.query(sql, [agencyProfileId], (err2, rows2) => {
        if (err2) return res.status(500).json({ msg: "DB error", error: err2.message });
        res.json(rows2);
      });
    });
  });
  

module.exports=router;