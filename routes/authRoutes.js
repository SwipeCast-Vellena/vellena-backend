const express=require("express");
const {register,login}=require("../controllers/authController.js");
const { protect, isModel, isAgency } = require("../middlewares/authMiddleware");


const router= express.Router();

router.post("/register",register);
router.post("/login",login);

router.get("/model-dashboard",protect,isModel,(req,res)=>{
    res.json({msg:"Welcome Model!"})
});
router.get("/agency-dashboard",protect,isAgency,(req,res)=>{
    res.json({msg:"Welcome Agency"})
});

module.exports=router;