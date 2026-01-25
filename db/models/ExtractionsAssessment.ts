import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class ExtractionsAssessment extends Model {
  static table = 'extractions_assessments';

  @field('patient_id') patientId!: string;
  @field('data') data!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('clinician_name') clinicianName?: string;
  
  @relation('patients', 'patient_id') patient!: any;
}
