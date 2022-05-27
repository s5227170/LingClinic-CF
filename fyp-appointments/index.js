const cors = require("cors");
const express = require("express");

const mongodb = require("mongodb");
const validator = require("validator");
const fileMiddleware = require("express-multipart-file-parser");

const middleware = require("./middleware");
const dateInPast = require("./util/dateInPast");

ObjectId = require("mongodb").ObjectId;

require('dotenv-flow').config();

const app = express();
const MongoClient = mongodb.MongoClient;

var corsOptions = {}

if (process.env.NODE_ENV == "production") {
  corsOptions.credentials = true
  corsOptions.origin = "https://final-year-project-82049.ew.r.appspot.com"
} else {
  corsOptions.origin = "*"
}

app.use(
  cors(corsOptions)
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileMiddleware);

app.use(middleware.decodeToken);

app.post("/createappointmenttherapist", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.body.professional)) {
    errors.push({ message: "No professional provided on request." });
  }
  if (validator.isEmpty(req.body.information)) {
    errors.push({ message: "No information provided on request." });
  }
  if (!req.body.StartTime) {
    errors.push({ message: "No appointment start time provided on request." });
  }
  if (!req.body.EndTime) {
    errors.push({ message: "No appointment end time provided on request." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 422
        return next(error)
      }

      const forename = req.body.professional.split(" ")[0];
      const surname = req.body.professional.split(" ")[1];
      const professional = await client
        .db("FYP")
        .collection("Users")
        .findOne({ forename: forename }, { surname: surname });

      if (!professional) {
        const error = new Error("Professional doesn't match with any in the database")
        error.code = 422
        return next(error)
      }

      if (professional.type != "Therapist") {
        const error = new Error("The chosen user is not a therapist.")
        error.code = 422
        return next(error)
      }

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid });

      const clientUserName = user.forename + " " + user.surname;
      const professionalUserName = professional.forename + " " + professional.surname

      let data = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find({ client: clientUserName }, { complete: false })
        .toArray()

      if (data) {
        for (let i = 0; i < data.length; i++) {
          if (dateInPast(data[i].StartTime) == false && data[i].status != "Declined" && data[i].complete == false) {
            const error = new Error("You already have a booked appointment with a therapist. Please attend the current appointment before booking another.")
            error.status = 422
            return next(error)
          }
        }
      }

      const availabilityCheck = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .findOne({ $and: [{ professional: professionalUserName }, { StartTime: req.body.StartTime }, { $or: [{ status: "Set" }, { status: "Pending" }] }] })

      console.log(availabilityCheck)
      if (availabilityCheck) {
        const error = new Error("The chosen date and time is already taken, please refresh the page to update available slots or choose another date.")
        error.status = 422
        return next(error)
      }

      if (professionalUserName == clientUserName || user.type == "Therapist" || user.type == "Rehabilitator") {
        const error = new Error("A professional cannot book an appointment for themselves.")
        error.code = 422
        return next(error)
      }

      const appointment = {
        client: clientUserName,
        professional: req.body.professional,
        information: req.body.information,
        StartTime: req.body.StartTime,
        EndTime: req.body.EndTime,
        status: "Pending",
        complete: false,
        date: new Date()
      };

      const createdAppointment = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .insertOne({ ...appointment });

      res.status(200).send(createdAppointment);
      return next();
    }
  );
});

app.post("/createappointmentsrehabilitator", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.body.professional)) {
    errors.push({ message: "No professional provided on request." });
  }
  if (validator.isEmpty(req.body.healthcareID)) {
    errors.push({ message: "No professional provided on request." });
  }
  if (req.body.items.length == 0) {
    errors.push({
      message: "No rehabilitator appointments provided on request."
    });
  }
  if (Object.keys(req.body.items).length > 6) {
    errors.push({
      message: "The request Object hsa more attributes than expected"
    });
  }


  for (let i = 0; i < req.body.items.length; i++) {
    if (req.body.items[i].hasOwnProperty("StartTime") == false) {
      errors.push({ message: "No property of StartTime on appointment" });
    }
    if (req.body.items[i].hasOwnProperty("EndTime") == false) {
      errors.push({ message: "No property of EndTime on appointment" });
    }
    if (req.body.items[i].hasOwnProperty("IsBlock") == false) {
      errors.push({ message: "No property of IsBlock on appointment" });
    }
    if (req.body.items[i].hasOwnProperty("Id") == false) {
      errors.push({ message: "No property of id on appointment" });
    }
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      const forename = req.body.professional.split(" ")[0];
      const surname = req.body.professional.split(" ")[1];

      const professional = await client
        .db("FYP")
        .collection("Users")
        .findOne({ forename: forename }, { surname: surname });
      if (!professional) {
        res
          .status(422)
          .send("Professional doesn't match with any in the database.");
        next();
      }

      const healthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.body.healthcareID) });

      if (healthcare.appointmentsRehabRequired != req.body.items.length) {
        res
          .status(200)
          .send({
            message:
              "Submitted amount of appointments is not equal to the required."
          });
        return next();
      }

      const rehabilitatorName =
        professional.forename + " " + professional.surname;

      const rehabAppointments = await client
        .db("FYP")
        .collection("AppointmentsRehabilitator")
        .find({ professional: rehabilitatorName })
        .toArray()


      if (rehabAppointments) {
        let takenAppointments = [];
        rehabAppointments.map(async (item, index) => {
          for (let i = 0; i < req.body.items.length; i++) {
            if (req.body.items[i].StartTime == item.StartTime) {
              takenAppointments.push(req.body.items[i]);
            }
          }
        });
        if (takenAppointments.length == 0) {
          req.body.items.map(async (item, index) => {
            req.body.items[index] = {
              ...item,
              professional: rehabilitatorName
            };
          });

          const addedAppointments = await client
            .db("FYP")
            .collection("AppointmentsRehabilitator")
            .insertMany(req.body.items)


          const appointmentsToHealthcare = await client
            .db("FYP")
            .collection("Healthcares")
            .updateOne(
              { _id: new mongodb.ObjectId(req.body.healthcareID) },
              { $set: { appointmentsRehabilitator: req.body.items, rehabilitator: rehabilitatorName } }
            );

          res.status(200).send(appointmentsToHealthcare);
          return next();
        } else {
          res.status(424).send({ error: { message: "Somebody already booked one or more of the desired slots. Please refresh the scheduler and try booking again." } })
        }
      } else {
        req.body.items.map((item, index) => {
          req.body.items[index] = {
            ...item,
            professional: rehabilitatorName
          };
        });
        const appointmentsToHealthcare = await client
          .db("FYP")
          .collection("Healthcares")
          .updateOne(
            { _id: new mongodb.ObjectId(req.body.healthcareID) },
            { $set: { appointmentsRehabilitator: req.body.items } }
          );

        res.status(200).send(appointmentsToHealthcare);
        return next();
      }
    });
});

