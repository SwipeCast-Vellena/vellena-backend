const db = require("../db/db.js");

exports.createOrUpdateModelProfile = (req, res) => {
  const { name, age, genre, height, location, category, description, video_portfolio } = req.body;
  const userId = req.user.id; // from JWT

  // Validate required fields - done
  if (!name || !age || !genre || !height || !location|| !category || !description) {
    return res.status(400).json({ msg: "Please fill all required fields" });
  }

  const checkSql = "SELECT id FROM model WHERE user_id = ?";

  db.query(checkSql, [userId], (err, results) => {
    if (err) {
      // Changed: Added detailed error log and consistent json error response
      console.error("Database error on check profile:", err);
      return res.status(500).json({ msg: "Database error", error: err.message });
    }

    if (results.length > 0) {
      // Profile exists → UPDATE
      const updateSql = `
        UPDATE model 
        SET name=?, age=?, genre=?, height=?, location=?,category=?, description=?, video_portfolio=? 
        WHERE user_id=?`;

      db.query(updateSql, [name, age, genre, height, location,category, description, video_portfolio, userId], (err) => {
        if (err) {
          console.error("Failed to update profile:", err);
          return res.status(500).json({ msg: "Failed to update profile", error: err.message });
        }
        return res.json({ msg: "Profile updated successfully" });
      });
    } else {
      // Profile does not exist → INSERT
      const insertSql = `
        INSERT INTO model (user_id, name, age, genre, height, location,category, description, video_portfolio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(insertSql, [userId, name, age, genre, height, location,category, description, video_portfolio], (err) => {
        if (err) {
          console.error("Failed to create profile:", err);
          return res.status(500).json({ msg: "Failed to create profile", error: err.message });
        }
        return res.status(201).json({ msg: "Profile created successfully" });
      });
    }
  });
};

exports.getModelProfile = (req, res) => {
  const userId = req.user.id;

  db.query("SELECT * FROM model WHERE user_id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Database error on get profile:", err);
      return res.status(500).json({ msg: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ msg: "Profile not found" });
    }

    return res.json(results[0]);
  });
};

exports.getAllModels = (req, res) => {
  const sql = "SELECT id, name, age, genre, height, location, category, description, video_portfolio FROM model";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error on getting models:", err);
      return res.status(500).json({ success: false, msg: "Database error", error: err.message });
    }

    return res.json({
      success: true,
      count: results.length,
      models: results,
    });
  });
};

exports.getApprovedMatches = (req, res) => {
  const campaignId = req.query.campaignId ? Number(req.query.campaignId) : null;
  const userId = req.user.id;

  let sql = `
    SELECT 
      c.*,                       -- all campaign fields
      m.id   AS modelId,         -- model id
      m.name AS modelName,       -- model name
      a.id   AS agencyId,        -- agency id
      a.name AS agencyName       -- agency name
    FROM campaign_matches cm
    JOIN campaign c ON c.id = cm.campaign_id
    JOIN model m ON m.id = cm.model_id
    JOIN agency a ON a.id = c.agency_profile_id   -- join agency
    WHERE cm.agency_approved = 1
      AND m.user_id = ?
  `;

  const params = [userId];

  if (campaignId) {
    sql += " AND cm.campaign_id = ?";
    params.push(campaignId);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("DB error getApprovedMatches:", err);
      return res.status(500).json({ success: false, msg: "Database error" });
    }
    return res.json({ success: true, count: results.length, campaigns: results });
  });
};

