import { NextFunction, Request, Response, Router } from "express";
import { FindOptions, ObjectId } from "mongodb";
import CustomError from "../models/CustomError";
import MongoConnection from "../models/mongoConnection";
import { Healthcare } from "../types";

const validator = require("validator");

const healthcareRoutes = Router();

healthcareRoutes.post(
  "/createhealthcare",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (!req.body.appointment) {
      errors.push("No appointment id attached to the request.");
    }
    if (validator.isEmpty(req.body.diagnosis)) {
      errors.push("No diagnosis provided on request.");
    }
    if (
      req.body.appointmentsRehabRequired < 1 ||
      req.body.appointmentsRehabRequired > 10
    ) {
      errors.push("Wrong rehabilitator appointment amount provided.");
    }
    if (req.body.documents.length > 10) {
      errors.push("Documents in the request exceed 10.");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      res.status(422).send({ error: errors });
      return next();
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const appointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).findOne({ _id: new ObjectId(req.body.appointment) });

    if (!appointment) {
      const error = new CustomError(
        "No appointment found as the provided in the request. Please refresh and try again."
      );
      error.status = 404;
      return next(error);
    }

    const finishAppointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).updateOne(
      { _id: new ObjectId(req.body.appointment) },
      { $set: { complete: true } }
    );

    const reqs = req.body.requirements;

    const healthcare: Healthcare = {
      _id: new ObjectId(),
      diagnosis: req.body.diagnosis,
      rehabilitator: "",
      complete: false,
      appointmentsRehabRequired: req.body.appointmentsRehabRequired,
      documents: req.body.documents,
      clientDocs: [],
      appointmentsRehabilitator: [],
      appointmentTherapist: req.body.appointment,
      initialisationDate: new Date(),
      requirements: reqs,
      therapistRequirement: false,
      client: appointment.client,
      therapist: appointment.professional,
      information: appointment.information,
    };

    const createdHealthcare = await (
      await client.connect("FYP", "Healthcares")
    ).insertOne({ ...healthcare });

    res.status(200).send(createdHealthcare);
    return next();
  }
);

healthcareRoutes.get(
  "/gethealthcare",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    let healthcareID: string = "";

    if (typeof req.query.healthcareID !== "string") {
      const error = new CustomError("Healthcare ID is not string");
      error.status = 422;
      return next(error);
    }

    if (req.query.healthcareID.length == 0) {
      const error = new CustomError("No healthcare ID provided on request");
      error.status = 422;
      return next(error);
    }

    if (validator.isEmpty(req.query.healthcareID)) {
      errors.push("No healthcare ID provided on the request.");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      return next(error);
    }

    healthcareID = req.query.healthcareID;

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const healthcare = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(healthcareID) });

    if (!healthcare) {
      const error = new CustomError("Healthcare not found");
      error.status = 404;
      return next(error);
    }

    const healthcareAppointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).findOne({
      _id: new ObjectId(healthcare.appointmentTherapist),
    });

    if (!healthcareAppointment) {
      const error = new CustomError("Healthcare not found");
      error.status = 404;
      return next(error);
    }

    res.status(200).send({
      ...healthcare,
      appointmentTherapist: { ...healthcareAppointment },
    });
    return next();
  }
);

healthcareRoutes.get(
  "/listhealthcares",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = req.db;

    if (client.error) {
      return next(client.error);
    }
    const userCheck = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!userCheck) {
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    const userName = userCheck.forename + " " + userCheck.surname;

    const healthcares = await (await client.connect("FYP", "Healthcares"))
      .find({ $or: [{ therapist: userName }, { rehabilitator: userName }] })
      .toArray();

    if (healthcares) {
      const refinedHealthcares = healthcares.map((item) => {
        return {
          ...item,
          _id: item._id.toString(),
        };
      });
      res.status(200).send(refinedHealthcares);
      return next();
    } else {
      res.status(204).send();
      return next();
    }
  }
);

healthcareRoutes.post(
  "/clienthealthcaredocuments",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.body.healthcareID)) {
      errors.push("No healthcare ID provided on the request.");
    }
    if (!req.body.fileDocs || req.body.fileDocs.length < 1) {
      errors.push("No file names provided on the request.");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      return next(error);
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    const healthcare = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(req.body.healthcareID) }, {
      client: userName,
    } as FindOptions<Document>);

    if (!healthcare) {
      const error = new CustomError("No access to the chosen healthcare");
      error.status = 404;
      return next(error);
    }

    let refinedDocs = [];

    for (let i = 0; i < healthcare.clientDocs.length; i++) {
      refinedDocs.push(healthcare.clientDocs[i]);
    }

    for (let i = 0; i < req.body.fileDocs.length; i++) {
      refinedDocs.push(req.body.fileDocs[i]);
    }

    const updatedHealthcare = await (
      await client.connect("FYP", "Healthcares")
    ).updateOne(
      { _id: new ObjectId(req.body.healthcareID) },
      {
        $set: {
          therapistRequirement: true,
          clientDocs: refinedDocs,
          requirements: [],
        },
      }
    );

    if (!updatedHealthcare) {
      const error = new CustomError("No such healthcare found");
      error.status = 404;
      return next(error);
    }
    res.status(200).send(updatedHealthcare);
    return next();
  }
);

