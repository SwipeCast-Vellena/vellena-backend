const db = require("../db/db.js");

exports.createOrUpdateCampaign=(req,res)=>{

    if(req.user.role!=="agency"){
        return res.status(403).json({msg:"Only agencies can create job postings"});
    }

    const {
        title,
        category,
        start_date,
        end_date = null,
        start_time = null,
        end_time = null,
        city,
        address = null,
        compensation,
        description,
        required_people,
        deadline,
        pro_only = false,
        gender_preference = 'any'
      } = req.body;

      


    // basic required fields
  if (!title || !category|| !start_date || !city || compensation===undefined|| !description || required_people===undefined || !deadline) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  if(description.length >=500){
    return res.status(400).json({msg:"Description should be less than 500 characters"})
  }

  

  // validate numeric fields
  const compNum = Number(compensation);
  const peopleNum = Number(required_people);

  if (Number.isNaN(compNum) || compNum < 0) {
    return res.status(400).json({ msg: "Compensation must be a positive number" });
  }
  if (!Number.isInteger(peopleNum) || peopleNum <= 0) {
    return res.status(400).json({ msg: "required_people must be a positive integer" });
  }

  const lookupSql = "SELECT id FROM agency WHERE agency_id = ?";
  db.query(lookupSql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ msg: "DB error", error: err.message });
    if (results.length === 0) {
      return res.status(400).json({ msg: "Agency profile not found. Please complete your agency profile before posting." });
    }
    const agencyProfileId = results[0].id;

    // 2) insert using agency_profile_id
    const insertSql = `
      INSERT INTO campaign
      (agency_profile_id, title, category, start_date, end_date, start_time, end_time, city, address, compensation,
       description, required_people, deadline, pro_only, gender_preference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(insertSql, [
      agencyProfileId, title, category, start_date, end_date, start_time, end_time, city, address,
      compensation, description, required_people, deadline, pro_only ? 1 : 0, gender_preference
    ], (err, result) => {
      if (err) return res.status(500).json({ msg: "DB error", error: err.message });
      res.status(201).json({ id: result.insertId, msg: "Campaign created" });
    });
  });
}

exports.getCampaigns = (req, res) => {
    let sql;
    let params = [];
  
    // Agencies can only see their own campaigns
    if (req.user.role === "agency") {
      sql = "SELECT * FROM campaign WHERE agency_user_id = ? ORDER BY created_at DESC";
      params.push(req.user.id);
    } else {
      // Models can see all campaigns
      sql = "SELECT * FROM campaign ORDER BY created_at DESC";
    }
  
    db.query(sql, params, (err, results) => {
      if (err) {
        return res.status(500).json({ msg: "DB error", error: err.message });
      }
      res.json(results);
    });
  };