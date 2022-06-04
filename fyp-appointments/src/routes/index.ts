import express, { NextFunction, Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import CustomError from "../models/CustomError";
import MongoConnection from "../models/mongoConnection";
import {
  Healthcare,
  RehabilitatorAppointment,
  TherapistAppointment,
} from "../types";
import dateInPast from "../util/dateInPast";

const validator = require("validator");

const appointmentRoutes = Router();

appointmentRoutes.post(
  "/createappointmenttherapist",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.body.professional)) {
      errors.push("No professional provided on request.");
    }
    if (validator.isEmpty(req.body.information)) {
      errors.push("No information provided on request.");
    }
    if (!req.body.StartTime) {
      errors.push("No appointment start time provided on request.");
    }
    if (!req.body.EndTime) {
      errors.push("No appointment end time provided on request.");
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

    const forename: string = req.body.professional.split(" ")[0];
    const surname: string = req.body.professional.split(" ")[1];

    const professional = await (
      await client.connect("FYP", "Users")
    ).findOne({
      $and: [{ forename: forename }, { surname: surname }],
    });

    if (!professional) {
      const error = new CustomError(
        "Professional doesn't match with any in the database"
      );
      error.status = 422;
      return next(error);
    }

    if (professional.type !== "Therapist") {
      const error = new CustomError("The chosen user is not a therapist.");
      error.status = 422;
      return next(error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError("Problem findings account's user");
      error.status = 404;
      return next(error);
    }
    const clientUserName = user.forename + " " + user.surname;
    const professionalUserName =
      professional.forename + " " + professional.surname;

    const data = await (await client.connect("FYP", "AppointmentsTherapists"))
      .find({ $and: [{ client: clientUserName }, { complete: false }] })
      .toArray();

    if (data) {
      for (let i = 0; i < data.length; i++) {
        if (
          dateInPast(data[i].StartTime) == false &&
          data[i].status != "Declined" &&
          data[i].complete == false
        ) {
          const error = new CustomError(
            "You already have a booked appointment with a therapist. Please attend the current appointment before booking another."
          );
          error.status = 422;
          return next(error);
        }
      }
    }

    const availabilityCheck = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).findOne({
      $and: [
        { professional: professionalUserName },
        { StartTime: req.body.StartTime },
        { $or: [{ status: "Set" }, { status: "Pending" }] },
      ],
    });

    if (availabilityCheck) {
      const error = new CustomError(
        "The chosen date and time is already taken, please refresh the page to update available slots or choose another date."
      );
      error.status = 422;
      return next(error);
    }

    if (
      professionalUserName === clientUserName ||
      user.type === "Therapist" ||
      user.type === "Rehabilitator"
    ) {
      const error = new CustomError(
        "A professional cannot book an appointment for themselves."
      );
      error.status = 422;
      return next(error);
    }

    const appointment: TherapistAppointment = {
      _id: new ObjectId(),
      client: clientUserName,
      professional: req.body.professional,
      information: req.body.information,
      StartTime: req.body.StartTime,
      EndTime: req.body.EndTime,
      status: "Pending",
      complete: false,
      date: new Date(),
    };

    const bookedAppointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).insertOne({ ...appointment, _id: appointment._id as ObjectId });

    res.status(200).send(bookedAppointment);
    return next();
  }
);

