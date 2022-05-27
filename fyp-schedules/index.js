const cors = require("cors");
const express = require("express");

const mongodb = require("mongodb");
const validator = require("validator");
const fileMiddleware = require("express-multipart-file-parser");
const { v4: uuidv4 } = require("uuid");

const middleware = require("./middleware");

ObjectId = require("mongodb").ObjectId;

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

app.get("/gettherapistschedule", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.query.therapistID)) {
    errors.push({ message: "No therapist ID provided" });
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

      const forename = req.query.therapistID.split(" ")[0];
      const surname = req.query.therapistID.split(" ")[1];
      const therapistName = forename + " " + surname;

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find({ professional: therapistName })
        .toArray()
        .then(data => {
          let formattedData = [];
          if (data) {
            data.map(item => {
              if (item.status == "Set" || item.status == "Pending")
                formattedData.push({
                  id: uuidv4(),
                  Subject: "",
                  IsBlock: true,
                  StartTime: item.StartTime,
                  EndTime: item.EndTime
                });
            });

            res.status(200).send(formattedData);
            return next();
          } else {
            res.status(404).send("No appointments found");
            return next();
          }
        });
    }
  );
});

app.get("/getrehabilitatorschedule", async (req, res, next) => {
  const errors = [];

  if (validator.isEmpty(req.query.rehabilitatorID)) {
    errors.push({ message: "No rehabilitator ID provided" });
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

      const forename = req.query.rehabilitatorID.split(" ")[0];
      const surname = req.query.rehabilitatorID.split(" ")[1];
      const rehabilitatorName = forename + " " + surname;

      await client
        .db("FYP")
        .collection("AppointmentsRehabilitator")
        .find({ professional: rehabilitatorName })
        .toArray()
        .then(data => {
          let formattedData = [];
          if (data) {
            data.map(item => {
              formattedData.push({
                id: uuidv4(),
                Subject: "",
                IsBlock: true,
                StartTime: item.StartTime,
                EndTime: item.EndTime
              });
            });

            res.status(200).send(formattedData);
            return next();
          } else {
            res.status(404).send("No appointments found");
            return next();
          }
        });
    }
  );
});

app.get("/getpersonalscheduletherapist", async (req, res, next) => {
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

      if (user.type != "Therapist") {
        const error = new Error("User has no access to the requested data.")
        error.status = 403
        return next(error)
      }

      const therapistName = user.forename + " " + user.surname;

      await client
        .db("FYP")
        .collection("AppointmentsTherapists")
        .find({ professional: therapistName })
        .toArray()
        .then(data => {
          let filteredData = [];
          if (data) {
            data.map(item => {
              if (item.status == "Set" || item.status == "Pending")
                filteredData.push({
                  id: uuidv4(),
                  Subject: therapistName,
                  IsBlock: false,
                  StartTime: item.StartTime,
                  EndTime: item.EndTime
                });
            });

            res.status(200).send(filteredData);
            return next();
          } else {
            res.status(404).send([]);
            return next();
          }
        });
    }
  );
})

app.get("/getpersonalschedulerehabilitator", async (req, res, next) => {
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

      if (user.type != "Rehabilitator") {
        const error = new Error("User has no access to the requested data.")
        error.status = 403
        return next(error)
      }

      const rehabilitatorName = user.forename + " " + user.surname;

      await client
        .db("FYP")
        .collection("AppointmentsRehabilitator")
        .find({ professional: rehabilitatorName })
        .toArray()
        .then(data => {
          if (data) {
            let filteredData = [];
            data.map(item => {
              filteredData.push({
                id: uuidv4(),
                Subject: rehabilitatorName,
                IsBlock: false,
                StartTime: item.StartTime,
                EndTime: item.EndTime
              });
            });

            res.status(200).send(filteredData);
            return next();
          } else {
            res.status(404).send([]);
            return next();
          }
        });
    }
  );
})

app.use((error, req, res, next) => {

  res.status(error.status || 500);
  res.json({
    message: error.message
  })
})

app.listen(3005);

exports.schedules = app;
