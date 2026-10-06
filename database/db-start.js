const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Load root .env to get DB_PORT ────────────────────────────────────────────
const rootEnvPath = path.join(__dirname, '..', '.env');
let DB_PORT = 5432; // default (Mac-friendly)

if (fs.existsSync(rootEnvPath)) {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
  const match = rootEnv.match(/^DB_PORT\s*=\s*(\d+)/m);
  if (match) DB_PORT = parseInt(match[1], 10);
}

console.log(`Using DB_PORT=${DB_PORT}`);

// ── Auto-write backend/.env with the correct DATABASE_URL ────────────────────
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
const backendEnvExamplePath = path.join(__dirname, '..', 'backend', '.env.example');

// Read existing backend .env or fall back to .env.example as template
const templatePath = fs.existsSync(backendEnvPath) ? backendEnvPath : backendEnvExamplePath;
let backendEnv = fs.readFileSync(templatePath, 'utf8');

// Replace DATABASE_URL port with current DB_PORT
backendEnv = backendEnv.replace(
  /DATABASE_URL\s*=\s*"postgresql:\/\/([^:]+):([^@]+)@([^:]+):\d+\/([^"?]+)([^"]*)"/,
  `DATABASE_URL="postgresql://$1:$2@$3:${DB_PORT}/$4$5"`
);

fs.writeFileSync(backendEnvPath, backendEnv, 'utf8');
console.log(`backend/.env updated → localhost:${DB_PORT}`);

// ── Start Docker container ────────────────────────────────────────────────────
function runCommand(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    if (options.ignoreError) return null;
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

const sleep = (ms) => {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (e) {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  }
};

console.log('Starting PostgreSQL container...');
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
const rootEnvArg = fs.existsSync(rootEnvPath) ? `--env-file "${rootEnvPath}"` : '';
runCommand(`docker compose -f "${dockerComposePath}" ${rootEnvArg} up -d`);

console.log('Waiting for database to be ready...');
let isReady = false;
const maxAttempts = 30;
let attempts = 0;

while (!isReady && attempts < maxAttempts) {
  attempts++;
  try {
    execSync('docker exec college-erp-postgres pg_isready -U postgres', { stdio: 'ignore' });
    isReady = true;
  } catch (e) {
    sleep(1000);
  }
}

if (!isReady) {
  console.error('Database failed to start in time.');
  process.exit(1);
}

console.log('Database is ready.');
console.log('Database start process completed successfully.');
