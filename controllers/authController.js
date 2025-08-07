const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db=require("../db/db.js")



const register=async(req,res)=>{
    const {name,email,password,role}=req.body;
    if(!name||!email||!password||!role){
        return res.status(400).json({msg:"Fill all the fields"})
    }

    // Check if user already exists
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ msg: "DB error", error: err.message });

    if (results.length > 0) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
    const values = [name, email, hashedPassword, role];

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ msg: "Failed to register", error: err.message });

      const user = {
        id: result.insertId,
        name,
        email,
        role,
      };

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({ token, user, msg: "User registered successfully" });
    });
  });

}

const login = async (req, res) => {
    const { email, password, role } = req.body;
  
    if (!email || !password || !role) {
      return res.status(400).json({ msg: "All fields are required" });
    }
  
    // Find user by email
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ msg: "DB error", error: err.message });
  
      if (results.length === 0) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }
  
      const user = results[0];
  
      // Check role match
      if (user.role !== role) {
        return res.status(400).json({ msg: "Invalid role" });
      }
  
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
  
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
  
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        msg: "Login successful",
      });
    });
  };

module.exports={register,login};