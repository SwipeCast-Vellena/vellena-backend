const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware.js");
const { admin, firestore } = require("../utils/firebase_admin.js");
const db = require("../db/db.js"); // adjust path if needed

// Keep track of long-poll clients
let longPollClients = [];

// ---------- Helper Functions ----------
async function resolveCandidateUids(reqUser) {
  const candidates = new Set();
  if (reqUser && reqUser.id) candidates.add(`u${reqUser.id}`);

  try {
    const [modelRows] = await db.promise().query(
      "SELECT id FROM model WHERE user_id = ? LIMIT 1",
      [reqUser.id]
    );
    if (modelRows?.length) candidates.add(`u${modelRows[0].id}`);
  } catch (e) {
    console.warn("resolveCandidateUids: model lookup error", e.message || e);
  }

  try {
    const [agencyRows] = await db.promise().query(
      "SELECT id FROM agency WHERE agency_id = ? LIMIT 1",
      [reqUser.id]
    );
    if (agencyRows?.length) candidates.add(`u${agencyRows[0].id}`);
  } catch (e) {
    console.warn("resolveCandidateUids: agency lookup error", e.message || e);
  }

  return Array.from(candidates);
}

async function verifyParticipant(chatId, reqUser) {
  const chatRef = firestore.collection("chats").doc(String(chatId));
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) return { ok: false, status: 404, msg: "Chat not found" };
  const chat = chatSnap.data();
  if (!chat?.participantUids) {
    return { ok: false, status: 403, msg: "Chat has no participants" };
  }

  const candidates = await resolveCandidateUids(reqUser);
  const found = candidates.find((c) => chat.participantUids.includes(c));
  if (!found) {
    return { ok: false, status: 403, msg: "User is not a chat participant" };
  }

  return { ok: true, chatRef, chat, uid: found };
}

// ---------- POST /:chatId/message ----------
router.post("/:chatId/message", protect, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const backendUser = req.user;

    if (!backendUser?.id)
      return res.status(401).json({ ok: false, msg: "Unauthorized" });

    const { text = "", type = "text", attachmentUrl = null } = req.body || {};
    if ((!text || !String(text).trim()) && !attachmentUrl) {
      return res
        .status(400)
        .json({ ok: false, msg: "Message text or attachment is required" });
    }
    if (typeof text !== "string")
      return res.status(400).json({ ok: false, msg: "Invalid text" });
    if (text && text.length > 2000)
      return res
        .status(400)
        .json({ ok: false, msg: "Message too long (max 2000 chars)" });
    if (!["text", "image", "file"].includes(type))
      return res.status(400).json({ ok: false, msg: "Invalid message type" });

    const verified = await verifyParticipant(chatId, req.user);
    if (!verified.ok)
      return res
        .status(verified.status)
        .json({ ok: false, msg: verified.msg });

    const { chatRef, uid } = verified;
    const messagesRef = chatRef.collection("messages");

    const now = admin.firestore.FieldValue.serverTimestamp();
    const messageData = {
      senderUid: uid,
      senderBackendId: backendUser.id,
      text: text ? String(text).trim() : "",
      type,
      attachmentUrl: attachmentUrl || null,
      createdAt: now,
      readBy: [uid],
    };

    const msgRef = await messagesRef.add(messageData);

    await chatRef.set(
      {
        lastMessage: {
          text: messageData.text,
          senderUid: uid,
          createdAt: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );

    // Immediately notify long-polling clients
    const newMessage = {
      id: msgRef.id,
      ...messageData,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    };

    longPollClients
      .filter((c) => c.chatId === chatId)
      .forEach((c) => {
        c.res.json({ success: true, messages: [newMessage] });
      });

    longPollClients = longPollClients.filter((c) => c.chatId !== chatId);

    return res.status(201).json({ ok: true, messageId: msgRef.id });
  } catch (err) {
    console.error("POST /api/chat/:chatId/message error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
});

// ---------- GET /:chatId/messages (history) ----------
router.get("/:chatId/messages", protect, async (req, res) => {
  try {
    const chatId = String(req.params.chatId || "");
    if (!chatId)
      return res.status(400).json({ success: false, msg: "chatId required" });

    const chatRef = firestore.collection("chats").doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ success: false, msg: "Chat not found" });
    }

    const chatData = chatSnap.data() || {};
    const title =
      chatData.title ||
      (chatData.campaignId
        ? `Campaign #${chatData.campaignId}`
        : chatData.chatId || null);

    const agencyId = chatData.agencyId || null;
    let agencyInfo = null;
    if (agencyId) {
      const [rows] = await db.promise().query(
        "SELECT * FROM agency WHERE id = ?",
        [agencyId]
      );
      if (rows.length) agencyInfo = rows[0];
    }

    const msgsSnap = await chatRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = msgsSnap.docs.map((d) => {
      const dt = d.get("createdAt");
      const createdAt =
        dt && typeof dt.toDate === "function"
          ? { seconds: dt.seconds, nanoseconds: dt.nanoseconds }
          : dt || null;

      return {
        id: d.id,
        text: d.get("text") || "",
        senderUid: d.get("senderUid") || null,
        senderBackendId: d.get("senderBackendId") || null,
        type: d.get("type") || "text",
        attachmentUrl: d.get("attachmentUrl") || null,
        readBy: d.get("readBy") || [],
        createdAt,
      };
    });

    return res.json({ success: true, title, agencyInfo, messages });
  } catch (err) {
    console.error("GET /api/chat/:chatId/messages error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ---------- NEW: GET /:chatId/poll (long polling) ----------
router.get("/:chatId/poll", protect, async (req, res) => {
  try {
    const chatId = String(req.params.chatId || "");
    if (!chatId)
      return res.status(400).json({ success: false, msg: "chatId required" });

    // Store this response for later
    longPollClients.push({ chatId, res });

    // Timeout after 25s (so client re-connects)
    setTimeout(() => {
      longPollClients = longPollClients.filter((c) => c.res !== res);
      res.json({ success: true, messages: [] });
    }, 25000);
  } catch (err) {
    console.error("GET /api/chat/:chatId/poll error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
