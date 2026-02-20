import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { connectMongo } from "./config/mongo.js";
import routes from "./routes/index.js";
import { authStub } from "./middlewares/auth.stub.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Auth temporaire (Bloc 2 remplacera)
app.use(authStub);

// Routes
app.use("/api", routes);

// errors
app.use(errorHandler);

async function start() {
  await connectMongo();
  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] storage root: ${env.STORAGE_ROOT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});