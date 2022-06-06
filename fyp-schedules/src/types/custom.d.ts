import MongoConnection from "../models/mongoConnection";

declare global {
  namespace Express {
    interface Request {
      db: MongoConnection;
    }
  }
}

export default global;
