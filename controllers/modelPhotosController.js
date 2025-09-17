const db = require("../db/db.js");
const { uploadUpTo3 } = require("../utils/multer");

const MAX_FREE_TOTAL = 3;
const MAX_PRO_TOTAL = 10;
const MAX_PER_UPLOAD = 10; // Allow up to Pro limit per upload

/**
 * POST /api/model/photos
 * Auth: protect + isModel
 * Multipart: files[] (max 3), body: groupLabel (optional, default "Portfolio")
 * Behavior: SAVE; enforce total cap Free=3, Pro=10 across all groups
 */
exports.uploadModelPhotos = (req, res) => {
  uploadUpTo3(req, res, (err) => {
    if (err) return res.status(400).json({ msg: err.message });

    const userId = req.user.id;
    const groupLabel = (req.body.groupLabel || "Portfolio").trim() || "Portfolio";
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) return res.status(400).json({ msg: "No images received" });

    // 1) Resolve model_id and is_pro from current user
    const getModelSql = "SELECT id, is_pro FROM model WHERE user_id = ?";
    db.query(getModelSql, [userId], (e0, r0) => {
      if (e0) return res.status(500).json({ msg: "Database error", error: e0.message });
      if (!r0.length) return res.status(404).json({ msg: "Model profile not found" });

      const modelId = r0[0].id;
      const isPro = !!r0[0].is_pro;
      const totalCap = isPro ? MAX_PRO_TOTAL : MAX_FREE_TOTAL;
      
      console.log(`📸 Photo upload - User ID: ${userId}, Model ID: ${modelId}, isPro: ${isPro}, totalCap: ${totalCap}`);

      // 2) Count existing photos across ALL groups
      const totalSql = "SELECT COUNT(*) AS cnt FROM model_photo WHERE model_id = ?";
      db.query(totalSql, [modelId], (eTotal, rTotal) => {
        if (eTotal) return res.status(500).json({ msg: "Database error", error: eTotal.message });
        const currentTotal = rTotal && rTotal[0] ? Number(rTotal[0].cnt) : 0;
        const incomingCount = Math.min(files.length, MAX_PER_UPLOAD);

        if (currentTotal + incomingCount > totalCap) {
          return res.status(400).json({
            msg: isPro
              ? `Pro accounts can upload up to ${MAX_PRO_TOTAL} photos in total.`
              : `Free accounts can upload up to ${MAX_FREE_TOTAL} photos in total. Upgrade to Pro for up to ${MAX_PRO_TOTAL}.`,
          });
        }

        // 3) Count existing photos to assign positions
        const countSql = "SELECT id, position FROM model_photo WHERE model_id=? ORDER BY position ASC, created_at ASC";
        db.query(countSql, [modelId], (e1, existing) => {
          if (e1) return res.status(500).json({ msg: "Database error", error: e1.message });

          // positions are 1..maxPhotos
          const used = new Set(existing.map((row) => row.position).filter((p) => p != null));
          let next = 1;
          const nextPos = () => {
            while (used.has(next) && next <= totalCap) next++;
            if (next > totalCap) return null;
            used.add(next);
            return next;
          };

          const insertSql = "INSERT INTO model_photo (model_id, group_label, url, position) VALUES ?";
          const values = [];
          for (const f of files.slice(0, MAX_PER_UPLOAD)) {
            const pos = nextPos();
            if (pos == null) break; // reached limit
            const url = `/uploads/model_photos/${f.filename}`;
            values.push([modelId, groupLabel, url, pos]);
          }

          if (!values.length) {
            return res.status(400).json({ msg: `Photo limit reached. ${isPro ? 'Pro' : 'Free'} accounts can upload up to ${totalCap} photos.` });
          }

          db.query(insertSql, [values], (e2) => {
            if (e2) return res.status(500).json({ msg: "Database error", error: e2.message });
            return res.status(201).json({
              ok: true,
              groupLabel,
              added: values.length,
              totalAfter: currentTotal + values.length,
              cap: totalCap,
              photos: values.map(([, , url, position]) => ({ url, position })),
            });
          });
        });
      });
    });
  });
};

/**
 * GET /api/model/photos
 * Auth: protect + isModel
 * Query: groupLabel (optional; default all groups)
 * Returns all photos for the logged-in model (optionally filtered by group)
 */
exports.listMyModelPhotos = (req, res) => {
  const userId = req.user.id;
  const groupLabel = req.query.groupLabel;

  const getModelSql = "SELECT id FROM model WHERE user_id = ?";
  db.query(getModelSql, [userId], (e0, r0) => {
    if (e0) return res.status(500).json({ msg: "Database error", error: e0.message });
    if (!r0.length) return res.status(404).json({ msg: "Model profile not found" });

    const modelId = r0[0].id;

    let sql = `
      SELECT id, group_label AS groupLabel, url, position, created_at AS createdAt
      FROM model_photo
      WHERE model_id = ?
    `;
    const params = [modelId];

    if (groupLabel) {
      sql += " AND group_label = ?";
      params.push(groupLabel);
    }

    sql += " ORDER BY group_label ASC, COALESCE(position, 999) ASC, created_at ASC";

    db.query(sql, params, (e1, rows) => {
      if (e1) return res.status(500).json({ msg: "Database error", error: e1.message });

      // Pack by group for convenience
      const groups = {};
      rows.forEach((r) => {
        if (!groups[r.groupLabel]) groups[r.groupLabel] = [];
        groups[r.groupLabel].push({ id: r.id, url: r.url, position: r.position, createdAt: r.createdAt });
      });

      return res.json({ ok: true, groups });
    });
  });
};

/**
 * (Optional) GET /api/model/photos/by-model/:modelId
 * Auth: protect (use isAgency or allow both with auth) — to fetch another model's photos
 * Query: groupLabel (optional)
 */
exports.listPhotosByModelId = (req, res) => {
  const modelId = Number(req.params.modelId);
  const groupLabel = req.query.groupLabel;

  if (!modelId) return res.status(400).json({ msg: "modelId required" });

  let sql = `
    SELECT id, group_label AS groupLabel, url, position, created_at AS createdAt
    FROM model_photo
    WHERE model_id = ?
  `;
  const params = [modelId];

  if (groupLabel) {
    sql += " AND group_label = ?";
    params.push(groupLabel);
  }

  sql += " ORDER BY group_label ASC, COALESCE(position, 999) ASC, created_at ASC";

  db.query(sql, params, (e1, rows) => {
    if (e1) return res.status(500).json({ msg: "Database error", error: e1.message });

    const groups = {};
    rows.forEach((r) => {
      if (!groups[r.groupLabel]) groups[r.groupLabel] = [];
      groups[r.groupLabel].push({ id: r.id, url: r.url, position: r.position, createdAt: r.createdAt });
    });

    return res.json({ ok: true, groups });
  });
};
