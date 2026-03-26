const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || "30d" }
  );
}

async function storeRefreshToken(userId, refreshToken) {
  await RefreshToken.create({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: addDays(30),
    revokedAt: null,
  });
}

exports.register = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "EMAIL_ALREADY_USED" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      provider: "local",
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await storeRefreshToken(user._id, refreshToken);

    return res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await storeRefreshToken(user._id, refreshToken);

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: "INVALID_REFRESH_TOKEN" });
    }

    const tokenDoc = await RefreshToken.findOne({
      tokenHash: sha256(refreshToken),
      revokedAt: null,
    });

    if (!tokenDoc) {
      return res.status(401).json({ error: "REFRESH_TOKEN_REVOKED" });
    }

    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: "REFRESH_TOKEN_EXPIRED" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "USER_NOT_FOUND" });
    }

    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await storeRefreshToken(user._id, newRefreshToken);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.json({ ok: true });
    }

    await RefreshToken.updateOne(
      { tokenHash: sha256(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
};

exports.githubStart = (req, res) => {
  const redirectUri = process.env.OAUTH_REDIRECT_URL;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=user:email`;

  return res.redirect(url);
};

exports.githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "MISSING_CODE" });
    }

    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.OAUTH_REDIRECT_URL,
      },
      { headers: { Accept: "application/json" } }
    );

    const ghToken = tokenResp.data?.access_token;
    if (!ghToken) {
      return res.status(401).json({ error: "GITHUB_TOKEN_ERROR" });
    }

    const [meResp, emailsResp] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${ghToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${ghToken}` },
      }),
    ]);

    const githubId = String(meResp.data?.id || "");
    const emails = emailsResp.data || [];
    const primary = emails.find((e) => e.primary) || emails[0];
    const email = normalizeEmail(primary?.email);

    if (!email) {
      return res.status(400).json({ error: "NO_EMAIL_FROM_GITHUB" });
    }

    if (!githubId) {
      return res.status(400).json({ error: "NO_GITHUB_ID" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        provider: "github",
        providerId: githubId,
      });
    } else {
      user.provider = user.provider || "local";
      user.providerId = user.providerId || githubId;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await storeRefreshToken(user._id, refreshToken);

    const redirectUrl =
      `${process.env.FRONTEND_URL}/oauth/success` +
      `?accessToken=${encodeURIComponent(accessToken)}` +
      `&refreshToken=${encodeURIComponent(refreshToken)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).json({ error: "OAUTH_FAILED", message: err.message });
  }
};

exports.githubMobileStart = (req, res) => {
  const mobileRedirectUri = req.query.redirect_uri;
  if (!mobileRedirectUri) {
    return res.status(400).json({ error: "MISSING_MOBILE_REDIRECT_URI" });
  }

  const callbackUrl =
    `${process.env.API_URL}/auth/oauth/github/mobile/callback` +
    `?mobile_redirect_uri=${encodeURIComponent(mobileRedirectUri)}`;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&scope=user:email`;

  return res.redirect(url);
};

exports.githubMobileCallback = async (req, res) => {
  try {
    const { code, mobile_redirect_uri } = req.query;

    if (!code) {
      return res.status(400).json({ error: "MISSING_CODE" });
    }

    if (!mobile_redirect_uri) {
      return res.status(400).json({ error: "MISSING_MOBILE_REDIRECT_URI" });
    }

    const backendCallback =
      `${process.env.API_URL}/auth/oauth/github/mobile/callback` +
      `?mobile_redirect_uri=${encodeURIComponent(mobile_redirect_uri)}`;

    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: backendCallback,
      },
      { headers: { Accept: "application/json" } }
    );

    const ghToken = tokenResp.data?.access_token;
    if (!ghToken) {
      return res.status(401).json({ error: "GITHUB_TOKEN_ERROR" });
    }

    const [meResp, emailsResp] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${ghToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${ghToken}` },
      }),
    ]);

    const githubId = String(meResp.data?.id || "");
    const emails = emailsResp.data || [];
    const primary = emails.find((e) => e.primary) || emails[0];
    const email = normalizeEmail(primary?.email);

    if (!email) {
      return res.status(400).json({ error: "NO_EMAIL_FROM_GITHUB" });
    }

    if (!githubId) {
      return res.status(400).json({ error: "NO_GITHUB_ID" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        provider: "github",
        providerId: githubId,
      });
    } else {
      user.provider = user.provider || "local";
      user.providerId = user.providerId || githubId;
      await user.save();
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await storeRefreshToken(user._id, refreshToken);

    const redirectUrl =
      `${mobile_redirect_uri}` +
      `?accessToken=${encodeURIComponent(accessToken)}` +
      `&refreshToken=${encodeURIComponent(refreshToken)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).json({ error: "OAUTH_FAILED", message: err.message });
  }
};