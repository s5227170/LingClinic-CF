const cors = require("cors");
const express = require("express");

const mongodb = require("mongodb");
const validator = require("validator");
const fileMiddleware = require("express-multipart-file-parser");

const middleware = require("./middleware");

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

app.post("/createhealthcare", async (req, res, next) => {
  const errors = [];

  if (!req.body.appointment) {
    errors.push({ message: "No appointment id attached to the request." });
  }
  if (validator.isEmpty(req.body.diagnosis)) {
    errors.push({ message: "No diagnosis provided on request." });
  }
  if (
    req.body.appointmentsRehabRequired < 1 ||
    req.body.appointmentsRehabRequired > 10
  ) {
    errors.push({
      message: "Wrong rehabilitator appointment amount provided."
    });
  }
  if (req.body.documents.length > 10) {
    errors.push({ message: "Documents in the request exceed 10." });
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
        .findOne({ _id: new mongodb.ObjectId(req.body.appointment) });

      if (!appointment) {
        const error = new Error("No appointment found as the provided in the request. Please refresh and try again.")
        error.code = 404
        return next(error)
      }

      const finishAppointment = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .updateOne(
          { _id: new mongodb.ObjectId(req.body.appointment) },
          { $set: { complete: true } }
        );

      const reqs = req.body.requirements

      const healthcare = {
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
        information: appointment.information
      };

      const createdHealthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .insertOne({ ...healthcare });

      res.status(200).send(createdHealthcare);
      return next();
    }
  );
});

app.get("/gethealthcare", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.query.healthcareID)) {
    errors.push({ message: "No healthcare ID provided on the request." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next(error);
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

      const healthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.query.healthcareID) });

      const healthcareAppointment = await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .findOne({
          _id: new mongodb.ObjectId(healthcare.appointmentTherapist)
        });


      if (healthcareAppointment) {
        res
          .status(200)
          .send({
            ...healthcare,
            appointmentTherapist: { ...healthcareAppointment }
          });
        return next();
      }
      res.status(404).send({ message: "No such healthcare found." })
      return next()

    }
  );
});

app.get("/listhealthcares", async (req, res, next) => {
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
      const userName = userCheck.forename + " " + userCheck.surname;

      client
        .db("FYP")
        .collection("Healthcares")
        .find({ $or: [{ therapist: userName }, { rehabilitator: userName }] })
        .toArray()
        .then(data => {
          if (data) {
            const healthcares = data.map(item => {
              return {
                ...item,
                _id: item._id.toString()
              }
            });
            res.status(200).send(healthcares);
            return next();

          } else {
            res.status(200).send("No orders found");
            return next();

          }
        });
    }
  );
})

app.post("/clienthealthcaredocuments", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.body.healthcareID)) {
    errors.push({ message: "No healthcare ID provided on the request." })
  }
  if (!req.body.fileDocs || req.body.fileDocs.length < 1) {
    errors.push({ message: "No file names provided on the request." })
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next(error);
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

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      userName = user.forename + " " + user.surname;

      const healthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { client: userName });

      if (!healthcare) {
        const error = new Error("No access to the chosen healthcare")
        error.status = 404
        return next(error)
      }

      let refinedDocs = []

      for (let i = 0; i < healthcare.clientDocs.length; i++) {
        refinedDocs.push(healthcare.clientDocs[i])
      }

      for (let i = 0; i < req.body.fileDocs.length; i++) {
        refinedDocs.push(req.body.fileDocs[i])
      }

      const updatedHealthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { $set: { therapistRequirement: true, clientDocs: refinedDocs, requirements: [] } })

      if (updatedHealthcare) {
        res.status(200).send(updatedHealthcare);
        return next();

      }

      const error = new Error("No such healthcare found")
      error.status = 404
      return next(error)

    }
  );
})

