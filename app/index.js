import express from 'express';
import expressWs from 'express-ws';
import path from 'path';

const app = express();
expressWs(app);

import { Game } from './game.js';
const game = new Game();

// Serve static files from the <project_root>/client/ directory
app.use(express.static('client'));

// Serve the websocket server on the /ws path
app.ws('/ws', (socket, request) => {
    socket.on('message', (msg) => {
        console.log(msg);
    });
    console.log('socket connected');
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
