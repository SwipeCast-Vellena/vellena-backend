const db = require("../db/db.js");
const { calcMatchScore } = require("../utils/match.js");
const { createChatForMatch } = require("../chat/chatHelper.js");

exports.applyToCampaign = (req, res) => {
  const campaignId = Number(req.params.id);
  const userId = Number(req.user && req.user.id);

  if (!campaignId || Number.isNaN(campaignId)) {
    return res
      .status(400)
      .json({ success: false, msg: "Valid campaign Id is required." });
  }
  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ success: false, msg: "Unauthorized" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return res
        .status(500)
        .json({ success: false, msg: "Database connection error." });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res
          .status(500)
          .json({ success: false, msg: "Failed to start transaction." });
      }

      // Step 1: get model row from model table
      connection.query(
        "SELECT * FROM model WHERE user_id = ? LIMIT 1",
        [userId],
        (err, modelRows) => {
          if (err) {
            connection.rollback(() => connection.release());
            return res
              .status(500)
              .json({
                success: false,
                msg: "DB error fetching model profile.",
              });
          }
          if (!modelRows.length) {
            connection.rollback(() => connection.release());
            return res
              .status(404)
              .json({ success: false, msg: "Model profile not found." });
          }

          const modelRow = modelRows[0];

          // Step 2: verify campaign exists
          connection.query(
            "SELECT * FROM campaign WHERE id = ? LIMIT 1",
            [campaignId],
            (err, campaignRows) => {
              if (err) {
                connection.rollback(() => connection.release());
                return res
                  .status(500)
                  .json({ success: false, msg: "DB error." });
              }
              if (!campaignRows.length) {
                connection.rollback(() => connection.release());
                return res
                  .status(404)
                  .json({ success: false, msg: "Campaign not found." });
              }

              const campaignRow = campaignRows[0];

              // Step 3: check if already applied
              connection.query(
                "SELECT id FROM campaign_applications WHERE campaign_id = ? AND user_id = ? LIMIT 1",
                [campaignId, modelRow.id],
                (err, existRows) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    return res
                      .status(500)
                      .json({ success: false, msg: "DB error." });
                  }
                  if (existRows.length) {
                    connection.rollback(() => connection.release());
                    return res
                      .status(409)
                      .json({
                        success: false,
                        msg: "You have already applied to this campaign.",
                      });
                  }

                  // Step 4: insert
                  connection.query(
                    "INSERT INTO campaign_applications (campaign_id, user_id, applied_at) VALUES (?, ?, NOW())",
                    [campaignId, modelRow.id],
                    (err, insertRes) => {
                      if (err) {
                        const isDuplicate =
                          err.code === "ER_DUP_ENTRY" || err.errno === 1062;
                        connection.rollback(() => connection.release());
                        return res.status(isDuplicate ? 409 : 500).json({
                          success: false,
                          msg: isDuplicate
                            ? "User already applied"
                            : "Failed to create application.",
                        });
                      }

                      const { score, reasons } = calcMatchScore(
                        modelRow,
                        campaignRow
                      );
                      const threshold = 50.0;

                      // If score >= threshold, upsert into campaign_matches
                      const doMatchInsert = score >= threshold;

                      const finishCommit = () => {
                        connection.commit((err) => {
                          if (err) {
                            connection.rollback(() => connection.release());
                            return res
                              .status(500)
                              .json({
                                ok: false,
                                msg: "Failed to commit transaction.",
                              });
                          }
                          connection.release();
                          // Fire-and-forget: create the Firestore chat doc for this match
                          // using deterministic id chat_{campaignId}_{modelId}
                          createChatForMatch(
                            campaignId,
                            modelRow.id,
                            campaignRow.agency_profile_id
                          )
                            .then(() => {
                              console.log("Chat created");
                            })
                            .catch((err) => {
                              console.error("createChatForMatch failed", err);
                            });
                          return res.status(201).json({
                            success: true,
                            msg: "Applied successfully.",
                            applicationId: insertRes.insertId,
                            match: doMatchInsert
                              ? { matched: true, score, reasons }
                              : { matched: false, score, reasons },
                          });
                        });
                      };
                      if (!doMatchInsert) {
                        // no match insert required, just commit
                        return finishCommit();
                      }

                      // Insert into campaign_matches with ON DUPLICATE KEY UPDATE to refresh matched_at & score
                      connection.query(
                        `INSERT INTO campaign_matches (campaign_id, model_id, agency_id, score, matched_at)
                         VALUES (?, ?, ?, ?, NOW())
                         ON DUPLICATE KEY UPDATE score = VALUES(score), matched_at = NOW()`,
                        [
                          campaignId,
                          modelRow.id,
                          campaignRow.agency_profile_id,
                          score,
                        ],
                        (err, matchRes) => {
                          if (err) {
                            // match insert failed: rollback the whole transaction (so application won't be created without match upsert)
                            connection.rollback(() => connection.release());
                            console.error(
                              "Failed to insert campaign_matches:",
                              err
                            );
                            return res
                              .status(500)
                              .json({
                                success: false,
                                msg: "Failed to create match record.",
                              });
                          }

                          // everything ok -> commit
                          return finishCommit();
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
