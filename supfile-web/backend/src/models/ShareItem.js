const mongoose = require("mongoose");

const shareItemSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileItem",
      required: true,
      index: true,
    },

    nodeType: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },

    mode: {
      type: String,
      enum: ["internal", "public"],
      required: true,
      index: true,
    },

    token: {
      type: String,
      default: null,
      index: true,
    },

    password: {
      type: String,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    allowDownload: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShareItem", shareItemSchema);