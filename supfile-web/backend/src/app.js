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

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/files", filesRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/shares", sharesRoutes);

module.exports = app;