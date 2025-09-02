const db = require("../db/db.js");
const { uploadUpTo3 } = require("../utils/multer");

const MAX_PHOTOS_PER_GROUP = 3;

/**
 * POST /api/model/photos
 * Auth: protect + isModel
 * Multipart: files[] (max 3), body: groupLabel (optional, default "Portfolio")
 * Behavior: only SAVE; reject if total would exceed 3
 */
exports.uploadModelPhotos = (req, res) => {
  uploadUpTo3(req, res, (err) => {
    if (err) return res.status(400).json({ msg: err.message });

    const userId = req.user.id;
    const groupLabel = (req.body.groupLabel || "Portfolio").trim() || "Portfolio";
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) return res.status(400).json({ msg: "No images received" });

    // 1) Resolve model_id from current user
    const getModelSql = "SELECT id FROM model WHERE user_id = ?";
    db.query(getModelSql, [userId], (e0, r0) => {
      if (e0) return res.status(500).json({ msg: "Database error", error: e0.message });
      if (!r0.length) return res.status(404).json({ msg: "Model profile not found" });

      const modelId = r0[0].id;

      // 2) Count existing photos in this group
      const countSql = "SELECT id, position FROM model_photo WHERE model_id=? AND group_label=? ORDER BY position ASC, created_at ASC";
      db.query(countSql, [modelId, groupLabel], (e1, existing) => {
        if (e1) return res.status(500).json({ msg: "Database error", error: e1.message });

        const currentCount = existing.length;
        const incomingCount = Math.min(files.length, MAX_PHOTOS_PER_GROUP);
        if (currentCount + incomingCount > MAX_PHOTOS_PER_GROUP) {
          return res.status(400).json({
            msg: `Only ${MAX_PHOTOS_PER_GROUP} photos allowed in group "${groupLabel}". Remove some before adding new ones.`,
          });
        }

        // 3) Compute next available positions (1..3)
        const used = new Set(existing.map((row) => row.position).filter((p) => p != null));
        let next = 1;
        const nextPos = () => {
          while (used.has(next)) next++;
          used.add(next);
          return next;
        };

        // 4) Insert rows
        const insertSql = "INSERT INTO model_photo (model_id, group_label, url, position) VALUES ?";
        const values = files.slice(0, incomingCount).map((f) => {
          // For local storage, expose as /uploads/... (served by express static)
          const url = `/uploads/model_photos/${f.filename}`;
          return [modelId, groupLabel, url, nextPos()];
        });

        db.query(insertSql, [values], (e2) => {
          if (e2) return res.status(500).json({ msg: "Database error", error: e2.message });
          return res.status(201).json({
            ok: true,
            groupLabel,
            added: values.length,
            // return latest snapshot of this group
            photos: values.map(([, , url, position]) => ({ url, position })),
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
