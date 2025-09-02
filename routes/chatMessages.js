const express= require("express");
const router = express.Router();
const {protect}=require("../middlewares/authMiddleware.js");

const {admin,firestore}=require("../utils/firebase_admin.js");

// add near top of file
const db = require('../db/db.js'); // adjust path if needed

// Resolve possible chat UIDs for the logged-in user.
// Returns array of candidate UIDs to check in participantUids (e.g. ['u37','u21'])
async function resolveCandidateUids(reqUser) {
  const candidates = new Set();

  // 1) always include users.id form
  if (reqUser && reqUser.id) {
    candidates.add(`u${reqUser.id}`);
  }

  // 2) try to find model table id for this users.id
  try {
    const [modelRows] = await db.promise().query('SELECT id FROM model WHERE user_id = ? LIMIT 1', [reqUser.id]);
    if (modelRows && modelRows.length) {
      candidates.add(`u${modelRows[0].id}`); // model.id
    }
  } catch (e) {
    // ignore DB errors here; we'll still have users.id candidate
    console.warn('resolveCandidateUids: model lookup error', e.message || e);
  }

  // 3) try to find agency table id for this users.id
  try {
    const [agencyRows] = await db.promise().query('SELECT id FROM agency WHERE agency_id = ? LIMIT 1', [reqUser.id]);
    if (agencyRows && agencyRows.length) {
      candidates.add(`u${agencyRows[0].id}`); // agency.id
    }
  } catch (e) {
    console.warn('resolveCandidateUids: agency lookup error', e.message || e);
  }

  return Array.from(candidates);
}

// New verifyParticipant: checks if any candidate uid exists in chat.participantUids
async function verifyParticipant(chatId, reqUser) {
  const chatRef = firestore.collection('chats').doc(String(chatId));
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) return { ok: false, status: 404, msg: 'Chat not found' };
  const chat = chatSnap.data();
  if (!chat || !Array.isArray(chat.participantUids)) {
    return { ok: false, status: 403, msg: 'Chat has no participants' };
  }

  // Resolve candidate UIDs (users.id, model.id, agency.id)
  const candidates = await resolveCandidateUids(reqUser);
  // debug: console.log('candidate uids', candidates, 'chat participants', chat.participantUids);

  // If any candidate appears in participantUids -> authorized
  const found = candidates.find(c => chat.participantUids.includes(c));
  if (!found) {
    return { ok: false, status: 403, msg: 'User is not a chat participant' };
  }

  // Return the matched UID (so later code uses the correct sender uid)
  return { ok: true, chatRef, chat, uid: found };
}
  /**
   * POST /api/chat/:chatId/message
   * Headers: Authorization: Bearer <JWT>
   * Body: { text?: string, type?: 'text'|'image'|'file', attachmentUrl?: string }
   */
  router.post('/:chatId/message', protect, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const backendUser = req.user;
      console.log('sendMessage: req.user.id =', backendUser.id, 'chatId=', chatId);
const chatSnap = await firestore.collection('chats').doc(chatId).get();
console.log('chat participants:', chatSnap.exists ? chatSnap.data().participantUids : 'missing');
      if (!backendUser || !backendUser.id) return res.status(401).json({ ok: false, msg: 'Unauthorized' });
  
      // Basic payload validation
      const { text = '', type = 'text', attachmentUrl = null } = req.body || {};
      if ((!text || !String(text).trim()) && !attachmentUrl) {
        return res.status(400).json({ ok: false, msg: 'Message text or attachment is required' });
      }
      if (typeof text !== 'string') return res.status(400).json({ ok: false, msg: 'Invalid text' });
      if (text && text.length > 2000) return res.status(400).json({ ok: false, msg: 'Message too long (max 2000 chars)' });
      if (!['text', 'image', 'file'].includes(type)) return res.status(400).json({ ok: false, msg: 'Invalid message type' });
  
      // TODO: implement rate-limiting here (Redis, in-memory limiter, etc.) if needed
  
      // Verify participant
      const verified = await verifyParticipant(chatId, req.user);
      if (!verified.ok) return res.status(verified.status).json({ ok: false, msg: verified.msg });
  
      const { chatRef, uid } = verified;
      const messagesRef = chatRef.collection('messages');
  
      // Prepare message document — use server timestamp
      const now = admin.firestore.FieldValue.serverTimestamp();
      const messageData = {
        senderUid: uid,                // firebase style uid (u{userId})
        senderBackendId: backendUser.id, // your MySQL user id for audit/cross-ref
        text: text ? String(text).trim() : '',
        type,
        attachmentUrl: attachmentUrl || null,
        createdAt: now,
        readBy: [ uid ]               // sender has read it
      };
  
      // Write message
      const msgRef = await messagesRef.add(messageData);
  
      // Update chat lastMessage atomically
      await chatRef.set({
        lastMessage: { text: messageData.text, senderUid: uid, createdAt: now },
        updatedAt: now
      }, { merge: true });
  
      // Optional: store audit in MySQL (uncomment if you want)
      /*
      await db.promise().query(
        'INSERT INTO chat_messages_audit (chat_id, sender_user_id, message_id, text, created_at) VALUES (?,?,?,?,NOW())',
        [chatId, backendUser.id, msgRef.id, messageData.text]
      );
      */
  
      return res.status(201).json({ ok: true, messageId: msgRef.id });
    } catch (err) {
      console.error('POST /api/chat/:chatId/message error:', err);
      return res.status(500).json({ ok: false, msg: 'Server error' });
    }
  });

  // GET /api/chat/:chatId/messages
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const chatId = String(req.params.chatId || '');
    if (!chatId) return res.status(400).json({ success: false, msg: 'chatId required' });

    const chatRef = firestore.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ success: false, msg: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};
    const title = chatData.title || (chatData.campaignId ? `Campaign #${chatData.campaignId}` : chatData.chatId || null);
    const agencyId = chatData.agencyId || null;
    let agencyInfo = null;
    console.log('chat participants:', agencyId);
    if (agencyId) {
      const [rows] = await db.promise().query('SELECT * FROM agency WHERE id = ?', [agencyId]);
      if (rows.length) agencyInfo = rows[0]; // <-- this should contain the full agency info
    }

    // Read messages subcollection ordered oldest -> newest
    const msgsSnap = await chatRef.collection('messages').orderBy('createdAt', 'asc').get();

    const messages = msgsSnap.docs.map((d) => {
      const dt = d.get('createdAt');
      const createdAt =
        dt && typeof dt.toDate === 'function'
          ? { seconds: dt.seconds, nanoseconds: dt.nanoseconds }
          : dt || null;

      return {
        id: d.id,
        text: d.get('text') || '',
        senderUid: d.get('senderUid') || null,
        senderBackendId: d.get('senderBackendId') || null,
        type: d.get('type') || 'text',
        attachmentUrl: d.get('attachmentUrl') || null,
        readBy: d.get('readBy') || [],
        createdAt,
      };
    });

      return res.json({ success: true, title, agencyInfo, messages });
  } catch (err) {
    console.error('GET /api/chat/:chatId/messages error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});
  
  module.exports = router;