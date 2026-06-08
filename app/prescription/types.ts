export type MedicationRow = {
  name: string;
  usage: string;
  remarks: string;
};

export type PrescriptionCreatedBy = {
  id: string;
  email?: string;
  name?: string;
};

export type PrescriptionHistoryEntry = {
  id: string;
  createdAt: string;
  fileId: string;
  filename: string;
  diagnosis: string;
  medications: {
    name: string;
    usage?: string;
    remarks?: string;
  }[];
  createdBy?: PrescriptionCreatedBy;
};

export type PatientInfo = {
  firstname: string;
  lastname: string;
  address: string;
  zip: string;
  city: string;
  birthdate: string;
};

export type PrescriptionHistoryResponse = {
  patient: PatientInfo;
  prescriptions: Array<
    PrescriptionHistoryEntry & { downloadUrl: string | null }
  >;
};
