const express = require("express");
const Stripe = require("stripe");
const db = require("../db/db.js");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan, userId } = req.body; // userId comes from frontend

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
      client_reference_id: userId, // attach user id
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
