import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "https://conver-amber.vercel.app/", // Vite default port
    methods: ["GET", "POST"]
  }
});

// Store online users
const users = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user joining
  socket.on("join", (username) => {
    users.set(socket.id, username);
    
    // Broadcast to others that user is online
    socket.broadcast.emit("userJoined", username);
    
    // Send currently online users to the newly joined user
    const onlineUsers = Array.from(users.values());
    socket.emit("onlineUsers", onlineUsers);
    
    console.log(`${username} joined. Online users:`, onlineUsers);
  });

  // Handle new messages
  socket.on("sendMessage", ({ to, message }) => {
    const sender = users.get(socket.id);
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Find recipient's socket ID
    const recipientSocketId = Array.from(users.entries())
      .find(([_, name]) => name === to)?.[0];

    if (recipientSocketId) {
      // Send to recipient
      io.to(recipientSocketId).emit("newMessage", {
        from: sender,
        text: message,
        time
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit("userLeft", username);
      users.delete(socket.id);
      console.log(`${username} left. Online users:`, Array.from(users.values()));
    }
  });
});

const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
