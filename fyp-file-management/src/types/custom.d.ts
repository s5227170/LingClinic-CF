import MongoConnection from "../models/mongoConnection";
import { ParsedFiles } from "./index";

declare global {
  namespace Express {
    interface Request {
      files: ParsedFiles[];
      db: MongoConnection
    }
  }
}

export default global;
