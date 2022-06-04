import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import CustomError from "./models/CustomError";
import decodeToken from "./middleware/decoder";

import healthcareRoutes from "./routes/index";

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

app.use("/", healthcareRoutes);

app.use(
  (error: CustomError, req: Request, res: Response, next: NextFunction) => {
    res.status(error.status || 500);
    res.json({
      message: error.message,
      data: error.data,
    });
  }
);

app.listen(3003);

export const healthcares = app;
