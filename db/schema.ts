// This defines a normalized schema:
// - Each patient can have many visits
// - Each visit can have many treatments
// - Treatments can also be directly linked to patients for mission scenarios

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 8, // Increment version for schema changes
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
        { name: 'photo_cloud_uri', type: 'string' },
        { name: 'face_embedding', type: 'string' }, 
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
        { name: 'patient_id', type: 'string', isIndexed: true }, // Direct patient reference
        { name: 'visit_id', type: 'string', isIndexed: true }, // Optional visit reference
        { name: 'type', type: 'string' }, // hygiene, extraction, filling, denture, implant
        { name: 'tooth', type: 'string' }, // tooth number or "N/A"
        { name: 'surface', type: 'string' }, // MODBL surfaces or "N/A"
        { name: 'units', type: 'number' }, // scaling/root planing units or quantity
        { name: 'value', type: 'number' }, // fee guide value
        { name: 'billing_codes', type: 'string' }, // JSON string of billing codes
        { name: 'notes', type: 'string' }, // treatment notes
        { name: 'clinician_name', type: 'string' }, // who performed treatment
        { name: 'completed_at', type: 'number' }, // when treatment was completed
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
        { name: 'patient_id', type: 'string', isIndexed: true }, // Direct patient link
        { name: 'visit_id', type: 'string', isIndexed: true, isOptional: true }, // Optional visit link
        { name: 'uri', type: 'string' }, // local storage path
        { name: 'cloud_uri', type: 'string' }, // cloud storage path
        { name: 'transcription', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'clinician_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' }, // Assessment or Treatment
        { name: 'subcategory', type: 'string' }, // Hygiene, Extractions, etc.
      ],
    }),
  ],
});