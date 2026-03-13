const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    players: {}, // socket.id -> {role, ready}
    gameStarted: false,
    config: { speed: 1.0 } // ホストが変更できる設定例
};

io.on('connection', (socket) => {
    const userCount = Object.keys(gameState.players).length;

    if (userCount >= 2) {
        socket.emit('error-msg', '部屋が満員です');
        return;
    }

    // 1人目をHost、2人目をGuestに設定
    const role = userCount === 0 ? 'host' : 'guest';
    gameState.players[socket.id] = { role: role, id: socket.id };

    socket.emit('init-player', { role: role });
    io.emit('update-room', { count: Object.keys(gameState.players).length });

    // 設定の変更（ホストのみ）
    socket.on('update-config', (newConfig) => {
        if (gameState.players[socket.id]?.role === 'host') {
            gameState.config = newConfig;
            socket.broadcast.emit('config-changed', newConfig);
        }
    });

    // ゲーム開始命令（ホストのみ）
    socket.on('request-start', () => {
        if (gameState.players[socket.id]?.role === 'host' && Object.keys(gameState.players).length === 2) {
            gameState.gameStarted = true;
            io.emit('game-start-signal');
        }
    });

    // 召喚データの同期
    socket.on('spawn', (data) => {
        socket.broadcast.emit('enemy-spawn', data);
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        gameState.gameStarted = false;
        io.emit('update-room', { count: Object.keys(gameState.players).length });
        io.emit('player-left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
