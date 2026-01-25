// db/migrations.ts
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // Migration from version 7 to 8 - Add face_embedding to patients
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'patients',
          columns: [
            { name: 'face_embedding', type: 'string' },
          ],
        }),
      ],
    },
  ],
});