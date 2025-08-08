import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Visit from './Visit';

export default class Treatment extends Model {
  static table = 'treatments';

  @field('patient_id') patientId!: string; // Direct patient reference for treatments
  @field('visit_id') visitId!: string; // Optional visit reference
  @field('type') type!: string; // e.g., hygiene, extraction, filling, denture, implant
  @field('tooth') tooth!: string; // e.g., "11", "24", or "N/A" for full mouth
  @field('surface') surface!: string; // MODBL surfaces, or "N/A"
  @field('units') units!: number; // scaling/root planing units, or quantity
  @field('value') value!: number; // fee guide value
  @field('billing_codes') billingCodes!: string; // JSON string of generated codes
  @field('notes') notes!: string; // treatment notes
  @field('clinician_name') clinicianName!: string; // who performed the treatment
  @date('completed_at') completedAt!: Date; // when treatment was performed

  @relation('visits', 'visit_id') visit?: Visit; // Optional visit relation
}