// controllers/applicationController.js
const db = require("../db/db.js");
const { calcMatchScore } = require("../utils/match.js");
const { createChatForMatch } = require("../chat/chatHelper.js");

/**
 * POST /api/campaigns_apply/:id/apply    (model only)
 * - Creates a campaign_application
 * - If score >= threshold, upserts into campaign_matches with agency_approved = 0
 * - DOES NOT create chat here anymore (chat is created after agency approves)
 */
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

      // 1) Get model row via users.id
      connection.query(
        "SELECT * FROM model WHERE user_id = ? LIMIT 1",
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
          const modelRow = modelRows[0];

          // 2) Verify campaign exists
          connection.query(
            "SELECT * FROM campaign WHERE id = ? LIMIT 1",
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
              const campaignRow = campaignRows[0];

              // 3) Prevent duplicate application
              connection.query(
                "SELECT id FROM campaign_applications WHERE campaign_id = ? AND user_id = ? LIMIT 1",
                // NOTE: here user_id stores the model profile id (existing schema behavior)
                [campaignId, modelRow.id],
                (err, existRows) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return res.status(500).json({ success: false, msg: "DB error." });
                  }
                  if (existRows.length) {
                    connection.rollback(() => connection.release());
                    return res
                      .status(409)
                      .json({ success: false, msg: "You have already applied to this campaign." });
                  }

                  // 4) Insert application
                  connection.query(
                    "INSERT INTO campaign_applications (campaign_id, user_id, applied_at) VALUES (?, ?, NOW())",
                    [campaignId, modelRow.id],
                    (err, insertRes) => {
                      if (err) {
                        const isDuplicate = err.code === "ER_DUP_ENTRY" || err.errno === 1062;
                        connection.rollback(() => connection.release());
                        return res.status(isDuplicate ? 409 : 500).json({
                          success: false,
                          msg: isDuplicate ? "User already applied" : "Failed to create application.",
                        });
                      }

                      // 5) Score & optional match upsert
                      const { score, reasons } = calcMatchScore(modelRow, campaignRow);
                      const threshold = 50.0;
                      const doMatchInsert = score >= threshold;

                      const commitAndRespond = () => {
                        connection.commit((err) => {
                          if (err) {
                            connection.rollback(() => connection.release());
                            return res
                              .status(500)
                              .json({ success: false, msg: "Failed to commit transaction." });
                          }
                          connection.release();
                          // Chat is NOT created here anymore.
                          return res.status(201).json({
                            success: true,
                            msg: "Applied successfully.",
                            applicationId: insertRes.insertId,
                            match: doMatchInsert
                              ? {
                                  matched: true,
                                  score,
                                  reasons,
                                  agencyApproved: false, // new explicit flag for FE
                                  chatCreated: false,
                                }
                              : { matched: false, score, reasons },
                          });
                        });
                      };

                      if (!doMatchInsert) return commitAndRespond();

                      // 6) Upsert into campaign_matches WITH agency_approved = 0
                      connection.query(
                        `INSERT INTO campaign_matches (campaign_id, model_id, agency_id, score, matched_at, agency_approved)
                         VALUES (?, ?, ?, ?, NOW(), 0)
                         ON DUPLICATE KEY UPDATE 
                           score = VALUES(score),
                           matched_at = NOW(),
                           agency_approved = 0`,
                        [campaignId, modelRow.id, campaignRow.agency_profile_id, score],
                        (err) => {
                          if (err) {
                            connection.rollback(() => connection.release());
                            console.error("Failed to insert/upsert campaign_matches:", err);
                            return res
                              .status(500)
                              .json({ success: false, msg: "Failed to create match record." });
                          }

                          // (Optional) You could insert a notification for the agency here.

                          return commitAndRespond();
                        }
                      );
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

/**
 * POST /api/campaigns/:campaignId/matches/:modelId/approve   (agency only)
 * - Agency approves a match
 * - Sets agency_approved = 1 in campaign_matches
 * - THEN creates chat in Firestore (id: chat_{campaignId}_{modelId})
 */
exports.approveMatch = (req, res) => {
  const campaignId = Number(req.params.campaignId);
  const modelId = Number(req.params.modelId);
  const userId = Number(req.user && req.user.id); // agency user

  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ success: false, msg: "Unauthorized" });
  }
  if (!campaignId || Number.isNaN(campaignId) || !modelId || Number.isNaN(modelId)) {
    return res.status(400).json({ success: false, msg: "Valid campaignId and modelId required." });
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

      // 1) Resolve agency profile from logged-in user
      connection.query(
        "SELECT * FROM agency WHERE agency_id = ? LIMIT 1",
        [userId],
        (err, agencyRows) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res.status(500).json({ success: false, msg: "DB error fetching agency profile." });
          }
          if (!agencyRows.length) {
            connection.rollback(() => connection.release());
            return res.status(404).json({ success: false, msg: "Agency profile not found." });
          }
          const agencyProfile = agencyRows[0];
          const agencyProfileId = agencyProfile.id;

          // 2) Ensure campaign belongs to this agency
          connection.query(
            "SELECT * FROM campaign WHERE id = ? AND agency_profile_id = ? LIMIT 1",
            [campaignId, agencyProfileId],
            (err, campRows) => {
              if (err) {
                connection.rollback(() => connection.release());
                return res.status(500).json({ success: false, msg: "DB error." });
              }
              if (!campRows.length) {
                connection.rollback(() => connection.release());
                return res
                  .status(404)
                  .json({ success: false, msg: "Campaign not found for this agency." });
              }

              

              // 3) Approve match
              connection.query(
                `UPDATE campaign_matches
                 SET agency_approved = 1
                 WHERE campaign_id = ? AND model_id = ? AND agency_id = ?`,
                [campaignId, modelId, agencyProfileId],
                (err, result) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return res.status(500).json({ success: false, msg: "DB error updating match." });
                  }
                  if (!result.affectedRows) {
                    connection.rollback(() => connection.release());
                    return res
                      .status(404)
                      .json({ success: false, msg: "Match not found for this agency/campaign/model." });
                  }

                  // 4) Commit, then create chat
                  connection.commit(async (err) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      return res
                        .status(500)
                        .json({ success: false, msg: "Failed to commit approval." });
                    }
                    connection.release();

                    // Create chat in Firestore now that it's approved
                    try {
                      await createChatForMatch(campaignId, modelId, agencyProfileId);
                      const chatId = `chat_${campaignId}_${modelId}`;
                      return res.json({
                        success: true,
                        msg: "Agency approved. Chat created.",
                        chatId,
                      });
                    } catch (e) {
                      console.error("createChatForMatch failed:", e);
                      // Approval is done even if chat failed; FE can retry a dedicated chat creation endpoint if needed
                      return res.json({
                        success: true,
                        msg: "Agency approved but chat creation failed.",
                      });
                    }
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};

/**
 * GET /api/campaigns/:campaignId/matches/:modelId/status   (model or agency)
 * - Helper endpoint so FE can know if a match is approved and/or its score.
 */
exports.getMatchStatus = (req, res) => {
  const campaignId = Number(req.params.campaignId);
  const modelId = Number(req.params.modelId);

  if (!campaignId || Number.isNaN(campaignId) || !modelId || Number.isNaN(modelId)) {
    return res.status(400).json({ success: false, msg: "Valid campaignId and modelId required." });
  }

  db.query(
    "SELECT campaign_id, model_id, agency_id, score, agency_approved, matched_at FROM campaign_matches WHERE campaign_id = ? AND model_id = ? LIMIT 1",
    [campaignId, modelId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, msg: "DB error." });
      }
      if (!rows.length) {
        return res.json({ success: true, exists: false });
      }
      const row = rows[0];
      return res.json({
        success: true,
        exists: true,
        score: Number(row.score),
        agencyApproved: !!row.agency_approved,
        matchedAt: row.matched_at,
        agencyId: row.agency_id,
      });
    }
  );
};

exports.getMyModelId = (req, res) => {
  const userId = Number(req.user && req.user.id);
  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ success: false, msg: "Unauthorized" });
  }

  db.query("SELECT id FROM model WHERE user_id = ? LIMIT 1", [userId], (err, rows) => {
    if (err) {
      console.error("DB error fetching model id:", err);
      return res.status(500).json({ success: false, msg: "DB error." });
    }
    if (!rows.length) {
      return res.status(404).json({ success: false, msg: "Model profile not found." });
    }
    return res.json({ success: true, modelId: Number(rows[0].id) });
  });
};
