const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const db = require("../db/db.js");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe requires raw body for signature verification
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful checkout
        if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log("✅ Checkout session completed:", session);

        const userId = session.client_reference_id;
        console.log("👉 User ID from session:", userId);

        const modelId = parseInt(session.client_reference_id, 10); // ensure it's a number
        if (modelId) {
        db.query(
            "UPDATE model SET is_pro = 1 WHERE id = ?",
            [modelId],
            (err, result) => {
            if (err) {
                console.error("❌ Failed to update model pro status:", err.message);
            } else {
                console.log(`✅ Model ${modelId} upgraded to Pro in DB`);
            }
            }
        );
        }
    }


    res.json({ received: true });
  }
);

module.exports = router;
