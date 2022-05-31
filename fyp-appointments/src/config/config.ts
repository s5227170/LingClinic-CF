const admin = require("firebase-admin");
import * as serviceAccount from "./serviceAccount.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://final-year-project-82049.appspot.com",
});

export default admin;
