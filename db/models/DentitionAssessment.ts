import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class DentitionAssessment extends Model {
  static table = 'dentition_assessments';

  @field('data') data!: string; // JSON string of tooth states
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  @relation('patients', 'patient_id') patient!: any;
}
