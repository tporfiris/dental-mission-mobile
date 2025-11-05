import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';
import Visit from './Visit';
import Clinician from './Clinician';

export default class AudioNote extends Model {
  static table = 'audio_notes';

  @field('patient_id') patientId!: string;
  @field('visit_id') visitId?: string;
  @field('uri') uri!: string;
  @field('cloud_uri') cloudUri!: string; // Cloud URI (Firebase Storage)
  @field('transcription') transcription!: string;
  @field('timestamp') timestamp!: number;
  @field('clinician_id') clinicianId!: string;
  @field('category') category!: string; // Assessment or Treatment
  @field('subcategory') subcategory!: string; // Hygiene, Extractions, etc.

  @relation('patients', 'patient_id') patient!: Patient;
  @relation('visits', 'visit_id') visit?: Visit;
  @relation('clinicians', 'clinician_id') clinician!: Clinician;
}