appointmentRoutes.post(
  "/createappointmentsrehabilitator",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.body.professional)) {
      errors.push("No professional provided on request.");
    }
    if (validator.isEmpty(req.body.healthcareID)) {
      errors.push("No professional provided on request.");
    }
    if (req.body.items.length == 0) {
      errors.push("No rehabilitator appointments provided on request.");
    }
    if (Object.keys(req.body.items).length > 6) {
      errors.push("The request Object has more attributes than expected");
    }

    for (let i = 0; i < req.body.items.length; i++) {
      if (req.body.items[i].hasOwnProperty("StartTime") == false) {
        errors.push("No property of StartTime on appointment");
      }
      if (req.body.items[i].hasOwnProperty("EndTime") == false) {
        errors.push("No property of EndTime on appointment");
      }
      if (req.body.items[i].hasOwnProperty("IsBlock") == false) {
        errors.push("No property of IsBlock on appointment");
      }
      if (req.body.items[i].hasOwnProperty("Id") == false) {
        errors.push("No property of id on appointment");
      }
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

    const forename = req.body.professional.split(" ")[0];
    const surname = req.body.professional.split(" ")[1];

    const professional = await (
      await client.connect("FYP", "Users")
    ).findOne({
      $and: [{ forename: forename }, { surname: surname }],
    });

    if (!professional) {
      const error = new CustomError(
        "Professional doesn't match with any in the database"
      );
      error.status = 422;
      return next(error);
    }

    const healthcare = await (
      await client.connect("FYP", "Healthcares")
    ).findOne({ _id: new ObjectId(req.body.healthcareID) });

    if (!healthcare) {
      const error = new CustomError("Problem finding healthcare");
      error.status = 404;
      return next(error);
    }
    if (healthcare.appointmentsRehabRequired != req.body.items.length) {
      const error = new CustomError(
        "Submitted amount of appointments is not equal to the required."
      );
      error.status = 422;
      return next(error);
    }

    const rehabilitatorName =
      professional.forename + " " + professional.surname;

    const rehabAppointments = await (
      await client.connect("FYP", "AppointmentsRehabilitator")
    )
      .find({ professional: rehabilitatorName })
      .toArray();

    if (rehabAppointments) {
      let takenAppointments: RehabilitatorAppointment[] = [];
      rehabAppointments.map(async (item, index) => {
        for (let i = 0; i < req.body.items.length; i++) {
          if (req.body.items[i].StartTime == item.StartTime) {
            takenAppointments.push(req.body.items[i]);
          }
        }
      });
      if (takenAppointments.length == 0) {
        req.body.items.map(async (item: any, index: number) => {
          req.body.items[index] = {
            ...item,
            professional: rehabilitatorName,
          };
        });

        const addedAppointments = await (
          await client.connect("FYP", "AppointmentsRehabilitator")
        ).insertMany(req.body.items);

        const appointmentsToHealthcare = await (
          await client.connect("FYP", "Healthcares")
        ).updateOne(
          { _id: new ObjectId(req.body.healthcareID) },
          {
            $set: {
              appointmentsRehabilitator: req.body.items,
              rehabilitator: rehabilitatorName,
            },
          }
        );

        res.status(200).send(appointmentsToHealthcare);
        return next();
      } else {
        const error = new CustomError(
          "Somebody already booked one or more of the desired slots. Please refresh the scheduler and try booking again."
        );
        error.status = 424;
        return next(error);
      }
    } else {
      req.body.items.map((item: any, index: number) => {
        req.body.items[index] = {
          ...item,
          professional: rehabilitatorName,
        };
      });
      const appointmentsToHealthcare = await (
        await client.connect("FYP", "Healthcares")
      ).updateOne(
        { _id: new ObjectId(req.body.healthcareID) },
        { $set: { appointmentsRehabilitator: req.body.items } }
      );

      res.status(200).send(appointmentsToHealthcare);
      return next();
    }

    return next();
  }
);

appointmentRoutes.get(
  "/getappointment",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.query.appointmentID)) {
      errors.push("No appointment ID provided.");
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

    const appointmentID: string = req.query.appointmentID as string;

    const appointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).findOne({ _id: new ObjectId(appointmentID) });

    if (appointment) {
      res.status(200).send(appointment);
      return next();
    }

    res.status(204).send();
    return next();
  }
);

appointmentRoutes.delete(
  "/cancelappointment",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.query.appointmentID)) {
      errors.push("No appointment ID provided.");
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
    const appointmentID: string = req.query.appointmentID as string;

    const appointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).findOne({ _id: new ObjectId(appointmentID) });

    if (!appointment) {
      const error = new CustomError(
        "The appointment has been cancelled or doesn't exist."
      );
      error.status = 404;
      return next(error);
    }

    const user = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!user) {
      const error = new CustomError("Problem findings account's user");
      error.status = 404;
      return next(error);
    }

    const userName = user.forename + " " + user.surname;

    if (appointment.client == userName) {
      const appointment = await (
        await client.connect("FYP", "AppointmentsTherapists")
      ).deleteOne({ _id: new ObjectId(appointmentID) });

      res.status(200).send(appointment);
      return next();
    } else {
      const error = new CustomError(
        "The user has no access to this appointment"
      );
      error.status = 403;
      return next(error);
    }
  }
);

