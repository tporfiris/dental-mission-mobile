import { Model } from '@nozbe/watermelondb';
import { field, date, relation, children } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';
import Treatment from './Treatment';

export default class Visit extends Model {
  static table = 'visits';

  @field('clinician_name') clinicianName!: string;
  @field('date') date!: number;

  @relation('patients', 'patient_id') patient!: Patient;
  @children('treatments') treatments!: Treatment[];
}
