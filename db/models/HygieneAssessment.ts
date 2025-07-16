import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class HygieneAssessment extends Model {
  static table = 'hygiene_assessments';

  @field('data') data!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  @relation('patients', 'patient_id') patient!: any;
}
