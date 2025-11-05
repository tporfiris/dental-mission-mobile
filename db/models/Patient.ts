import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';
import Visit from './Visit';

export default class Patient extends Model {
  static table = 'patients';

  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @field('age') age!: number;
  @field('gender') gender!: string;
  @field('location') location!: string;
  @field('photo_uri') photoUri!: string; // Local URI
  @field('photo_cloud_uri') photoCloudUri!: string; // Cloud URI (Firebase Storage)

  @children('visits') visits!: Visit[];
}
