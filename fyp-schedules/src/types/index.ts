import { ObjectId } from "mongodb";

export interface Schedule {
  _id: ObjectId | string;
  Subject: string;
  IsBlock: boolean;
  StartTime: Date;
  EndTime: Date;
}
