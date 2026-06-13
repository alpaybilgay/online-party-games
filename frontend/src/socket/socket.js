import { io } from "socket.io-client";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// Export direct socket client instance
export const socket = io(SERVER_URL, {
  autoConnect: false // We will connect manually when server wake check finishes
});
