import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import Visit from './Visit';
import Clinician from './Clinician';

export default class AudioNote extends Model {
  static table = 'audio_notes';

  @field('uri') uri!: string;
  @field('transcription') transcription!: string;
  @field('timestamp') timestamp!: number;

  @relation('visits', 'visit_id') visit!: Visit;
  @relation('clinicians', 'clinician_id') clinician!: Clinician;
}
