const express=require("express");
const dotenv=require("dotenv");
const authRoutes=require("./routes/authRoutes.js")
const db=require("./db/db.js")


dotenv.config();

const app=express();

app.use(express.json());
app.use("/api/auth",authRoutes);

app.get('/users',(req,res)=>{
    db.query('SELECT * FROM users',(err,results)=>{
        if(err) return res.status(500).json({error: err.message});
        res.json(results);
    })
})

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{
    console.log("Server started")
})