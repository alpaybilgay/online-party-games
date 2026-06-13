import { io } from "socket.io-client";

// Detect if we are on localhost in development
const socketUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://127.0.0.1:3001"
  : window.location.origin;

// Export direct socket client instance
export const socket = io(socketUrl, {
  autoConnect: false // We will connect manually when server wake check finishes
});
