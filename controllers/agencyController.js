const db = require("../db/db.js");

// Create or update agency profile
exports.createOrUpdateAgencyProfile = (req, res) => {
  const {
    name,
    operating_years,
    no_of_employees,
    location,
    professional_bio,
    website,
  } = req.body;

  const agencyId = req.user.id; // Extract agency ID from authenticated user (JWT)

  // Validate required fields
  if (
    !name ||
    !operating_years ||
    !no_of_employees ||
    !location ||
    !professional_bio
  ) {
    return res.status(400).json({ msg: "Please fill all required fields" });
  }

  const checkSql = "SELECT id FROM agency WHERE agency_id = ?";

  // Check if profile already exists for this agency
  db.query(checkSql, [agencyId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ msg: "Database error", error: err.message });
    }

    if (results.length > 0) {
      // Profile exists → perform UPDATE
      const updateSql = `
        UPDATE agency
        SET name = ?, operating_years = ?, no_of_employees = ?, location = ?, professional_bio = ?, website = ?
        WHERE agency_id = ?
      `;

      db.query(
        updateSql,
        [
          name,
          operating_years,
          no_of_employees,
          location,
          professional_bio,
          website || null, // allow null if website is not provided
          agencyId,
        ],
        (err) => {
          if (err) {
            console.error("Failed to update agency profile:", err);
            return res.status(500).json({ msg: "Failed to update profile", error: err.message });
          }
          res.json({ msg: "Profile updated successfully" });
        }
      );
    } else {
      // Profile does not exist → perform INSERT
      const insertSql = `
        INSERT INTO agency (agency_id, name, operating_years, no_of_employees, location, professional_bio, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          agencyId,
          name,
          operating_years,
          no_of_employees,
          location,
          professional_bio,
          website || null,
        ],
        (err) => {
          if (err) {
            console.error("Failed to create agency profile:", err);
            return res.status(500).json({ msg: "Failed to create profile", error: err.message });
          }
          res.status(201).json({ msg: "Profile created successfully" });
        }
      );
    }
  });
};

// Get agency profile by agencyId (from JWT)
exports.getAgencyProfile = (req, res) => {
  const agencyId = req.user.id;

  db.query("SELECT * FROM agency WHERE agency_id = ?", [agencyId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ msg: "Database error", error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ msg: "Profile not found" });
    }
    res.json(results[0]);
  });
};
