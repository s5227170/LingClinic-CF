import express, { NextFunction, Request, Response, Router } from "express";
import { FindOptions, ObjectId } from "mongodb";
import CustomError from "../models/CustomError";
import MongoConnection from "../models/mongoConnection";
import { v4 as uuidv4 } from "uuid";

const path = require("path");
const fs = require("fs");
const os = require("os");
const validator = require("validator");
const { getStorage } = require("firebase-admin/storage");
const fileRoutes = Router();

//Check if file management works and place this in a proper separate file

fileRoutes.post(
  "/uploadTherapist",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.files.length == 0) {
      return next();
    }

    const { fieldname, originalname, encoding, mimetype, buffer } =
      req.files[0];

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const professionalCheck = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!professionalCheck) {
      const error = new CustomError("The user is not a therapist.");
      error.status = 403;
      return next(error);
    }

    const storage = getStorage().bucket("fyp-docs");
    const fileNames = [];

    for (let i = 0; i < req.files.length; i++) {
      const extension = path.extname(req.files[i].originalname);
      const fileName = uuidv4() + extension;
      fileNames.push(fileName);

      const filePath = os.tmpdir() + "/" + fileName;
      const buffer = Buffer.from(req.files[i].buffer);
      fs.createWriteStream(filePath).write(buffer, async (err: Error) => {
        if (err) {
          console.log("fail");
        } else {
          const upload = await storage.upload(filePath, {
            destination: fileName,
          });

          fs.unlink(filePath, async (err: Error) => {
            if (err) throw err;
          });
        }
      });
    }

    res.status(200).send(fileNames);
    return next();
  }
);

fileRoutes.post(
  "/uploadClient/:healthcareID",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.files.length == 0) {
      return next();
    }

    const { fieldname, originalname, encoding, mimetype, buffer } =
      req.files[0];
    const errors: string[] = [];

    if (validator.isEmpty(req.params.healthcareID)) {
      errors.push("No healthcare found with current ID");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      return next(error);
    }

    for (let i = 0; i < req.files.length; i++) {
      const extension = path.extname(req.files[i].originalname);
      if (
        extension != ".JPG" &&
        extension != ".jpg" &&
        extension != ".JPEG" &&
        extension != ".jpeg" &&
        extension != ".PNG" &&
        extension != ".png"
      ) {
        const error = new CustomError(
          "Only images of type .jpg, .jpeg, .png are allowed."
        );
        error.status = 422;
        return next(error);
      }
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError(
        "The user is not found. Please refresh and try again"
      );
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    const healthcare = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({
      $and: [
        { _id: new ObjectId(req.params.healthcareID) },
        { client: userName },
      ],
    });

    if (!healthcare) {
      const error = new CustomError("You have no access to this healthcare");
      error.status = 403;
      return next(error);
    }

    const storage = getStorage().bucket("fyp-image");
    const fileNames = [];

    if (req.files.length != healthcare.requirements.length) {
      const error = new CustomError(
        "You have uploaded more than the required amount of images"
      );
      error.status = 404;
      return next(error);
    }

    for (let i = 0; i < req.files.length; i++) {
      const extension = path.extname(req.files[i].originalname);
      const fileName = uuidv4() + extension;
      fileNames.push(fileName);

      const filePath = os.tmpdir() + "/" + fileName;
      const buffer = Buffer.from(req.files[i].buffer);
      fs.createWriteStream(filePath).write(buffer, async (err: Error) => {
        if (err) {
          return next(err);
        } else {
          const upload = await storage.upload(filePath, {
            destination: fileName,
          });

          fs.unlink(filePath, async (err: Error) => {
            if (err) return next(err);
          });
        }
      });
    }

    res.status(200).send(fileNames);
    return next();
  }
);

