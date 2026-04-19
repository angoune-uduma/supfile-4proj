const File = require("../models/File");

exports.upload = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.userId;

    if (!file) {
      return res.status(400).json({ error: "NO_FILE_PROVIDED" });
    }

    const doc = await File.create({
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      bucket: "files",
      path: `local/${Date.now()}-${file.originalname}`,
    });

    return res.status(201).json({
      message: "File uploaded",
      file: doc,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.listMine = async (req, res) => {
  try {
    const files = await File.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json(files);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteMine = async (req, res) => {
  try {
    const file = await File.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    if (!file) {
      return res.status(404).json({ error: "FILE_NOT_FOUND" });
    }
    return res.json({ message: "File deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};