#!/usr/bin/env node

/**
 * Argus Unified Boot Script
 * Starts both backend and frontend with a single command
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    ARGUS TERMINAL                         ║
║         Market Intelligence & Execution System            ║
║                                                           ║
║  Starting backend and frontend...                         ║
╚═══════════════════════════════════════════════════════════╝
`);

// Check for .env file
import { existsSync } from 'node:fs';
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.warn('⚠️  WARNING: .env file not found!');
  console.warn('   Copy .env.example to .env and configure your API keys.\n');
}

// Backend process (Fastify server)
console.log('🚀 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: join(rootDir, 'apps', 'server'),
  shell: true,
  stdio: 'inherit',
});

backend.on('error', (err) => {
  console.error('❌ Backend failed to start:', err.message);
  process.exit(1);
});

// Wait a moment for backend to initialize, then start frontend
setTimeout(() => {
  console.log('\n🌐 Starting frontend (Next.js)...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: join(rootDir, 'apps', 'web'),
    shell: true,
    stdio: 'inherit',
  });

  frontend.on('error', (err) => {
    console.error('❌ Frontend failed to start:', err.message);
    process.exit(1);
  });

  // Handle shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down Argus...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}, 2000);
