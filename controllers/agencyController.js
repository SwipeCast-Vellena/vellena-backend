const db = require("../db/db.js");

exports.createOrUpdateAgencyProfile = (req, res) => {
  const {
    name,
    operating_years,
    no_of_employees,
    location,
    professional_bio,
    website,
  } = req.body;

  const agencyId = req.user.id;

  if (
    !name ||
    !operating_years ||
    !no_of_employees ||
    !location ||
    !professional_bio
  ) {
    return res.status(400).json({ msg: "Please fill all fields" });
  }

  const checkSql = "SELECT id FROM agency WHERE agency_id=?";

  db.query(checkSql, [agencyId], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ msg: "Database error", error: err.message });

    if (results.length > 0) {
      const updateSql = `UPDATE agency
            SET name=?, operating_years=?, no_of_employees=?, location=?, professional_bio=?, website=?
            WHERE agency_id=?`;

      db.query(
        updateSql,
        [
          name,
          operating_years,
          no_of_employees,
          location,
          professional_bio,
          website,
          agencyId,
        ],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ msg: "Failed to update profile", error: err.message });
          res.json({ msg: "Profile updated successfully" });
        }
      );
    } else {
      const insertSql = `INSERT INTO agency (agency_id, name, operating_years, no_of_employees, location, professional_bio, website ) 
        VALUES (?,?,?,?,?,?,?)`;
      db.query(
        insertSql,
        [
          agencyId,
          name,
          operating_years,
          no_of_employees,
          location,
          professional_bio,
          website
        ],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ msg: "Failed to create profile", error: err.message });
          res.status(201).json({ msg: "Profile created successfully" });
        }
      );
    }
  });
};

exports.getAgencyProfile=(req,res)=>{
    const agencyId=req.user.id;

    db.query("SELECT * FROM agency WHERE agency_id=? ",[agencyId],(err,results)=>{
        if (err) return res.status(500).json({ msg: "Database error", error: err.message });
        if(results.length===0) return res.status(404).json({msg:"Profile not found"});
        res.json(results[0]);
    })
}
