import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 8000;

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});
// Handle WebSocket connections
// Store connected users
const users = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle new user joining
  socket.on("user-data", (data) => {
    // Store user data in the users map & emit the existing
    socket.emit("existing-users", Array.from(users.values()));
    users.set(socket.id, { userId: data.userId, username: data.username });

    // Emit connection message to all clients
    io.emit("user-connected", { username: data.username, userId: data.userId });
  });

  // Handle drawing data
  socket.on("drawing", (data) => {
    console.log("drawing event:", socket.id, data);
    socket.broadcast.emit("drawing", data);
  });

  // Handle canvas reset
  socket.on("reset-canvas", (data) => {
    console.log(`Canvas reset triggered by: ${socket.id}`);
    io.emit("reset-canvas", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User ${user.username} disconnected`);
      io.emit("user-disconnected", {
        username: user.username,
        userId: user.userId,
      });
      users.delete(socket.id); // Remove user data on disconnect
    }
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
