const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// publicフォルダ内のファイルを公開
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    // ルーム作成（ホストがルールを決定）
    socket.on('createRoom', (settings) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { host: socket.id, settings: settings };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // ルーム参加（ゲストがコードを入力）
    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            io.to(roomId).emit('initGame', {
                settings: rooms[roomId].settings,
                hostId: rooms[roomId].host
            });
        } else {
            socket.emit('errorMsg', 'ルームが見つかりません');
        }
    });

    // アクション同期（召喚イベントなどを他方に転送）
    socket.on('gameAction', (data) => {
        socket.to(data.roomId).emit('remoteAction', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
