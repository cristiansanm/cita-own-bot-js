import { Schema, model } from 'mongoose';

interface ILog {
  lastNie: string;
  lastName: string;
  lastNationality: string;
  success: boolean;
  foundOffices: string[];
  timestamp: Date;
}

const logSchema = new Schema<ILog>({
  lastNie: String,
  lastName: String,
  lastNationality: String,
  success: { type: Boolean, default: false },
  foundOffices: [String],
  timestamp: { type: Date, default: Date.now },
});

export const Log = model<ILog>('Log', logSchema);
