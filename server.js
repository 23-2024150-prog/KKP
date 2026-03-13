const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 空いているプレイヤー番号を割り当て (1 or 2)
    const existingIds = Object.values(players).map(p => p.playerId);
    let myId = existingIds.includes(1) ? (existingIds.includes(2) ? null : 2) : 1;

    if (myId === null) {
        socket.emit('error-msg', '部屋がいっぱいです');
        return;
    }

    players[socket.id] = { playerId: myId };
    socket.emit('assign-player', myId);

    // 召喚データの同期
    socket.on('spawn', (data) => {
        // 自分以外全員に送信
        socket.broadcast.emit('enemy-spawn', data);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
