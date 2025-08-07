const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

const isModel = (req, res, next) => {
  if (req.user.role !== "model") return res.status(403).json({ msg: "Only for models" });
  next();
};

const isAgency = (req, res, next) => {
  if (req.user.role !== "agency") return res.status(403).json({ msg: "Only for agencies" });
  next();
};

module.exports = { protect, isModel, isAgency };
