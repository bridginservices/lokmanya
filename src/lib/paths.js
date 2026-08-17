import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Resolve a stable data directory at the project root, regardless of where
// the built server bundle runs from.
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const PATHS = {
  dataDir: DATA_DIR,
  uploadDir: UPLOAD_DIR,
  donations: path.join(DATA_DIR, 'donations.xlsx'),
  settings: path.join(DATA_DIR, 'settings.json'),
  secret: path.join(DATA_DIR, '.secret'),
};
