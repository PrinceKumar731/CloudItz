import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/statuses": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/folder": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/upload": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/delete": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
