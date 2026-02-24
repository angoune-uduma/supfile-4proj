const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String, default: null },

    provider: { type: String, enum: ["local", "google", "github"], default: "local" },
    providerId: { type: String, default: null },

    avatarUrl: { type: String, default: null },
    avatarMeta: {
      filename: String,
      mimetype: String,
      size: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);