appointmentRoutes.post(
  "/acceptappointmenttherapist",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.body.appointmentID)) {
      errors.push("No appointment ID provided.");
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

    const target = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).updateOne(
      { _id: new ObjectId(req.body.appointmentID) },
      { $set: { status: "Set" } }
    );

    const data = await (await client.connect("FYP", "AppointmentsTherapists"))
      .find()
      .toArray();

    if (data) {
      const appointments = data.map((item) => {
        if (!dateInPast(item.endTime) && item.complete == false) {
          return {
            ...item,
            _id: item._id.toString(),
          };
        }
      });
      res.status(200).send(appointments.filter((n) => n));
      return next();
    } else {
      res.status(204).send();
      return next();
    }
  }
);

appointmentRoutes.post(
  "/declineappointmenttherapist",
  async (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (validator.isEmpty(req.body.appointmentID)) {
      errors.push("No appointment ID provided.");
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

    const declinedAppointment = await (
      await client.connect("FYP", "AppointmentsTherapists")
    ).updateOne(
      { _id: new ObjectId(req.body.appointmentID) },
      { $set: { status: "Declined" } }
    );

    if (declinedAppointment.modifiedCount == 0) {
      const error = new CustomError("Problem locating the appointment");
      error.status = 404;
      return next(error);
    }

    const updatedAppointments = await (
      await client.connect("FYP", "AppointmentsTherapists")
    )
      .find()
      .toArray();

    if (updatedAppointments) {
      const appointments = updatedAppointments.map((item) => {
        if (!dateInPast(item.endTime) && item.complete == false) {
          return {
            ...item,
            _id: item._id.toString(),
          };
        }
      });
      res.status(200).send(appointments.filter((n) => n));
      return next();
    } else {
      res.status(204).send();
      return next();
    }
  }
);

appointmentRoutes.get(
  "/getappointments",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = new MongoConnection();
    await client.init();

    if (client.error) {
      return next(client.error);
    }

    const userCheck = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!userCheck) {
      const error = new CustomError("Problem findings account's user");
      error.status = 404;
      return next(error);
    }

    if (userCheck.type != "Therapist") {
      const error = new CustomError("Access Denied");
      error.status = 403;
      return next(error);
    }

    const userName = userCheck.forename + " " + userCheck.surname;

    const appointments = await (
      await client.connect("FYP", "AppointmentsTherapists")
    )
      .find()
      .toArray();

    if (appointments) {
      const refinedAppointments = appointments.map((item) => {
        if (!dateInPast(item.endTime) && item.complete == false) {
          return {
            ...item,
            _id: item._id.toString(),
          };
        }
      });

      res.status(200).send(refinedAppointments.filter((n) => n));
      return next();
    } else {
      res.status(204).send();
      return next();
    }
  }
);

appointmentRoutes.get(
  "/getpersonalactivity",
  async (req: Request, res: Response, next: NextFunction) => {
    const client = new MongoConnection();
    await client.init();

    if (client.error) {
      return next(client.error);
    }

    let allData: (Healthcare | TherapistAppointment)[] = [];

    const userCheck = await (
      await client.connect("FYP", "Users")
    ).findOne({ _id: res.locals.uid });

    if (!userCheck) {
      const error = new CustomError("Problem findings account's user");
      error.status = 404;
      return next(error);
    }

    const userName = userCheck.forename + " " + userCheck.surname;

    const therapistAppointments: object[] = await (
      await client.connect("FYP", "AppointmentsTherapists")
    )
      .find({ client: userName, complete: false })
      .toArray();

    if (therapistAppointments) {
      therapistAppointments.map((item: any) => {
        allData.push({
          ...item,
          _id: item._id.toString(),
          type: "appointment",
        });
      });
    }

    const healthcares = await (await client.connect("FYP", "Healthcares"))
      .find({ client: userName })
      .toArray();

    if (healthcares) {
      healthcares.map((item: any) => {
        allData.push({
          ...item,
          _id: item._id.toString(),
          type: "healthcare",
        });
      });
    }

    res.status(200).send(allData);
    return next();
  }
);

export default appointmentRoutes;
