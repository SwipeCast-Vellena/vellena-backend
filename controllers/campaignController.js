const db = require("../db/db.js");

exports.createOrUpdateCampaign=(req,res)=>{

    if(req.user.role!=="agency"){
        return res.status(403).json({msg:"Only agencies can create or update job postings"});
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

  const id = req.params.id;

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
    if (err) {
      console.error("DB Query Error:", err); // ✅ log full error
      return res.status(500).json({ msg: "DB error", error: err.message });
    }
    if (results.length === 0) {
      return res.status(400).json({ msg: "Agency profile not found. Please complete your agency profile before posting." });
    }
    const agencyProfileId = results[0].id;

    if(id){
      const getSql="SELECT id FROM campaign WHERE id = ? AND agency_profile_id = ?";

      db.query(getSql, [id,agencyProfileId],(err,rows)=>{
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({ msg: "DB error", error: err.message });
        }
        if (rows.length === 0) {
          return res.status(404).json({ msg: "Campaign not found or you don't have permission to modify it." });
        }

        const updateSql = `
          UPDATE campaign SET
            title = ?, category = ?, start_date = ?, end_date = ?, start_time = ?, end_time = ?,
            city = ?, address = ?, compensation = ?, description = ?, required_people = ?, deadline = ?,
            pro_only = ?, gender_preference = ?
          WHERE id = ? AND agency_profile_id = ?
        `;

        const params = [
          title, category, start_date, end_date, start_time, end_time,
          city, address, compNum, description, peopleNum, deadline,
          pro_only ? 1 : 0, gender_preference,
          id, agencyProfileId
        ];

        db.query(updateSql, params, (err, updateResult) => {
          if (err) {
            console.error("DB Query Error:", err);
            return res.status(500).json({ msg: "DB error", error: err.message });
          }
          return res.status(200).json({ id: id, msg: "Campaign updated" });
        });
      });
      return;
    }
   

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
      if (err) {
        console.error("DB Query Error:", err); // ✅ log full error
        return res.status(500).json({ msg: "DB error", error: err.message });
      }
      res.status(201).json({ id: result.insertId, msg: "Campaign created" });
    });
  });
}

exports.getCampaigns = (req, res) => {
  let sql;
  let params = [];

  if (req.user.role === "agency") {
    sql = `
      SELECT c.*,
             a.name AS agency_name,  -- ✅ changed column name
             c.required_people AS application_count
      FROM campaign c
      JOIN agency a ON c.agency_profile_id = a.id
      WHERE a.agency_id = ?
      ORDER BY c.created_at DESC
    `;
    params.push(req.user.id);
  } else {
    sql = `
      SELECT c.*,
             a.name AS agency_name,  -- ✅ changed column name
             c.required_people AS application_count
      FROM campaign c
      JOIN agency a ON c.agency_profile_id = a.id
      ORDER BY c.created_at DESC
    `;
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("DB Query Error:", err); // ✅ log full error
      return res.status(500).json({ msg: "DB error", error: err.message });
    }

    res.json(results);
  });
};

exports.getAgencyCampaigns = (req, res) => {
  if (req.user.role !== "agency") {
    return res.status(403).json({ msg: "Access denied. Only agencies can access their campaigns." });
  }

  // First, get the agency profile ID from the logged-in user
  const getAgencyProfileSql = "SELECT id FROM agency WHERE agency_id = ?";
  db.query(getAgencyProfileSql, [req.user.id], (err, agencyResults) => {
    if (err) {
      console.error("DB Error fetching agency profile:", err);
      return res.status(500).json({ msg: "DB error", error: err.message });
    }

    if (!agencyResults.length) {
      return res.status(404).json({ msg: "Agency profile not found for this user" });
    }

    const agencyProfileId = agencyResults[0].id;

    // Now fetch campaigns for this agency
    const campaignsSql = `
      SELECT c.*,
             a.name AS agency_name,
             c.required_people AS application_count
      FROM campaign c
      JOIN agency a ON c.agency_profile_id = a.id
      WHERE a.id = ?
      ORDER BY c.created_at DESC
    `;

    db.query(campaignsSql, [agencyProfileId], (err, campaignResults) => {
      if (err) {
        console.error("DB Query Error:", err);
        return res.status(500).json({ msg: "DB error", error: err.message });
      }

      res.json(campaignResults);
    });
  });
};

exports.getCampaignById = (req, res) => {
  const campaignId = req.params.id;

  if (!campaignId) {
    return res.status(400).json({ msg: "Campaign ID is required" });
  }

  // Get agency profile ID if user is an agency
  const lookupSql = "SELECT id FROM agency WHERE agency_id = ?";
  db.query(lookupSql, [req.user.id], (err, agencyResults) => {
    if (err) {
      console.error("DB Query Error:", err);
      return res.status(500).json({ msg: "DB error", error: err.message });
    }

    const agencyProfileId = agencyResults.length ? agencyResults[0].id : null;

    let sql = `
      SELECT c.*, a.name AS agency_name
      FROM campaign c
      JOIN agency a ON c.agency_profile_id = a.id
      WHERE c.id = ?
    `;
    const params = [campaignId];

    if (req.user.role === "agency") {
      // Ensure the agency can only access its own campaigns
      sql += " AND c.agency_profile_id = ?";
      params.push(agencyProfileId);
    }

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("DB Query Error:", err);
        return res.status(500).json({ msg: "DB error", error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ msg: "Campaign not found or access denied" });
      }

      res.json(results[0]); // return single campaign
    });
  });
};



