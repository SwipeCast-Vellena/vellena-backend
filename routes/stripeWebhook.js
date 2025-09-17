const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const db = require("../db/db.js");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Test endpoint to verify webhook is accessible
router.get("/webhook", (req, res) => {
  res.json({ received: true, message: "Webhook endpoint is accessible" });
});

// Stripe requires raw body for signature verification
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("🔔 Webhook received:", req.method, req.url);
    console.log("📋 Headers:", req.headers);
    console.log("📦 Raw body length:", req.body.length);
    
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("✅ Webhook event verified:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Log all events for debugging
    console.log("🔔 Received event type:", event.type);
    console.log("📋 Event data:", JSON.stringify(event.data.object, null, 2));
    
    // Handle successful checkout
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log("✅ Checkout session completed:", session);

        const userId = session.client_reference_id;
        console.log("👉 User ID from session:", userId);
        console.log("📋 Full session object:", JSON.stringify(session, null, 2));

        const modelId = parseInt(session.client_reference_id, 10); // ensure it's a number
        console.log("🔢 Parsed modelId:", modelId);
        
        if (modelId && !isNaN(modelId)) {
            try {
                const [result] = await db.promise().query(
                    "UPDATE model SET is_pro = 1 WHERE id = ?",
                    [modelId]
                );
                console.log(`✅ Model ${modelId} upgraded to Pro in DB. Rows affected: ${result.affectedRows}`);
            } catch (err) {
                console.error("❌ Failed to update model pro status:", err.message);
            }
        } else {
            console.log("❌ Invalid modelId:", modelId, "- skipping update");
        }
    } else {
        console.log("ℹ️ Event type not handled:", event.type);
    }

    res.json({ received: true });
  }
);

module.exports = router;
