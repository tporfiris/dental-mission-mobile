import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import Visit from './Visit';

export default class Treatment extends Model {
  static table = 'treatments';

  @field('type') type!: string;
  @field('tooth') tooth!: string;
  @field('surface') surface!: string;
  @field('units') units!: number;
  @field('value') value!: number;

  @relation('visits', 'visit_id') visit!: Visit;
}
