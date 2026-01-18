import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


// Define routes here
import router from "./routes/user.routes.js";
app.use("/api/v1/users", router);

import errorHandler from "./utils/errorhandler.js";
app.use(errorHandler);

export default app;