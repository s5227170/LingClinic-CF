import { ObjectId, WithId } from "mongodb";

export interface TherapistAppointment {
  _id: ObjectId | string;
  client: string;
  professional: string;
  information: string;
  StartTime: Date;
  EndTime: Date;
  status: string;
  complete: boolean;
  date: Date;
}

export interface RehabilitatorAppointment {
  _id: ObjectId | string;
  StartTime: Date;
  EndTime: Date;
  IsBlock: boolean;
  ID: string;
}

export interface Healthcare {
  _id: ObjectId | string;
  information: string;
  diagnosis: string;
  client: string;
  therapist: string;
  rehabilitator: string;
  documents: Document[];
  clientDocs: Document[];
  requirements: string[];
  therapistRequirement: boolean;
  appointmentsRehabilitator: RehabilitatorAppointment[];
  appointmentTherapist: TherapistAppointment;
  appointmentsRehabRequired: number;
  complete: boolean;
  initialisationDate: Date;
}

export interface Document {
  name: string;
  information: string;
}
