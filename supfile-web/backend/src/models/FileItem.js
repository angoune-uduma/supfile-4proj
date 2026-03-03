// supfile-web/backend/src/models/FileItem.js
const mongoose = require("mongoose");

const fileItemSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    // Option 2: stockage physique par identifiant
    storageRelPath: { type: String, required: true }, // ex: "<userId>/<prefix>/<fileId>"

    // Pour la suite (arborescence)
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    // corbeille (plus tard)
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FileItem", fileItemSchema);