app.get("/getappointment", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.query.appointmentID)) {
    errors.push({ message: "No appointment ID provided." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      const appointment = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .findOne({ _id: new mongodb.ObjectId(req.query.appointmentID) });

      if (appointment) {
        res.status(200).send(appointment);
        return next();
      }

      res.status(404).send("No appointment found");
      return next();
    }
  );
});

app.delete("/cancelAppointment", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.query.appointmentID)) {
    errors.push({ message: "No appointment ID provided." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      const appointment = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .findOne({ _id: new mongodb.ObjectId(req.query.appointmentID) })

      if (!appointment) {
        const error = new Error("The appointment has been cancelled or doesn't exist.")
        error.code = 404
        return next(error)
      }

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      const userName = user.forename + " " + user.surname;

      if (appointment.client == userName) {
        const appointment = await client
          .db("FYP")
          .collection("AppointmentsTherapists")
          .deleteOne({ _id: new mongodb.ObjectId(req.query.appointmentID) })

        res.status(200).send(appointment);
        return next();
      } else {
        const error = new Error("The user has no access to this appointment")
        error.code = 403
        return next(error)
      }

    }
  );


})

app.post("/acceptappointmenttherapist", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.body.appointmentID)) {
    errors.push({ message: "No appointment ID provided." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      const target = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .updateOne(
          { _id: new mongodb.ObjectId(req.body.appointmentID) },
          { $set: { status: "Set" } }
        );

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find()
        .toArray()
        .then(data => {
          if (data) {
            const appointments = data.map(item => {
              if (!dateInPast(item.endTime) && item.complete == false) {
                return {
                  ...item,
                  _id: item._id.toString()
                };
              }
            });
            res.status(200).send(appointments.filter(n => n));
            return next();
          } else {
            res.status(200).send("No appointments found");
            return next();
          }
        });
    }
  );
});

app.post("/declineappointmenttherapist", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.body.appointmentID)) {
    errors.push({ message: "No appointment ID provided." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .updateOne(
          { _id: new mongodb.ObjectId(req.body.appointmentID) },
          { $set: { status: "Declined" } }
        );

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find()
        .toArray()
        .then(data => {
          if (data) {
            const appointments = data.map(item => {
              if (!dateInPast(item.endTime) && item.complete == false) {
                return {
                  ...item,
                  _id: item._id.toString()
                };
              }
            });
            res.status(200).send(appointments.filter(n => n));
            return next();
          } else {
            res.status(200).send("No appointments found");
            return next();
          }
        });
    }
  );
});

app.get("/getappointments", async (req, res, next) => {
  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      const userCheck = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid });
      if (userCheck.type != "Therapist") {
        res.status(403).send("Access Denied");
        return next();
      }

      const userName = userCheck.forename + " " + userCheck.surname;

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find({ professional: userName })
        .toArray()
        .then(data => {
          if (data) {
            const appointments = data.map(item => {
              if (!dateInPast(item.endTime) && item.complete == false) {
                return {
                  ...item,
                  _id: item._id.toString()
                };
              }
            });

            res.status(200).send(appointments.filter(n => n));
            return next();
          } else {
            res.status(404).send("No appointments found");
            return next();
          }
        });
    }
  );
});

app.get("/getpersonalactivity", async (req, res, next) => {
  MongoClient.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    async (err, client) => {
      if (err) {
        const error = new Error("Failed connection")
        error.code = 500
        return next(error)
      }

      let allData = [];

      const userCheck = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid });
      const userName = userCheck.forename + " " + userCheck.surname;

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find({ client: userName, complete: false })
        .toArray()
        .then(data => {
          if (data) {
            data.map(item => {
              allData.push({
                ...item,
                _id: item._id.toString(),
                type: "appointment"
              });
            });
          }
        });

      await client
        .db("FYP")
        .collection("Healthcares")
        .find({ client: userName })
        .toArray()
        .then(data => {
          if (data) {
            data.map(item => {
              allData.push({
                ...item,
                _id: item._id.toString(),
                type: "healthcare"
              });
            });
          }
        });

      res.status(200).send(allData);
      return next();
    }
  );
});

app.use((error, req, res, next) => {

  res.status(error.status || 500);
  res.json({
    message: error.message
  })
})

app.listen(3004);

exports.appointments = app;
