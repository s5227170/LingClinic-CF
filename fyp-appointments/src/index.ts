import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import CustomError from "./models/CustomError";
import decodeToken from "./middleware/decoder";
import appointmentRoutes from "./routes/index";
import dbConnection from "./middleware/db";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const fileMiddleware = require("express-multipart-file-parser");

require("dotenv-flow").config();

const app: Application = express();

var corsOptions: cors.CorsOptions = {};

if (process.env.NODE_ENV == "production") {
  corsOptions.credentials = true;
  corsOptions.origin = "https://final-year-project-82049.ew.r.appspot.com";
} else {
  corsOptions.origin = "*";
}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 240, // Limit each IP to 240 requests per `window` (here, per 1 minute, or 4 requests a second)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

app.use(helmet());

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileMiddleware);

app.use(decodeToken);

//This is done in order open a single connection and not close it throughout the lifecycle of the server instance. This i done since
//when locally working on the server, after a short period of time, MongoDB throws an alert that 500 connections have been reached.
app.use(dbConnection);

app.use("/", appointmentRoutes);

//This middleware closes each connection due to the reason stated on top.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.db) {
    await req.db.close();
  }
  return next();
});

app.use(
  (error: CustomError, req: Request, res: Response, next: NextFunction) => {
    res.status(error.status || 500);
    res.json({
      message: error.message,
      data: error.data,
    });
    return next();
  }
);

app.listen(3004);

export const appointments = app;
