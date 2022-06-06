import { NextFunction, Request, Response } from "express";
import MongoConnection from "../models/mongoConnection";

const dbConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const dbConnection = new MongoConnection();
  await dbConnection.init();
  if (dbConnection) {
    req.db = dbConnection;
    return next();
  }

  return res.json("Problem connecting to database");
};

export default dbConnection;
