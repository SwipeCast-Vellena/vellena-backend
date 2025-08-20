const {admin,firestore}=require("../utils/firebase_admin.js");

/**
 * Create or merge a chat doc for a match.
 * chatDocId is deterministic so you don't need DB auto-increment ids.
 * @param {number|string} campaignId
 * @param {number|string} modelUserId   // model table primary key (model.id)
 * @param {number|string} agencyUserId  // agency table primary key (agency.agency_id / id)
 * @param {string|null} chatDocIdOptional
 */

async function createChatForMatch(campaignId, modelUserId, agencyUserId, chatDocIdOptional = null) {
    try {
      const chatDocId = chatDocIdOptional || `chat_${campaignId}_${modelUserId}`;
      const modelUid = `u${modelUserId}`;   // must match UID format from /token route
      const agencyUid = `u${agencyUserId}`;
  
      // Optionally ensure firebase users exist (safe — ignores if exists)
      try { await admin.auth().getUser(modelUid); } catch (e) {
        if (e.code === 'auth/user-not-found') await admin.auth().createUser({ uid: modelUid }).catch(()=>{});
      }
      try { await admin.auth().getUser(agencyUid); } catch (e) {
        if (e.code === 'auth/user-not-found') await admin.auth().createUser({ uid: agencyUid }).catch(()=>{});
      }
  
      const docRef = firestore.collection('chats').doc(chatDocId);
      await docRef.set({
        chatId: chatDocId,
        campaignId,
        modelId: modelUserId,
        agencyId: agencyUserId,
        participantUids: [ modelUid, agencyUid ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: null
      }, { merge: true }); // merge true avoids overwriting older data
  
      return { chatDocId };
    } catch (err) {
      console.error('createChatForMatch error', err);
      throw err;
    }
  }
  
  module.exports = { createChatForMatch };
