import { NextFunction, Request, Response } from "express";
import admin from "../config/config";

const decodeToken = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) {
    return res.json({ message: "Token not provided" });
  }

  const token = req.headers.authorization.split(" ")[1];

  try {
    const decodeValue = await admin.auth().verifyIdToken(token);
    res.locals.uid = decodeValue.uid;

    if (decodeValue) {
      return next();
    }

    return res.json({ message: "Unauthorised" });
  } catch (e) {
    console.log(e);
    return res.json({ message: "internal Error" });
  }
};

export default decodeToken;
