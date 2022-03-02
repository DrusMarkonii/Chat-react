const express = require("express");
const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);
const cors = require("cors");

const rooms = new Map();
const PORT = 9999;

app.use(express.json());
app.use(express.urlencoded({extended: true}))

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
  })
);

app.get("/", (req, res) => {
  res.send("Hello boy");
});

app.get("/rooms/:id", (req, res) => {
  const roomID = req.params.id;
  const obj = rooms.has(roomID)
    ? {
        users: [...rooms.get(roomID).get("users").values()],
        messages: [...rooms.get(roomID).get("messages").values()],
      }
    : { users: [], messages: [] };
  res.json(obj);
});

app.post("/rooms", (req, res) => {
  const { roomID } = req.body;
  if (!rooms.has(roomID)) {
    rooms.set(
      roomID,
      new Map([
        ["users", new Map()],
        ["messages", []],
      ])
    );
  }
  res.send();
});

io.on("connection", (socket) => {
  socket.on("ROOM:JOIN", ({ roomID, userName }) => {
    socket.join(roomID);
    rooms.get(roomID).get("users").set(socket.id, userName);
    const users = [...rooms.get(roomID).get("users").values()];
    socket.to(roomID).emit("ROOM:SET_USERS", users);
    console.log("user connected", socket.id);
  });

  socket.on("disconnect", () => {
    rooms.forEach((value, roomID) => {
      if (value.get("users").delete(socket.id)) {
        const users = [...rooms.get(roomID).get("users").values()];
        socket.to(roomID).emit("ROOM:SET_USERS", users);
        console.log("user  disconnect", socket.id);
      }
    });
  });

  socket.on("ROOM:NEW_MESSAGE", ({ roomID, userName, text }) => {

    const obj = {
      userName, 
      text,
      roomID
    }

    rooms.get(roomID).get("messages").push(obj);
    socket.broadcast.to(roomID).emit("ROOM:NEW_MESSAGE", obj);
  });


});

server.listen(PORT, () => console.log(`server started on ${PORT}....`));
