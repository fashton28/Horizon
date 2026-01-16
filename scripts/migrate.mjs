import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  // Add name column to interview_session table
  const statements = [
    'ALTER TABLE "interview_session" ADD COLUMN IF NOT EXISTS "name" text;'
  ];

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      console.log('Executing:', trimmed.substring(0, 60) + '...');
      try {
        // Use tagged template literal with sql.query for raw SQL
        await sql.query(trimmed);
        console.log('✓ Success');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⊘ Already exists, skipping');
        } else {
          console.error('✗ Error:', error.message);
        }
      }
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
