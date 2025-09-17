const express = require("express");
const Stripe = require("stripe");
const db = require("../db/db.js");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan, userId } = req.body; // userId comes from frontend (users.id)

    // Convert users.id to model.id for webhook
    const [modelRows] = await db.promise().query(
      "SELECT id FROM model WHERE user_id = ? LIMIT 1",
      [userId]
    );
    
    if (!modelRows.length) {
      return res.status(404).json({ error: "Model profile not found" });
    }
    
    const modelId = modelRows[0].id;
    console.log("🔢 Creating checkout session for modelId:", modelId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: plan === "pro" ? "Pro Plan" : "Default Plan" },
            unit_amount: 1000, // $10
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/model/profile`,
      cancel_url: `${process.env.FRONTEND_URL}/model/profile`,
      client_reference_id: modelId.toString(), // attach model.id for webhook
    });

    console.log("✅ Checkout session created:", session.id);
    console.log("📋 Session client_reference_id:", session.client_reference_id);
    res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to manually upgrade user (for local testing)
router.post("/test-upgrade", async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Convert users.id to model.id
    const [modelRows] = await db.promise().query(
      "SELECT id FROM model WHERE user_id = ? LIMIT 1",
      [userId]
    );
    
    if (!modelRows.length) {
      return res.status(404).json({ error: "Model profile not found" });
    }
    
    const modelId = modelRows[0].id;
    
    // Update to Pro
    await db.promise().query(
      "UPDATE model SET is_pro = 1 WHERE id = ?",
      [modelId]
    );
    
    res.json({ success: true, message: `Model ${modelId} upgraded to Pro` });
  } catch (err) {
    console.error("Test upgrade error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
