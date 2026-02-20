import mongoose from "mongoose";

export function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({ error: { message: "Invalid id", status: 400 } });
    }
    next();
  };
}