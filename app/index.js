const express = require('express');
const path = require('path');

const app = express();
const expressWs = require('express-ws')(app);

// Serve static files from the ../client/ directory
app.use(express.static(path.join(__dirname, '..', 'client')));

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
