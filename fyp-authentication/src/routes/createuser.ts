import express, { NextFunction, Request, Response, Router } from "express";
import { MongoClient, MongoError } from "mongodb";
import CustomError from "../models/CustomError";
const validator = require("validator");

const createUser = express.Router();

createUser.post(
  "",
  async (_, req: Request, res: Response, next: NextFunction) => {
    //Do checks here
    const errors = [];

    if (validator.isEmpty(req.body.uid)) {
      errors.push("Problem creating a user.");
    }
    if (validator.isEmpty(req.body.email)) {
      errors.push("No email provided.");
    }
    if (!validator.isEmail(req.body.email)) {
      errors.push("Problem with email format.");
    }
    if (validator.isEmpty(req.body.forename)) {
      errors.push("No forename provided.");
    }
    if (validator.isEmpty(req.body.surname)) {
      errors.push("No surname provided.");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      return next(error);
    }

    const User = {
      _id: req.body.uid,
      email: req.body.email,
      forename: req.body.forename,
      surname: req.body.surname,
      avatar: "",
      type: "Client",
    };

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
      const createdUser = await client
        .db("FYP")
        .collection("Users")
        .insertOne({ ...User });

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: createdUser.insertedId });

      res.status(200).send(user);
      return next();
    }

    return next();
  }
);

export default createUser;
