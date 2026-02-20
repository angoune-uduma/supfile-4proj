import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5050),
  MONGO_URI: process.env.MONGO_URI ?? "mongodb://mongo:27017/supfile",
  STORAGE_ROOT: process.env.STORAGE_ROOT ?? "/data",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173"
};