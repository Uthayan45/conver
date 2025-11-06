import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
const httpServer = createServer(app);

// ✅ Connect to MySQL
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",      // your MySQL username
  password: "Uthayan45@",      // your MySQL password
  database: "chat_app" // make sure database exists
});

// ✅ Create tables if not already created
await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE
  )
`);
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255),
    receiver VARCHAR(255),
    message TEXT,
    time VARCHAR(50)
  )
`);

const io = new Server(httpServer, {
  cors: {
    origin: "https://conver-amber.vercel.app", // Vite frontend port
    methods: ["GET", "POST"]
  }
});

const users = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ Handle user joining
  socket.on("join", async (username) => {
    users.set(socket.id, username);

    // Insert user into DB (ignore duplicates)
    await db.execute("INSERT IGNORE INTO users (username) VALUES (?)", [username]);

    socket.broadcast.emit("userJoined", username);

    const onlineUsers = Array.from(users.values());
    socket.emit("onlineUsers", onlineUsers);

    console.log(`${username} joined. Online users:`, onlineUsers);
  });

  // ✅ Handle new messages
  socket.on("sendMessage", async ({ to, message }) => {
    const sender = users.get(socket.id);
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Save to DB
    await db.execute(
      "INSERT INTO messages (sender, receiver, message, time) VALUES (?, ?, ?, ?)",
      [sender, to, message, time]
    );

    // Send to recipient if online
    const recipientSocketId = Array.from(users.entries())
      .find(([_, name]) => name === to)?.[0];

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", {
        from: sender,
        text: message,
        time
      });
    }
  });

  // ✅ Handle disconnection
  socket.on("disconnect", async () => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit("userLeft", username);
      users.delete(socket.id);
      console.log(`${username} left. Online users:`, Array.from(users.values()));
    }
  });
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
