import { io } from "socket.io-client";
import { env } from "./env";

const socket = io(env.VITE_DATABASE_URL);

socket.on("connect", () => {
  console.log("Connected to server");
});

export default socket;
