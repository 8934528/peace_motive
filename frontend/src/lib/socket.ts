import { io } from "socket.io-client";

const serverUrl =
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export const socket = io(serverUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 10000
});
