//filesItem.js
const mongoose = require("mongoose");

const fileItemSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: ["file", "folder"], default: "file", index: true },

    originalName: { type: String, required: true },

    // requis uniquement si type === "file"
    mimeType: { type: String, default: null },
    size: { type: Number, default: 0 },
    storageRelPath: { type: String, default: null },

    parentId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Validation: si c'est un fichier, on exige mimeType + storageRelPath
fileItemSchema.pre("validate", function () {
  if (this.type === "file") {
    if (!this.mimeType) throw new Error("mimeType is required for file");
    if (!this.storageRelPath) throw new Error("storageRelPath is required for file");
    if (typeof this.size !== "number") throw new Error("size is required for file");
  }
});
module.exports = mongoose.model("FileItem", fileItemSchema);