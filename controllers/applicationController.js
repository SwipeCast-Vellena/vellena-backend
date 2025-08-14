const db=require("../db/db.js");
exports.applyToCampaign = (req, res) => {
    const campaignId = Number(req.params.id);
    const userId = Number(req.user && req.user.id);
  
    if (!campaignId || Number.isNaN(campaignId)) {
      return res.status(400).json({ success: false, msg: "Valid campaign Id is required." });
    }
    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }
  
    db.getConnection((err, connection) => {
      if (err) {
        console.error("DB connection error:", err);
        return res.status(500).json({ success: false, msg: "Database connection error." });
      }
  
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, msg: "Failed to start transaction." });
        }
  
        // Step 1: get model_id from model table
        connection.query(
          "SELECT id FROM model WHERE user_id = ? LIMIT 1",
          [userId],
          (err, modelRows) => {
            if (err) {
              connection.rollback(() => connection.release());
              return res.status(500).json({ success: false, msg: "DB error fetching model profile." });
            }
            if (!modelRows.length) {
              connection.rollback(() => connection.release());
              return res.status(404).json({ success: false, msg: "Model profile not found." });
            }
  
            const modelId = modelRows[0].id;
  
            // Step 2: verify campaign exists
            connection.query(
              "SELECT id FROM campaign WHERE id = ? LIMIT 1",
              [campaignId],
              (err, campaignRows) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  return res.status(500).json({ success: false, msg: "DB error." });
                }
                if (!campaignRows.length) {
                  connection.rollback(() => connection.release());
                  return res.status(404).json({ success: false, msg: "Campaign not found." });
                }
  
                // Step 3: check if already applied
                connection.query(
                  "SELECT id FROM campaign_applications WHERE campaign_id = ? AND user_id = ? LIMIT 1",
                  [campaignId, modelId],
                  (err, existRows) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      return res.status(500).json({ success: false, msg: "DB error." });
                    }
                    if (existRows.length) {
                      connection.rollback(() => connection.release());
                      return res.status(409).json({ success: false, msg: "You have already applied to this campaign." });
                    }
  
                    // Step 4: insert
                    connection.query(
                      "INSERT INTO campaign_applications (campaign_id, user_id, applied_at) VALUES (?, ?, NOW())",
                      [campaignId, modelId],
                      (err, insertRes) => {
                        if (err) {
                          const isDuplicate = err.code === "ER_DUP_ENTRY" || err.errno === 1062;
                          connection.rollback(() => connection.release());
                          return res.status(isDuplicate ? 409 : 500).json({
                            success: false,
                            msg: isDuplicate
                              ? "User already applied"
                              : "Failed to create application."
                          });
                        }
  
                        connection.commit((err) => {
                          if (err) {
                            connection.rollback(() => connection.release());
                            return res.status(500).json({ ok: false, msg: "Failed to commit transaction." });
                          }
                          connection.release();
                          return res.status(201).json({
                            success: true,
                            msg: "Applied successfully.",
                            applicationId: insertRes.insertId
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  };
  

