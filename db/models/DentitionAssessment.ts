import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class DentitionAssessment extends Model {
  static table = 'dentition_assessments';

  @field('patient_id') patientId!: string; // <-- ✅ ADD THIS LINE
  @field('data') data!: string; // JSON string of tooth states
  @field('clinician_name') clinicianName?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  @relation('patients', 'patient_id') patient!: any;
}
