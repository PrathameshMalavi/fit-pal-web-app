const fs = require('fs');
const path = require('path');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const targetDirectory = path.join(__dirname, '../src/environments');

// Ensure directory exists
if (!fs.existsSync(targetDirectory)) {
  fs.mkdirSync(targetDirectory, { recursive: true });
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const envFileContent = `export const environment = {
  production: ${isProd},
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

// Write environments files
fs.writeFileSync(path.join(targetDirectory, 'environment.ts'), envFileContent);
fs.writeFileSync(path.join(targetDirectory, 'environment.development.ts'), envFileContent);

console.log('Environment variables written successfully to src/environments/');
