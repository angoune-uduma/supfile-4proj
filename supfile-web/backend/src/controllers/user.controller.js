// backend/src/controllers/user.controller.js
const bcrypt = require("bcrypt");
const User = require("../models/User");

/**
 * GET /user/me
 * Retourne l'utilisateur connecté
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

    if (email && user.provider !== "local") {
      return res.status(400).json({ error: "OAUTH_EMAIL_NOT_EDITABLE" });
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
      return res.status(400).json({ error: "INVALID_OLD_PASSWORD" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

/**
 * PATCH /user/me/avatar
 * Uploader une image avatar
 */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "NO_FILE_PROVIDED" });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    }

    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "FILE_TOO_LARGE" });
    }

    const base64 = req.file.buffer.toString("base64");
    const avatarUrl = `data:${req.file.mimetype};base64,${base64}`;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });

    user.avatarUrl = avatarUrl;
    user.avatarMeta = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      updatedAt: new Date(),
    };
    await user.save();

    return res.json({ ok: true, avatarUrl });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};