import { Server, type Socket } from "socket.io";
import "dotenv/config";

const origins = (process.env.ORIGIN ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const io = new Server({
  cors: {
    origin: origins
  }
});

let onlineUsers: { socketId: string; userId: string; username: string }[] = [];

io.on("connection", (socket: Socket) => {
  onlineUsers.push({ socketId: socket.id, userId: "", username: "Anonymous" });
  io.emit("usersOnline", onlineUsers);
  console.log(
    "A user connected with id: ",
    socket.id,
    " there are now ",
    onlineUsers.length,
    " online users"
  );

  // Registro de nuevo usuario con username
  socket.on("newUser", (data: { userId: string; username: string }) => {
    if (!data.userId) {
      return;
    }

    const existingUserIndex = onlineUsers.findIndex(
      user => user.socketId === socket.id
    );

    if (existingUserIndex !== -1) {
      onlineUsers[existingUserIndex] = { 
        socketId: socket.id, 
        userId: data.userId,
        username: data.username || "Anonymous"
      };
    } else if (!onlineUsers.some(user => user.userId === data.userId)) {
      onlineUsers.push({ 
        socketId: socket.id, 
        userId: data.userId,
        username: data.username || "Anonymous"
      });
    } else {
      onlineUsers = onlineUsers.map(user =>
        user.userId === data.userId 
          ? { socketId: socket.id, userId: data.userId, username: data.username || "Anonymous" } 
          : user
      );
    }

    io.emit("usersOnline", onlineUsers);
    console.log(`User ${data.username} (${data.userId}) registered`);
  });

  // Manejo de mensajes de chat
  socket.on("chatMessage", (message: { 
    userId: string; 
    username: string; 
    text: string; 
    timestamp: number 
  }) => {
    console.log(`Message from ${message.username}: ${message.text}`);
    // Broadcast del mensaje a todos los clientes
    io.emit("chatMessage", message);
  });

  // Mensajes privados (opcional)
  socket.on("privateMessage", (data: {
    to: string;
    from: string;
    username: string;
    text: string;
    timestamp: number;
  }) => {
    const recipient = onlineUsers.find(u => u.userId === data.to);
    if (recipient) {
      io.to(recipient.socketId).emit("privateMessage", data);
      // También enviar confirmación al remitente
      socket.emit("privateMessage", data);
    }
  });

  // Usuario está escribiendo
  socket.on("typing", (data: { userId: string; username: string; isTyping: boolean }) => {
    socket.broadcast.emit("userTyping", data);
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
    io.emit("usersOnline", onlineUsers);
    console.log(
      "A user disconnected with id: ",
      socket.id,
      " there are now ",
      onlineUsers.length,
      " online users"
    );
  });
});

const port = Number(process.env.PORT);

io.listen(port);
console.log(`💬 Chat Server is running on port ${port}`);