import mongoose from "mongoose";

const { Schema } = mongoose;

const FileItemSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },

    kind: { type: String, enum: ["folder", "file"], required: true },

    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "FileItem", default: null, index: true },

    // pour file seulement
    mimeType: { type: String, default: null },
    ext: { type: String, default: null },
    size: { type: Number, default: 0 },
    path: { type: String, default: null },

    // corbeille
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

FileItemSchema.index({ ownerId: 1, parentId: 1, isDeleted: 1, kind: 1 });
FileItemSchema.index({ ownerId: 1, name: 1 });

export const FileItem = mongoose.model("FileItem", FileItemSchema);