healthcareRoutes.post(
  "/healthcareupdate",
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.mode.length == 0 || typeof req.body.mode !== "string") {
      const error = new CustomError("Request mode not provided");
      error.status = 422;
      return next(error);
    }
    if (validator.isEmpty(req.body.healthcareID)) {
      const error = new CustomError("No healthcare ID provided.");
      error.status = 422;
      return next(error);
    }
    if (validator.isEmpty(req.body.mode)) {
      const error = new CustomError("No mode provided.");
      error.status = 422;
      return next(error);
    }
    if (req.body.mode == "requirements") {
      if (req.body.requirements.length == 0) {
        const error = new CustomError("No requirements provided.");
        error.status = 422;
        return next(error);
      }
    }
    if (req.body.mode == "documents") {
      if (req.body.fileDocs.length == 0) {
        const error = new CustomError("No documents provided.");
        error.status = 422;
        return next(error);
      }
    }
    if (req.body.mode == "mixed") {
      if (req.body.fileDocs.length == 0 || req.body.requirements.length == 0) {
        const error = new CustomError(
          "Either documents or requirements are missing."
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
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    const permissionCheck = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(req.body.healthcareID) }, {
      $or: [{ therapist: userName }, { rehabilitator: userName }],
    } as FindOptions<Document>);

    if (!permissionCheck) {
      const error = new CustomError("No access to the requested data.");
      error.status = 403;
      return next(error);
    }

    let newDocuments = [];
    for (let i = 0; i < permissionCheck.documents.length; i++) {
      newDocuments.push(permissionCheck.documents[i]);
    }
    for (let i = 0; i < req.body.fileDocs.length; i++) {
      newDocuments.push(req.body.fileDocs[i]);
    }

    let newReqs = [];

    for (let i = 0; i < req.body.requirements.length; i++) {
      newReqs.push(req.body.requirements[i]);
    }

    for (let i = 0; i < permissionCheck.requirements.length; i++) {
      newReqs.push(permissionCheck.requirements[i]);
    }

    if (req.body.mode == "requirements") {
      const requirementsUpdate = await (
        await client.connect("FYP", "Healthcares")
      ).updateOne(
        { _id: new ObjectId(req.body.healthcareID) },
        { $set: { requirements: newReqs } }
      );

      if (requirementsUpdate) {
        res.status(200).send(requirementsUpdate);
        return next();
      }
    }
    if (req.body.mode == "documents") {
      const documentUpdate = await (
        await client.connect("FYP", "Healthcares")
      ).updateOne(
        { _id: new ObjectId(req.body.healthcareID) },
        { $set: { documents: newDocuments } }
      );

      if (documentUpdate) {
        res.status(200).send(documentUpdate);
        return next();
      }
    }
    if (req.body.mode == "mixed") {
      const mixedUpdate = await (
        await client.connect("FYP", "Healthcares")
      ).updateOne(
        { _id: new ObjectId(req.body.healthcareID) },
        { $set: { documents: newDocuments, requirements: newReqs } }
      );

      if (mixedUpdate) {
        res.status(200).send(mixedUpdate);
        return next();
      }
    }

    return next();
  }
);

healthcareRoutes.post(
  "/confirmchanges",
  async (req: Request, res: Response, next: NextFunction) => {
    if (validator.isEmpty(req.body.healthcareID)) {
      const error = new CustomError("No healthcare ID provided on the request");
      error.status = 422;
      return next(error);
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    const permissionCheck = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(req.body.healthcareID) }, {
      therapist: userName,
    } as FindOptions<Document>);

    if (!permissionCheck) {
      const error = new CustomError("No access to the requested resources.");
      error.status = 422;
      return next(error);
    }

    const updatedHealthcare = await (
      await client.connect("FYP", "Healthcares")
    ).updateOne(
      { _id: new ObjectId(req.body.healthcareID) },
      { $set: { therapistRequirement: false } }
    );

    if (updatedHealthcare.modifiedCount == 0) {
      const error = new CustomError(
        "Nothing has been changed, confirmation was unsuccessful"
      );
      error.status = 400;
      return next(error);
    }

    res.status(200).send(updatedHealthcare);
    return next();
  }
);

healthcareRoutes.post(
  "/completehealthcare",
  async (req: Request, res: Response, next: NextFunction) => {
    if (validator.isEmpty(req.body.healthcareID)) {
      const error = new CustomError("No healthcare ID provided on the request");
      error.status = 422;
      return next(error);
    }

    const client = req.db;

    if (client.error) {
      return next(client.error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError("Problem finding user");
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    const permissionCheck = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(req.body.healthcareID) }, {
      therapist: userName,
    } as FindOptions<Document>);

    if (!permissionCheck) {
      const error = new CustomError("No access to the requested resources.");
      error.status = 422;
      return next(error);
    }

    const updatedHealthcare = await (
      await client.connect("FYP", "Healthcares")
    ).updateOne(
      { _id: new ObjectId(req.body.healthcareID) },
      { $set: { complete: true } }
    );

    if (updatedHealthcare.modifiedCount == 0) {
      const error = new CustomError(
        "Nothing has been changed, completion was unsuccessful"
      );
      error.status = 400;
      return next(error);
    }

    res.status(200).send(updatedHealthcare);
    return next();
  }
);

export default healthcareRoutes;
