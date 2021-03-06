import express from 'express';
import expressWs from 'express-ws';

import { Game } from './game.js';

const app = express();
expressWs(app);

// Serve static files from the <project_root>/client/ directory
app.use(express.static('client'));

// Serve the websocket server on the /ws path
let nextGame = new Game();
// @ts-ignore
app.ws('/ws', (socket, request) => {
    console.log('socket connected');
    socket.on('message', (/** @type {string} */ msg) => {
        try {
            const message = JSON.parse(msg);
            console.log('Message:', message);
            switch (message.type) {
                case 'start':
                    // add the player to the game, or create a new game if that was full
                    while (!nextGame.addPlayer(socket)) {
                        nextGame = new Game();
                    }

                    // send the initial game state
                    socket.send(JSON.stringify({
                        type: 'init',
                        data: nextGame.toJSON(),
                        gameTime: nextGame.getCurrentTime(),
                    }));
                    break;
            }
        } catch (e) {
            console.error(e);
            console.error(e.stack);
        }
    });
    socket.on('close', () => {
        console.log('socket closed');
    });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
