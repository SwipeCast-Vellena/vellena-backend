const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const users=[];

const register=async(req,res)=>{
    const {name,email,password,role}=req.body;
    if(!name||!email||!password||!role){
        return res.status(400).json({msg:"Fill all the fields"})
    }

    const existing=users.find(u=>u.email===email);

    if(existing){
        return res.json({mag:"User already exist"});
    }

    const hashedPassword=await bcrypt.hash(password,10);
    const user={
        id:users.length+1,
        name,
        email,
        password:hashedPassword,
        role,
        
    }
    users.push(user);
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({token,user: { name: user.name, email: user.email, role: user.role },msg:"User Registered successfully" });

}

const login=async(req,res)=>{
    const {email,password,role}=req.body;
    if(!email||!password||!role){
        return res.json({msg:"Enter all credentials"});
    }
    const user= users.find(u=>u.email===email);
    if(!user){
        return res.status(400).json({msg:"Invalid Credentials"});
    }
    const match=await bcrypt.compare(password,user.password);

    if (!match) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
}

module.exports={register,login};