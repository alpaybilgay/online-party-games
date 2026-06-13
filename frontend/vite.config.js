import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/health": "http://127.0.0.1:3001",
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
      },
    },
  },
  preview: {
    proxy: {
      "/health": "http://127.0.0.1:3001",
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
      },
    },
  },
});