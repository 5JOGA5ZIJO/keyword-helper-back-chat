require('dotenv').config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const db = require('./db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});

let users;

const setting = async() => {
    [users] = await db.promise().query(`SELECT id FROM users`);
    users.forEach(x=> {
        x.status = 'leave'
    });
}
setting();

io.on("connection", (socket) => {
    socket.on("enter", async (id, nickname) => {
        socket["db_id"] = id;
        socket["nickname"] = nickname;
        socket["last_chat_id"] = 0;
        socket.join("room");

        const [chats] = await db.promise().query(`
            SELECT users.nickname AS 'nickname', chats.chat AS 'chat', chats.created_at AS 'created_at' 
            FROM chats
            LEFT JOIN users ON chats.user_id = users.id
            ORDER BY created_at DESC
        `);
        socket.emit("prev_message", chats)

        const [user] = await db.promise().query(`SELECT * FROM users WHERE id = '${id}'`);
        if (user.length == 0) {
            db.promise().query(`INSERT INTO users (id, nickname) VALUES ('${id}', '${nickname}')`);
            db.promise().query(`INSERT INTO chats (user_id, chat) VALUES ('system', '${nickname}님이 입장하였습니다.')`);
            users.push({"id": id, "status": 'connect'})
        } else {
            db.promise().query(`UPDATE users SET nickname = '${nickname}' WHERE id = '${id}'`);
            const [last_chat_id] = await db.promise().query(`SELECT last_chat_id FROM users WHERE id = '${id}'`);
            socket["last_chat_id"] = last_chat_id[0].last_chat_id;
            users.forEach(x => {
                if (x.id == id) x.status = 'connect'
            });
        }
        io.in("room").emit("new_entry", nickname, users);
        console.log(users);
    });

    socket.on("new_message", (message) => {
        io.in("room").emit("new_message", `'${socket.nickname}': '${message}'`);
        console.log(`'${socket.nickname}': '${message}'`);
        db.promise().query(`INSERT INTO chats (user_id, chat) VALUES ('${socket.db_id}', '${message}')`);
    });

    socket.on("disconnecting", async () => {
        users.forEach(x => {
            if (x.id == socket.db_id) x.status = 'leave'
        });
        io.to("room").emit("new_leave", socket.nickname, users);
        const [last_chat] = await db.promise().query(`SELECT id FROM chats ORDER BY id DESC LIMIT 1`);
        socket["last_chat_id"] = last_chat[0].id;
        db.promise().query(`UPDATE users SET last_chat_id = '${socket.last_chat_id}' WHERE id = '${socket.db_id}'`);
    });
  
});

const handleListen = () => console.log(`Listening on http://localhost:3001`);
httpServer.listen(process.env.PORT || '3001', handleListen);