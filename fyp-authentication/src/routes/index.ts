import { NextFunction, Request, Response, Router } from "express";
import { MongoClient, MongoError, ObjectId } from "mongodb";
import CustomError from "../models/CustomError";
import MongoConnection from "../models/mongoConnection";
import { User } from "../types";
const validator = require("validator");

const authentication = Router();

authentication.get(
  "/getuser",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({
      _id: res.locals.uid,
    });

    res.status(200).send(user);
    return next();
  }
);

authentication.post(
  "/createuser",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

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

    const User: User = {
      _id: new ObjectId(req.body.uid),
      email: req.body.email,
      forename: req.body.forename,
      surname: req.body.surname,
      avatar: "",
      type: "Client",
    };

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const createdUser = await (
      await client.connect("FYP", "Users")
    ).insertOne({
      ...User,
    });

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: createdUser.insertedId });

    res.status(200).send(user);
    return next();
  }
);

authentication.post(
  "/updateuser",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({
      _id: res.locals.uid,
    });

    if (!user) {
      const error = new CustomError("User not found.");
      error.status = 404;
      return next(error);
    }

    //Entries stands for the reformatted object into an array of arrays
    //that consist of [key:value] pair elements.
    const currentUserEntries: User = { ...(user as User) };
    const newUserEntries = Object.entries(req.body.user);

    const valueUpdate = Object.entries(currentUserEntries).map(
      (property, index) => {
        if (property[1] !== newUserEntries[index][1]) {
          if (property[0] == "email" || property[0] == "type") {
            const error = new CustomError(
              "You do not have access to change one or more of the applied properties."
            );
            error.status = 401;
            return next(error);
          }
          return [property[0], newUserEntries[index][1]];
        }
        return property;
      }
    );

    const refinedUser = Object.fromEntries(valueUpdate as any);

    console.log(refinedUser);
    const updatedUser = await (
      await client.connect("FYP", "Users")
    ).updateOne({ _id: res.locals.uid }, { $set: { ...refinedUser } });

    res.status(200).send(updatedUser);
    return next();
  }
);

export default authentication;
