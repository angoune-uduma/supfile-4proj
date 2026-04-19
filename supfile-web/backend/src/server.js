require("dotenv").config()
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API sur http://0.0.0.0:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("❌ Erreur MongoDB:", e);
    process.exit(1);
  });