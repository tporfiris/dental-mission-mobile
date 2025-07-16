// This defines a normalized schema:
// - Each patient can have many visits
// - Each visit can have many treatments

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'gender', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'photo_uri', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'visits',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'number' }, // UNIX timestamp
        { name: 'clinician_name', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'treatments',
      columns: [
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // e.g., extraction, filling, hygiene
        { name: 'tooth', type: 'string' }, // e.g., "11", "24"
        { name: 'surface', type: 'string' }, // MODBL
        { name: 'units', type: 'number' }, // hygiene only
        { name: 'value', type: 'number' }, // fee guide value
      ],
    }),
    tableSchema({
      name: 'clinicians',
      columns: [
        { name: 'full_name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'role', type: 'string' }, // e.g., clinician, admin, triage
      ],
    }),
    tableSchema({
      name: 'dentition_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'hygiene_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'fillings_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'extractions_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'denture_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'implant_assessments',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'audio_notes',
      columns: [
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 'uri', type: 'string' }, // local or cloud storage path
        { name: 'transcription', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'clinician_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});
