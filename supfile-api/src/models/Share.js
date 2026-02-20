import mongoose from "mongoose";

const { Schema } = mongoose;

const ShareSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: "FileItem", required: true, index: true },

    token: { type: String, required: true, unique: true, index: true },

    // bonus
    expiresAt: { type: Date, default: null },
    passwordHash: { type: String, default: null }
  },
  { timestamps: true }
);

export const Share = mongoose.model("Share", ShareSchema);