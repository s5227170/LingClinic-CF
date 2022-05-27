const cors = require("cors");
const express = require("express");

const path = require("path");
const fs = require("fs");
const os = require("os");

const mongodb = require("mongodb");
const validator = require("validator");
const fileMiddleware = require("express-multipart-file-parser");
const { v4: uuidv4 } = require("uuid");

const middleware = require("./middleware");

ObjectId = require("mongodb").ObjectId;
const { getStorage } = require("firebase-admin/storage");

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

app.post("/uploadTherapist", async (req, res, next) => {
  if (req.files.length == 0) {
    return next()
  }

  const { fieldname, filename, encoding, mimetype, buffer } = req.files[0];

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
      const professionalCheck = await client
        .db("FYP")
        .collection("Users")
        .findOne({ _id: res.locals.uid })

      if (!professionalCheck) {
        const error = new Error("The user is not a therapist.")
        error.status = 403
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
        fs.createWriteStream(filePath).write(buffer, async err => {
          if (err) {
            console.log("fail");
          } else {
            const upload = await storage.upload(filePath, {
              destination: fileName
            });

            fs.unlink(filePath, async err => {
              if (err) throw err;
            });
          }
        });
      }

      res.status(200).send(fileNames);
      return next();
    }
  );
});

app.post("/uploadClient/:healthcareID", async (req, res, next) => {
  if (req.files.length == 0) {
    return next()
  }

  const { fieldname, filename, encoding, mimetype, buffer } = req.files[0];
  const errors = [];

  if (validator.isEmpty(req.params.healthcareID)) {
    errors.push({ message: "No healthcare found with current ID" })
  }

  if (errors.length > 0) {
    const error = new Error("Invalid input");
    error.data = errors;
    error.code = 422;
    res.status(422).send({ error: errors });
    return next();
  }

  for (let i = 0; i < req.files.length; i++) {
    const extension = path.extname(req.files[i].originalname);
    if (extension != ".JPG" && extension != ".jpg" && extension != ".JPEG" && extension != ".jpeg" && extension != ".PNG" && extension != ".png") {
      const error = new Error("Only images of type .jpg, .jpeg, .png are allowed.")
      error.status = 422
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

      if (!user) {
        const error = new Error("The user is not found. Please refresh and try again")
        error.status = 404
        return next(error);
      }

      const userName = user.forename + " " + user.surname;

      const healthcare = await client
        .db("FYP")
        .collection("Healthcares")
        .findOne({ _id: new mongodb.ObjectId(req.params.healthcareID) }, { client: userName })

      if (!healthcare) {
        const error = new Error("You have no access to this healthcare")
        error.status = 403
        return next(error);
      }

      const storage = getStorage().bucket("fyp-image");
      const fileNames = [];

      if (req.files.length != healthcare.requirements.length) {
        const error = new Error("You have uploaded more than the required amount of images")
        error.status = 404
        return next(error);
      }

      for (let i = 0; i < req.files.length; i++) {
        const extension = path.extname(req.files[i].originalname);
        const fileName = uuidv4() + extension;
        fileNames.push(fileName);

        const filePath = os.tmpdir() + "/" + fileName;
        const buffer = Buffer.from(req.files[i].buffer);
        fs.createWriteStream(filePath).write(buffer, async err => {
          if (err) {
            console.log("fail");
          } else {
            const upload = await storage.upload(filePath, {
              destination: fileName
            });

            fs.unlink(filePath, async err => {
              if (err) throw err;
            });
          }
        });
      }

      res.status(200).send(fileNames);
      return next();
    }
  );
})

app.get("/downloadFile", async (req, res, next) => {

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

      let healthcareIsUser = [];
      const user = await client.db("FYP").collection("Users").findOne({ _id: res.locals.uid })

      if (user.type == "Therapist") {
        for (let i = 0; i < req.query.docNames.length; i++) {
          permissionCheckTherapist = await client
            .db("FYP")
            .collection("Healthcares")
            .findOne({ $or: [{ client: user.forename + " " + user.surname }, { therapist: user.forename + " " + user.surname }] }, { documents: { $elemMatch: { name: req.query.docNames[i] } } })
          healthcareIsUser.push(permissionCheckTherapist)
        }
      } else {
        for (let i = 0; i < req.query.docNames.length; i++) {
          permissionCheckRehabilitator = await client
            .db("FYP")
            .collection("Healthcares")
            .findOne({ $or: [{ client: user.forename + " " + user.surname }, { rehabilitator: user.forename + " " + user.surname }] }, { documents: { $elemMatch: { name: req.query.docNames[i] } } })
          healthcareIsUser.push(permissionCheckRehabilitator)
        }
      }

      let urls = [];
      if (healthcareIsUser.length == req.query.docNames.length) {
        if (req.query.mode == "Professional") {
          const storage = getStorage().bucket("fyp-docs");

          const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          };


          for (let i = 0; i < req.query.docNames.length; i++) {
            let fileName = req.query.docNames[i]
            const [url] = await storage
              .file(fileName)
              .getSignedUrl(options)
            urls.push(url)
          }

          res.status(200).send(urls)
          return next()

        } else {
          const storage = getStorage().bucket("fyp-image")

          const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          };


          for (let i = 0; i < req.query.docNames.length; i++) {
            let fileName = req.query.docNames[i]
            const [url] = await storage
              .file(fileName)
              .getSignedUrl(options)
            urls.push(url)
          }

          res.status(200).send(urls)
          return next()
        }
      } else {
        res.status(200).send(urls)
        return next()
      }


      //403
    }
  );

});

app.use((error, req, res, next) => {

  res.status(error.status || 500);
  res.json({
    message: error.message
  })
})

app.listen(3002);

exports.files = app;
