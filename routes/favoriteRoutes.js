const express=require("express");
const {protect,isAgency}=require("../middlewares/authMiddleware.js");
const db=require("../db/db.js");
const {createChatForMatch} =require("../chat/chatHelper.js");


const router=express.Router();

router.post('/favorite', protect, (req, res) => {
    const userId = Number(req.user && req.user.id); // logged-in user id
    const modelId = Number(req.body.modelId);
  
    if (!userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
    if (!modelId || Number.isNaN(modelId)) return res.status(400).json({ success: false, msg: 'modelId required' });
  
    db.getConnection((err, connection) => {
      if (err) {
        console.error('DB connection error:', err);
        return res.status(500).json({ success: false, msg: 'Database connection error.' });
      }
  
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, msg: 'Failed to start transaction.' });
        }
  
        // 1) resolve agency profile (agency.id) for logged-in user
        connection.query(
          'SELECT id FROM agency WHERE agency_id = ? LIMIT 1',
          [userId],
          (err, agencyRows) => {
            if (err) {
              connection.rollback(() => connection.release());
              console.error('DB error selecting agency:', err);
              return res.status(500).json({ success: false, msg: 'DB error fetching agency profile.' });
            }
            if (!agencyRows.length) {
              connection.rollback(() => connection.release());
              return res.status(404).json({ success: false, msg: 'Agency profile not found.' });
            }
            const agencyProfileId = agencyRows[0].id;
  
            // 2) insert into favorites (or update timestamp if exists)
            const insertFav = `
              INSERT INTO favorites (agency_id, model_id)
              VALUES (?, ?)
              ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
            `;
            connection.query(insertFav, [agencyProfileId, modelId], (err) => {
              if (err) {
                connection.rollback(() => connection.release());
                console.error('DB error inserting favorite:', err);
                return res.status(500).json({ success: false, msg: 'DB error inserting favorite.' });
              }
  
              // 3) check campaign_matches for pending matches for this agency profile
              const selectMatches = `
                SELECT campaign_id
                FROM campaign_matches
                WHERE agency_id = ? AND model_id = ? AND agency_approved = 0
              `;
              connection.query(selectMatches, [agencyProfileId, modelId], (err, matches) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  console.error('DB error selecting campaign_matches:', err);
                  return res.status(500).json({ success: false, msg: 'DB error.' });
                }
  
                if (!matches.length) {
                  // no pending campaign matches -> commit and return approved: false
                  connection.commit((err) => {
                    connection.release();
                    if (err) {
                      console.error('Commit error:', err);
                      return res.status(500).json({ success: false, msg: 'Failed to commit.' });
                    }
  
                    // Optionally: send a notification to model that agency liked them.
                    // You said frontend handles notification UI. If you still want server push/email/etc,
                    // call sendNotification(modelId, ... ) here (asynchronously).
  
                    return res.json({ success: true, approved: false, campaigns: [], chats: [] });
                  });
                } else {
                  // found one or more pending matches -> approve them all
                  const campaignIds = matches.map(r => r.campaign_id);
  
                  const updateMatches = `
                    UPDATE campaign_matches
                    SET agency_approved = 1
                    WHERE agency_id = ? AND model_id = ? AND agency_approved = 0
                  `;
                  connection.query(updateMatches, [agencyProfileId, modelId], (err, updateResult) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      console.error('DB error updating matches:', err);
                      return res.status(500).json({ success: false, msg: 'DB error updating matches.' });
                    }
  
                    connection.commit(async (err) => {
                      connection.release();
                      if (err) {
                        console.error('Commit error after approving matches:', err);
                        return res.status(500).json({ success: false, msg: 'Failed to commit.' });
                      }
  
                      // Now create chats for each approved campaign. Do this outside the DB transaction.
                      // createChatForMatch should be a Promise (async). If it's callback, adapt accordingly.
                      const chatResults = [];
                      for (const campaignId of campaignIds) {
                        try {
                          // reuse your existing chat creator
                          // expect createChatForMatch(campaignId, modelId, agencyProfileId) to create a chat and return something (or be awaited)
                          await createChatForMatch(campaignId, modelId, agencyProfileId);
                          chatResults.push({ campaignId, success: true, chatId: `chat_${campaignId}_${modelId}` });
                        } catch (e) {
                          console.error('createChatForMatch error for campaign', campaignId, e);
                          chatResults.push({ campaignId, success: false, error: e?.message || e });
                        }
                      }
  
                      // Optionally: send notification to model(s) that they were approved and chat created.
                      // You said notifications handled in frontend; backend can return this info and let FE show the right toast/modal.
  
                      return res.json({
                        success: true,
                        approved: true,
                        campaigns: campaignIds,
                        chats: chatResults
                      });
                    }); // commit
                  }); // updateMatches
                }
              }); // selectMatches
            }); // insertFav
          } // select agency callback
        ); // connection.query
      }); // beginTransaction
    }); // getConnection
  });

  // routes/favorites.js
