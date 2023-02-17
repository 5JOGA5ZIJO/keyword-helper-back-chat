require('dotenv').config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const db = require('./db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000"
    }
});

io.on("connection", (socket) => {
    socket.on("enter", async (id, nickname) => {
        socket["db_id"] = id;
        socket["nickname"] = nickname;
        socket["last_chat_id"] = 0;
        socket.join("room");
        io.in("room").emit("new_entry", nickname);

        const [user] = await db.promise().query(`SELECT * FROM users WHERE id = '${id}'`);
        if (user.length == 0) {
            db.promise().query(`INSERT INTO users (id, nickname) VALUES ('${id}', '${nickname}')`);
            db.promise().query(`INSERT INTO chats (user_id, chat) VALUES ('system', '${nickname} enter')`);
        } else {
            db.promise().query(`UPDATE users SET nickname = '${nickname}' WHERE id = '${id}'`);
            db.promise().query(`SELECT last_chat_id FROM users WHERE id = '${id}'`);
        }
    });

    socket.on("new_message", (message) => {
        io.in("room").emit("new_message", `'${socket.nickname}': '${message}'`);
        console.log(`'${socket.nickname}': '${message}'`);
        db.promise().query(`INSERT INTO chats (user_id, chat) VALUES ('${socket.db_id}', '${message}')`);
    });

    socket.on("disconnecting", async () => {
        socket.to("room").emit("new_leave", socket.nickname);
        const [last_chat] = await db.promise().query(`SELECT id FROM chats ORDER BY id DESC LIMIT 1`);
        socket["last_chat_id"] = last_chat[0].id;
        db.promise().query(`UPDATE users SET last_chat_id = '${socket.last_chat_id}' WHERE id = '${socket.db_id}'`);
    });
  
});

const handleListen = () => console.log(`Listening on http://localhost:3001`);
httpServer.listen(3001, handleListen);