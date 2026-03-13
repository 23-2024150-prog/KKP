const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
    // ルーム作成
    socket.on('createRoom', (settings) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomCode] = {
            host: socket.id,
            guest: null,
            settings: settings, // HP, MP速度などのルール
            gameStarted: false
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    // ルーム参加
    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (room && !room.guest) {
            room.guest = socket.id;
            socket.join(roomCode);
            io.to(roomCode).emit('playerJoined', room.settings);
        } else {
            socket.emit('errorMsg', 'ルームが見つからないか、満員です。');
        }
    });

    // ユニット召喚の同期
    socket.on('spawnUnit', (data) => {
        // 相手にユニット情報を送る
        socket.to(data.roomCode).emit('enemySpawn', data);
    });

    socket.on('disconnect', () => {
        // ルーム削除処理などは運用に合わせて追加
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
