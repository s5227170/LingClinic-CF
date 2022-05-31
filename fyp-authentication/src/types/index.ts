import { ObjectId } from "mongodb";

export interface CorsOptions {
  origin: string;
  credentials?: boolean;
}

export interface User {
  _id: ObjectId;
  email: string;
  forename: string;
  surname: string;
  avatar: string;
  type: string;
}