app.post("/healthcareupdate", async (req, res, next) => {

  if (validator.isEmpty(req.body.healthcareID)) {
    const error = new Error("No healthcare ID provided.");
    error.status = 422;
    return next(error)
  }
  if (validator.isEmpty(req.body.mode)) {
    const error = new Error("No mode provided.");
    error.status = 422;
    return next(error)
  }
  if (req.body.mode == "requirements") {
    if (req.body.requirements.length == 0) {
      const error = new Error("No requirements provided.");
      error.status = 422;
      return next(error)
    }
  }
  if (req.body.mode == "documents") {
    if (req.body.fileDocs.length == 0) {
      const error = new Error("No documents provided.");
      error.status = 422;
      return next(error)
    }
  }
  if (req.body.mode == "mixed") {
    if (req.body.fileDocs.length == 0 || req.body.requirements.length == 0) {
      const error = new Error("Either documents or requirements are missing.");
      error.status = 422;
      return next(error)
    }
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

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      const userName = user.forename + " " + user.surname;

      const permissionCheck = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { $or: [{ therapist: userName }, { rehabilitator: userName }] })

      if (!permissionCheck) {
        const error = new Error("No access to the requested data.");
        error.status = 403;
        return next(error)
      }

      let newDocuments = [];
      for (let i = 0; i < permissionCheck.documents.length; i++) {
        newDocuments.push(permissionCheck.documents[i])
      }
      for (let i = 0; i < req.body.fileDocs.length; i++) {
        newDocuments.push(req.body.fileDocs[i])
      }

      let newReqs = [];

      for (let i = 0; i < req.body.requirements.length; i++) {
        newReqs.push(req.body.requirements[i])
      }

      for (let i = 0; i < permissionCheck.requirements.length; i++) {
        newReqs.push(req.body.requirements[i])
      }

      if (req.body.mode == "requirements") {
        const requirementsUpdate = await client
          .db("FYP")
          .collection("Healthcares")
          .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) },
            { $set: { requirements: newReqs } })

        if (requirementsUpdate) {
          res.status(200).send(requirementsUpdate)
          return next()
        }

      }
      if (req.body.mode == "documents") {
        const documentUpdate = await client
          .db("FYP")
          .collection("Healthcares")
          .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) },
            { $set: { documents: newDocuments } })

        if (documentUpdate) {
          res.status(200).send(documentUpdate)
          return next()
        }
      }
      if (req.body.mode == "mixed") {
        const mixedUpdate = await client
          .db("FYP")
          .collection("Healthcares")
          .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) },
            { $set: { documents: newDocuments, requirements: newReqs } })

        if (mixedUpdate) {
          res.status(200).send(mixedUpdate)
          return next()
        }
      }

      return next()

    }
  );

})

app.post("/confirmchanges", async (req, res, next) => {

  if (validator.isEmpty(req.body.healthcareID)) {
    const error = new Error("No healthcare ID provided on the request")
    error.status = 422
    return next(error)
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

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      const userName = user.forename + " " + user.surname;

      const permissionCheck = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { therapist: userName })

      if (!permissionCheck) {
        const error = new Error("No access to the requested resources.")
        error.status = 422
        return next(error)
      }


      const updatedHealthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { $set: { therapistRequirement: false } })

      if (updatedHealthcare) {
        res.status(200).send(updatedHealthcare)
      }

      return next()

    }
  );
})

app.post("/completehealthcare", async (req, res, next) => {
  if (validator.isEmpty(req.body.healthcareID)) {
    const error = new Error("No healthcare ID provided on the request")
    error.status = 422
    return next(error)
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

      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      const userName = user.forename + " " + user.surname;

      const permissionCheck = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { therapist: userName })

      if (!permissionCheck) {
        const error = new Error("No access to the requested resources.")
        error.status = 422
        return next(error)
      }

      const updatedHealthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .updateOne({ _id: new mongodb.ObjectId(req.body.healthcareID) }, { $set: { complete: true } })

      if (updatedHealthcare) {
        res.status(200).send(updatedHealthcare)
      }

      return next()

    }
  );
})

app.use((error, req, res, next) => {

  res.status(error.status || 500);
  res.json({
    message: error.message
  })
})

app.listen(3003);

exports.healthcares = app;
