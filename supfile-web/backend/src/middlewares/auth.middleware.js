const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "MISSING_TOKEN" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "USER_NOT_FOUND" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};