import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "./config/env";

const port = env.PORT;

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  allowUpgrades: true,
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Mediasoup server is running");
});

async function main() {
  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  io.on("connection", (socket) => {
    console.log("a socket connected: ", socket.id);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
