import { NextFunction, Request, Response, Router } from "express";
import CustomError from "../models/CustomError";
import MongoConnection from "../models/mongoConnection";
import { v4 as uuidv4 } from "uuid";
import { Schedule } from "../types";

const validator = require("validator");

const scheduleRoutes = Router();

scheduleRoutes.get(
  "/gettherapistschedule",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.query.therapistID)) {
      errors.push("No therapist ID provided");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      return next(error);
    }

    const client = new MongoConnection();
    await client.init();

    if (client.error) {
      return next(client.error);
    }

    if (
      req.query.therapistID?.length == 0 ||
      typeof req.query.therapistID !== "string"
    ) {
      const error = new CustomError("Therapst ID not provided on the request");
      error.status = 422;
      return next(error);
    }

    const forename = req.query.therapistID.split(" ")[0];
    const surname = req.query.therapistID.split(" ")[1];
    const therapistName = forename + " " + surname;

    const schedule = await (
      await client.connect("FYP", "AppointmentsTherapists")
    )
      .find({ professional: therapistName })
      .toArray();

    if (schedule) {
      let formattedData: Schedule[] = [];
      schedule.map((item) => {
        if (item.status == "Set" || item.status == "Pending")
          formattedData.push({
            _id: uuidv4(),
            Subject: "",
            IsBlock: true,
            StartTime: item.StartTime,
            EndTime: item.EndTime,
          });
      });
      res.status(200).send(formattedData);
      return next();
    } else {
      res.status(204).send([]);
      return next();
    }
  }
);

scheduleRoutes.get(
  "/getrehabilitatorschedule",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.query.rehabilitatorID)) {
      errors.push("No rehabilitator ID provided");
    }

    if (errors.length > 0) {
      const error = new CustomError("Invalid input");
      error.data = errors;
      error.status = 422;
      res.status(422).send({ error: errors });
      return next();
    }

    const client = new MongoConnection();
    await client.init();

    if (client.error) {
      return next(client.error);
    }

    if (
      req.query.rehabilitatorID?.length == 0 ||
      typeof req.query.rehabilitatorID !== "string"
    ) {
      const error = new CustomError("Therapst ID not provided on the request");
      error.status = 422;
      return next(error);
    }

    const forename = req.query.rehabilitatorID.split(" ")[0];
    const surname = req.query.rehabilitatorID.split(" ")[1];
    const rehabilitatorName = forename + " " + surname;

    const schedule = await (
      await client.connect("FYP", "AppointmentsRehabilitator")
    )
      .find({ professional: rehabilitatorName })
      .toArray();

    if (schedule) {
      let formattedData: Schedule[] = [];
      schedule.map((item) => {
        formattedData.push({
          _id: uuidv4(),
          Subject: "",
          IsBlock: true,
          StartTime: item.StartTime,
          EndTime: item.EndTime,
        });
      });
      res.status(200).send(formattedData);
      return next();
    } else {
      res.status(204).send([]);
      return next();
    }
  }
);

scheduleRoutes.get(
  "/getpersonalscheduletherapist",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = new MongoConnection();
    await client.init();

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

    if (user.type != "Therapist") {
      const error = new CustomError(
        "User has no access to the requested data."
      );
      error.status = 403;
      return next(error);
    }

    const therapistName = user.forename + " " + user.surname;

    const personalSchedule = await (
      await client.connect("FYP", "AppointmentsTherapists")
    )
      .find({ professional: therapistName })
      .toArray();

    if (personalSchedule) {
      let formattedData: Schedule[] = [];
      personalSchedule.map((item) => {
        if (item.status == "Set" || item.status == "Pending")
          formattedData.push({
            _id: uuidv4(),
            Subject: therapistName,
            IsBlock: false,
            StartTime: item.StartTime,
            EndTime: item.EndTime,
          });
      });
      res.status(200).send(formattedData);
      return next();
    } else {
      res.status(204).send([]);
      return next();
    }
  }
);

scheduleRoutes.get(
  "/getpersonalschedulerehabilitator",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = new MongoConnection();
    await client.init();

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

    if (user.type != "Rehabilitator") {
      const error = new CustomError(
        "User has no access to the requested data."
      );
      error.status = 403;
      return next(error);
    }

    const rehabilitatorName = user.forename + " " + user.surname;

    const personalSchedule = await (
      await client.connect("FYP", "AppointmentsRehabilitator")
    )
      .find({ professional: rehabilitatorName })
      .toArray();

    if (personalSchedule) {
      let formattedData: Schedule[] = [];
      personalSchedule.map((item) => {
        if (item.status == "Set" || item.status == "Pending")
          formattedData.push({
            _id: uuidv4(),
            Subject: rehabilitatorName,
            IsBlock: false,
            StartTime: item.StartTime,
            EndTime: item.EndTime,
          });
      });
      res.status(200).send(formattedData);
      return next();
    } else {
      res.status(204).send([]);
      return next();
    }
  }
);

export default scheduleRoutes;
