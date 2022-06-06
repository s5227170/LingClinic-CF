import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import CustomError from "./models/CustomError";
import decodeToken from "./middleware/decoder";
import scheduleRoutes from "./routes/index";
import dbConnection from "./middleware/db";

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

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileMiddleware);

app.use(decodeToken);

//This is done in order open a single connection and not close it throughout the lifecycle of the server instance. This i done since
//when locally working on the server, after a short period of time, MongoDB throws an alert that 500 connections have been reached.
app.use(dbConnection);

app.use("/", scheduleRoutes);

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
  }
);

app.listen(3005);

export const schedules = app;
