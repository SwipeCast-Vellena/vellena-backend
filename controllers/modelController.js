const db = require("../db/db.js");

exports.createOrUpdateModelProfile = (req, res) => {
    const { name, age, genre, height, location, description, video_portfolio } = req.body;
    const userId = req.user.id; // from JWT
  
    if (!name || !age || !genre || !height || !location || !description) {
      return res.status(400).json({ msg: "Please fill all required fields" });
    }
  
    // Check if profile exists
    const checkSql = "SELECT id FROM model WHERE user_id = ?";
    db.query(checkSql, [userId], (err, results) => {
      if (err) return res.status(500).json({ msg: "Database error", error: err.message });
  
      if (results.length > 0) {
        // Profile exists → UPDATE
        const updateSql = `
          UPDATE model 
          SET name=?, age=?, genre=?, height=?, location=?, description=?, video_portfolio=? 
          WHERE user_id=?`;
        db.query(updateSql, [name, age, genre, height, location, description, video_portfolio, userId], (err) => {
          if (err) return res.status(500).json({ msg: "Failed to update profile", error: err.message });
          res.json({ msg: "Profile updated successfully" });
        });
      } else {
        // Profile does not exist → INSERT
        const insertSql = `
          INSERT INTO model (user_id, name, age, genre, height, location, description, video_portfolio)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(insertSql, [userId, name, age, genre, height, location, description, video_portfolio], (err) => {
          if (err) return res.status(500).json({ msg: "Failed to create profile", error: err.message });
          res.status(201).json({ msg: "Profile created successfully" });
        });
      }
    });
  };

exports.getModelProfile=(req,res)=>{
    const userId=req.user.id;

    db.query("SELECT * FROM model WHERE user_id = ?",[userId],(err,results)=>{
        if (err) return res.status(500).json({ msg: "Database error", error: err.message });
        if(results.length===0) return res.status(404).json({msg:"Profile not found"});
        res.json(results[0]);
    })
}
