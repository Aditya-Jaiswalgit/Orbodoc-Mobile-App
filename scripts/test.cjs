// Keep React's test renderer available even when the shell uses NODE_ENV=production.
process.env.NODE_ENV = 'test';
require('jest').run(process.argv.slice(2));
