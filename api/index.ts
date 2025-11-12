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

let onlineUsers: { socketId: string; userId: string }[] = [];

io.on("connection", (socket: Socket) => {
  onlineUsers.push({ socketId: socket.id, userId: "" });
  io.emit("usersOnline", onlineUsers);
  console.log(
    "A user connected with id: ",
    socket.id,
    " there are now ",
    onlineUsers.length,
    " online users"
  );

  socket.on("newUser", (userId: string) => {
    if (!userId) {
      return;
    }

    const existingUserIndex = onlineUsers.findIndex(
      user => user.socketId === socket.id
    );

    if (existingUserIndex !== -1) {
      onlineUsers[existingUserIndex] = { socketId: socket.id, userId };
    } else if (!onlineUsers.some(user => user.userId === userId)) {
      onlineUsers.push({ socketId: socket.id, userId });
    } else {
      onlineUsers = onlineUsers.map(user =>
        user.userId === userId ? { socketId: socket.id, userId } : user
      );
    }

    io.emit("usersOnline", onlineUsers);
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
console.log(`Server is running on port ${port}`);








