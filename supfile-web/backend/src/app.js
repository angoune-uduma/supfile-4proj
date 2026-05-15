require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const filesRoutes = require("./routes/files.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const sharesRoutes = require("./routes/shares.routes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (isDev) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked for origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/files", filesRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/shares", sharesRoutes);

module.exports = app;