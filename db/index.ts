import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Patient from './models/Patient';
import Visit from './models/Visit';
import Treatment from './models/Treatment';
import Clinician from './models/Clinician';
import AudioNote from './models/AudioNote';
import DentitionAssessment from './models/DentitionAssessment'; 

const adapter = new SQLiteAdapter({
  schema,
});

export const database = new Database({
  adapter,
  modelClasses: [
    Patient,
    Visit,
    Treatment,
    Clinician,
    AudioNote,
    DentitionAssessment
  ],
});
