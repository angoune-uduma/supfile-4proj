// backend/src/controllers/user.controller.js
const bcrypt = require("bcrypt");
const User = require("../models/User");

/**
 * GET /user/me
 * Retourne l'utilisateur connecté
 * (req.user est injecté par auth.middleware)
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "email avatarUrl avatarMeta createdAt provider"
    );

    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.json({
      id: user._id,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
      avatarMeta: user.avatarMeta || null,
      createdAt: user.createdAt,
      provider: user.provider,
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

/**
 * PATCH /user/me
 * Modifier email / avatar
 */
exports.updateMe = async (req, res) => {
  try {
    const { email, avatarUrl, avatarMeta } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (email) user.email = email;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (avatarMeta !== undefined) user.avatarMeta = avatarMeta;

    await user.save();

    return res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        avatarMeta: user.avatarMeta || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

/**
 * PATCH /user/me/password
 * Changer mot de passe (compte local)
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "OAUTH_ACCOUNT_NO_PASSWORD" });
    }

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_OLD_PASSWORD" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};