router.get('/notifications', protect, (req, res) => {
    const modelUserId = req.user.id;
  
    // find the model profile id from user id
    const sqlModel = `SELECT id FROM model WHERE user_id = ? LIMIT 1`;
    db.query(sqlModel, [modelUserId], (err, rows) => {
      if (err) {
        console.error('Error fetching model:', err);
        return res.status(500).json({ success: false, msg: 'Server error' });
      }
      if (!rows.length) {
        return res.json({ success: true, favorites: [] });
      }
      const modelProfileId = rows[0].id;
  
      // get all agencies that liked this model
      const sqlFavs = `
        SELECT f.id,f.model_id, f.created_at, a.name, a.id as agencyProfileId
        FROM favorites f
        JOIN agency a ON a.id = f.agency_id
        WHERE f.model_id = ?
        ORDER BY f.created_at DESC
      `;
      db.query(sqlFavs, [modelProfileId], (err, favs) => {
        if (err) {
          console.error('Error fetching favorites:', err);
          return res.status(500).json({ success: false, msg: 'Server error' });
        }
        res.json({ success: true, favorites: favs });
      });
    });
  });

  // GET /api/favorite/:modelId
router.get("/favorite/:modelId", protect, (req, res) => {
  const userId = Number(req.user.id); // logged-in agency
  const modelId = Number(req.params.modelId);

  if (!userId) return res.status(401).json({ success: false, msg: "Unauthorized" });
  if (!modelId) return res.status(400).json({ success: false, msg: "modelId required" });

  // find agency profile
  db.query("SELECT id FROM agency WHERE agency_id = ? LIMIT 1", [userId], (err, agencyRows) => {
    if (err) return res.status(500).json({ success: false, msg: "DB error" });
    if (!agencyRows.length) return res.status(404).json({ success: false, msg: "Agency profile not found" });

    const agencyProfileId = agencyRows[0].id;

    db.query(
      "SELECT 1 FROM favorites WHERE agency_id = ? AND model_id = ? LIMIT 1",
      [agencyProfileId, modelId],
      (err2, favRows) => {
        if (err2) return res.status(500).json({ success: false, msg: "DB error" });
        const isFavorite = favRows.length > 0;
        res.json({ success: true, isFavorite });
      }
    );
  });
});

// routes/favoriteRoutes.js
router.delete('/favorite/:modelId', protect, (req, res) => {
  const userId = Number(req.user && req.user.id);
  const modelId = Number(req.params.modelId);

  if (!userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
  if (!modelId) return res.status(400).json({ success: false, msg: 'modelId required' });

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ success: false, msg: 'DB connection error.' });

    const query = `DELETE FROM favorites WHERE agency_id = ? AND model_id = ?`;
    connection.query(query, [userId, modelId], (err, result) => {
      connection.release();
      if (err) return res.status(500).json({ success: false, msg: 'DB error.' });
      return res.json({ success: true });
    });
  });
});


  
  

module.exports=router;
  
  
  
