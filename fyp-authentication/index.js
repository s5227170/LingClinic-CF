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

app.post("/createuser", async (req, res, next) => {
  //Do checks here
  const errors = [];

  if (validator.isEmpty(req.body.uid)) {
    errors.push({ message: "Problem creating a user." });
  }
  if (validator.isEmpty(req.body.email)) {
    errors.push({ message: "No email provided." });
  }
  if (!validator.isEmail(req.body.email)) {
    errors.push({ message: "Problem with email format." });
  }
  if (validator.isEmpty(req.body.forename)) {
    errors.push({ message: "No forename provided." });
  }
  if (validator.isEmpty(req.body.surname)) {
    errors.push({ message: "No surname provided." });
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  const User = {
    _id: req.body.uid,
    email: req.body.email,
    forename: req.body.forename,
    surname: req.body.surname,
    avatar: "",
    type: "Client"
  };

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
      //write code here
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
  );
});

app.get("/getuser", async (req, res, next) => {
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
      //write code here
      const user = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid });

      res.status(200).send(user);
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

app.listen(3001);

exports.users = app;
