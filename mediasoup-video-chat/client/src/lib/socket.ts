import { io } from "socket.io-client";
import { env } from "../config/env";

const socket = io(env.VITE_DATABASE_URL);

socket.on("connect", () => {
  console.log("Connected to server");
});

export default socket;
