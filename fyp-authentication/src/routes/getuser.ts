import express, {
  NextFunction,
  Request,
  Response,
  Router,
} from "express";
import { MongoClient, MongoError } from "mongodb";
import CustomError from "../models/CustomError";

const getUser = express.Router();

getUser.get("", async (req: Request, res: Response, next: NextFunction) => {
  const client = await MongoClient.connect(process.env.DB_URL!).catch(
    (err: MongoError) => {
      if (err) {
        const error = new CustomError("Failed connection");
        error.status = 500;
        return next(error);
      }
    }
  );

  if (client) {
    const user = await client
      .db("FYP")
      .collection("Users")
      .findOne({ _id: res.locals.uid });

    res.status(200).send(user);
    return next();
  }

  return next();
});

export default getUser;