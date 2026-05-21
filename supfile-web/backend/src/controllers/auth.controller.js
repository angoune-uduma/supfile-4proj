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

async function createAuthResponse(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: addDays(30),
    revokedAt: null,
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
    },
    accessToken,
    refreshToken,
  };
}

// -------------------- REGISTER --------------------
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(409).json({ error: "EMAIL_ALREADY_USED" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      provider: "local",
    });

    const authData = await createAuthResponse(user);

    return res.status(201).json(authData);
  } catch (err) {
    return res.status(500).json({
      error: "REGISTER_FAILED",
      message: err.message,
    });
  }
};

// -------------------- LOGIN --------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const authData = await createAuthResponse(user);

    return res.json(authData);
  } catch (err) {
    return res.status(500).json({
      error: "LOGIN_FAILED",
      message: err.message,
    });
  }
};

// -------------------- REFRESH --------------------
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "MISSING_REFRESH_TOKEN" });
    }

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

    await RefreshToken.create({
      userId: user._id,
      tokenHash: sha256(newRefreshToken),
      expiresAt: addDays(30),
      revokedAt: null,
    });

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(500).json({
      error: "REFRESH_FAILED",
      message: err.message,
    });
  }
};

// -------------------- LOGOUT --------------------
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.json({ ok: true });
    }

    await RefreshToken.updateOne(
      {
        tokenHash: sha256(refreshToken),
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      error: "LOGOUT_FAILED",
      message: err.message,
    });
  }
};

// -------------------- GITHUB OAUTH START --------------------
exports.githubStart = (req, res) => {
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const state = req.query.mobile === "1" ? "mobile" : "web";

  const url =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&scope=user:email" +
    `&state=${state}`;

  return res.redirect(url);
};

// -------------------- GITHUB OAUTH CALLBACK --------------------
exports.githubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "MISSING_CODE" });
    }

    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      },
      {
        headers: { Accept: "application/json" },
      }
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

    const githubId = String(meResp.data?.id);
    const emails = emailsResp.data || [];
    const primary = emails.find((e) => e.primary) || emails[0];
    const email = primary?.email;

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
      user.providerId = user.providerId || githubId;
      await user.save();
    }

    const authData = await createAuthResponse(user);

    const isMobile = state === "mobile";

    const redirectUrl = isMobile
      ? `supfile://oauth/success?accessToken=${encodeURIComponent(
          authData.accessToken
        )}&refreshToken=${encodeURIComponent(authData.refreshToken)}`
      : `${process.env.FRONTEND_URL}/oauth/success?accessToken=${encodeURIComponent(
          authData.accessToken
        )}&refreshToken=${encodeURIComponent(authData.refreshToken)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).json({
      error: "OAUTH_FAILED",
      message: err.message,
    });
  }
};

// -------------------- GOOGLE OAUTH START --------------------
exports.googleStart = (req, res) => {
  const state = req.query.mobile === "1" ? "mobile" : "web";

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// -------------------- GOOGLE OAUTH CALLBACK --------------------
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "MISSING_CODE" });
    }

    const tokenResp = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    });

    const { access_token } = tokenResp.data;

    if (!access_token) {
      return res.status(401).json({ error: "GOOGLE_TOKEN_ERROR" });
    }

    const meResp = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const { id: googleId, email, picture } = meResp.data;

    if (!email) {
      return res.status(400).json({ error: "NO_EMAIL_FROM_GOOGLE" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        provider: "google",
        providerId: googleId,
        avatarUrl: picture || null,
      });
    } else {
      user.providerId = user.providerId || googleId;

      if (!user.avatarUrl && picture) {
        user.avatarUrl = picture;
      }

      await user.save();
    }

    const authData = await createAuthResponse(user);

    const isMobile = state === "mobile";

    const redirectUrl = isMobile
      ? `supfile://oauth/success?accessToken=${encodeURIComponent(
          authData.accessToken
        )}&refreshToken=${encodeURIComponent(authData.refreshToken)}`
      : `${process.env.FRONTEND_URL}/oauth/success?accessToken=${encodeURIComponent(
          authData.accessToken
        )}&refreshToken=${encodeURIComponent(authData.refreshToken)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).json({
      error: "OAUTH_FAILED",
      message: err.message,
    });
  }
};

// -------------------- GOOGLE OAUTH MOBILE --------------------
exports.googleMobile = async (req, res) => {
  try {
    const { accessToken: googleAccessToken } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ error: "MISSING_TOKEN" });
    }

    const meResp = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      }
    );

    const { id: googleId, email, picture } = meResp.data;

    if (!email) {
      return res.status(400).json({ error: "NO_EMAIL_FROM_GOOGLE" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        provider: "google",
        providerId: googleId,
        avatarUrl: picture || null,
      });
    } else {
      user.providerId = user.providerId || googleId;

      if (!user.avatarUrl && picture) {
        user.avatarUrl = picture;
      }

      await user.save();
    }

    const authData = await createAuthResponse(user);

    return res.json(authData);
  } catch (err) {
    return res.status(500).json({
      error: "GOOGLE_MOBILE_AUTH_FAILED",
      message: err.message,
    });
  }
};

// -------------------- GITHUB OAUTH MOBILE --------------------
exports.githubMobile = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ error: "MISSING_CODE" });
    }

    const tokenResp = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: { Accept: "application/json" },
      }
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

    const githubId = String(meResp.data?.id);
    const emails = emailsResp.data || [];
    const primary = emails.find((e) => e.primary) || emails[0];
    const email = primary?.email;

    if (!email) {
      return res.status(400).json({ error: "NO_EMAIL_FROM_GITHUB" });
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
      user.providerId = user.providerId || githubId;
      await user.save();
    }

    const authData = await createAuthResponse(user);

    return res.json(authData);
  } catch (err) {
    return res.status(500).json({
      error: "GITHUB_MOBILE_AUTH_FAILED",
      message: err.message,
    });
  }
};