fileRoutes.get(
  "/downloadFile",
  async (req: Request, res: Response, next: NextFunction) => {
    let docNames: string[] = [];
    if (req.query.docNames) {
      docNames = req.query.docNames as string[];
    } else {
      const error = new CustomError(
        "Document names not present in the request"
      );
      error.status = 400;
      return next(error);
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    let healthcareBelongsToUser = [];
    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (user) {
      if (user.type == "Therapist") {
        //Change this permission check to utilise only a single find()
        for (let i = 0; i < docNames.length; i++) {
          const permissionCheckTherapist = await (
            await client.connect("FYP", "Healthcares")
          ).findOne(
            {
              $or: [
                { client: user.forename + " " + user.surname },
                { therapist: user.forename + " " + user.surname },
              ],
            },
            {
              documents: { $elemMatch: { name: docNames[i] } },
            } as FindOptions<Document>
          );

          healthcareBelongsToUser.push(permissionCheckTherapist);
        }
        //This is the end of the inefficient loop

        //Testthe new approach here on a different variable and only console the resul to see if it will work

        //
      } else {
        //Change this permission check to utilise only a single find()
        for (let i = 0; i < docNames.length; i++) {
          const permissionCheckRehabilitator = await (
            await client.connect("FYP", "Healthcares")
          ).findOne(
            {
              $or: [
                { client: user.forename + " " + user.surname },
                { rehabilitator: user.forename + " " + user.surname },
              ],
            },
            {
              documents: { $elemMatch: { name: docNames[i] } },
            } as FindOptions<Document>
          );

          healthcareBelongsToUser.push(permissionCheckRehabilitator);
        }
        //This is the end of the inefficient loop

        //Testthe new approach here on a different variable and only console the resul to see if it will work

        //
      }
    } else {
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    let urls: string[] = [];
    if (healthcareBelongsToUser.length == docNames.length) {
      if (req.query.mode == "Professional") {
        const storage = getStorage().bucket("fyp-docs");

        const options = {
          version: "v4",
          action: "read",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };

        for (let i = 0; i < docNames.length; i++) {
          let fileName = docNames[i];
          const [url] = await storage.file(fileName).getSignedUrl(options);
          urls.push(url);
        }

        res.status(200).send(urls);
        return next();
      } else {
        const storage = getStorage().bucket("fyp-image");

        const options = {
          version: "v4",
          action: "read",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };

        for (let i = 0; i < docNames.length; i++) {
          let fileName = docNames[i];
          const [url] = await storage.file(fileName).getSignedUrl(options);
          urls.push(url);
        }

        res.status(200).send(urls);
        return next();
      }
    } else {
      const error = new CustomError("Problem with downloading the documents");
      error.status = 500;
      return next(error);
    }
  }
);

fileRoutes.post(
  "/uploadAvatar",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.files.length == 0) {
      return next();
    }

    if (req.files.length > 1) {
      const error = new CustomError("Only 1 file should be uploaded");
      error.status = 422;
      return next(error);
    }

    const { fieldname, originalname, encoding, mimetype, buffer } =
      req.files[0];
    const errors: string[] = [];

    for (let i = 0; i < req.files.length; i++) {
      const extension = path.extname(req.files[i].originalname);
      if (
        extension != ".JPG" &&
        extension != ".jpg" &&
        extension != ".JPEG" &&
        extension != ".jpeg" &&
        extension != ".PNG" &&
        extension != ".png"
      ) {
        const error = new CustomError(
          "Only images of type .jpg, .jpeg, .png are allowed."
        );
        error.status = 422;
        return next(error);
      }
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError(
        "The user is not found. Please refresh and try again"
      );
      error.status = 404;
      return next(error);
    }

    const storage = getStorage().bucket("fyp-avatars");
    let avatarName = "";

    for (let i = 0; i < req.files.length; i++) {
      const extension = path.extname(req.files[i].originalname);
      const fileName = uuidv4() + extension;
      avatarName = fileName;

      const filePath = os.tmpdir() + "/" + fileName;
      const buffer = Buffer.from(req.files[i].buffer);
      fs.createWriteStream(filePath).write(buffer, async (err: Error) => {
        if (err) {
          return next(err);
        } else {
          const upload = await storage.upload(filePath, {
            destination: fileName,
          });

          fs.unlink(filePath, async (err: Error) => {
            if (err) return next(err);
          });
        }
      });
    }

    res.status(200).send(avatarName);
    return next();
  }
);

fileRoutes.get(
  "/downloadAvatar",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.query.avatar === "") {
      return next();
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError(
        "The user is not found. Please refresh and try again"
      );
      error.status = 404;
      return next(error);
    }

    if (user.avatar != req.query.avatar) {
      const error = new CustomError("The user has no access to this item");
      error.status = 401;
      return next(error);
    }

    const storage = getStorage().bucket("fyp-avatars");

    const options = {
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await storage.file(req.query.avatar).getSignedUrl(options);

    if (!url) {
      res.status(204).send();
      return next();
    }

    res.status(200).send(url);
    return next();
  }
);

export default fileRoutes;
