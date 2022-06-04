import { ObjectId } from "mongodb";

export interface TherapistAppointment {
  _id: ObjectId;
  client: string;
  professional: string;
  information: string;
  StartTime: Date;
  EndTime: Date;
  status: string;
  complete: boolean;
  date: Date;
}

export interface TherapistAppointmentReturn {
  _id: string;
  client: string;
  professional: string;
  information: string;
  StartTime: Date;
  EndTime: Date;
  status: string;
  complete: boolean;
  date: Date;
}

export interface RehabilitatorAppointment {}

export interface Healthcare {
  _id: ObjectId;
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
