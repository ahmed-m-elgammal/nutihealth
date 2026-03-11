const express = require('express');
const app = express();
const server = app.listen(3000, () => console.log('started on 3000'));

server.on('close', () => console.log('Server socket closed.'));
process.on('exit', (code) => console.log('Process exit with code', code));
process.on('uncaughtException', (err) => console.error('Uncaught', err));
