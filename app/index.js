import express from 'express';
import expressWs from 'express-ws';
import { Game } from './game.js';

const app = express();
expressWs(app);

// Serve static files from the <project_root>/client/ directory
app.use(express.static('client'));

// Serve the websocket server on the /ws path
app.ws('/ws', (socket, request) => {
    console.log('socket connected');
    socket.on('message', (msg) => {
        const message = JSON.parse(msg);
        console.log('Message:', message);
        switch (message.type) {
            case 'start':
                const game = new Game();
                socket.send(JSON.stringify({
                    type: 'init',
                    data: game.toJSON(),
                }));
                break;
        }
    });
    socket.on('close', () => {
        console.log('socket closed');
    });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
