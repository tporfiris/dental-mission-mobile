import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';
import AudioNote from './AudioNote';

export default class Clinician extends Model {
  static table = 'clinicians';

  @field('full_name') fullName!: string;
  @field('email') email!: string;
  @field('role') role!: string;

  @children('audio_notes') audioNotes!: AudioNote[];
}
