import { Server } from './packages/opencode/src/server/server.js';

console.log('Starting backend server on port 4096...');

const server = Server.listen({
  port: 4096,
  hostname: 'localhost',
  cors: ['http://localhost:3000', 'http://127.0.0.1:3000']
});

console.log(`Backend server running on http://localhost:4096`);

// Keep the process alive
await new Promise(() => {});
