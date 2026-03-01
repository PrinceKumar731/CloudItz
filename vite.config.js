import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/statuses": {
        target: "https://cloudit-m0tx.onrender.com/",
        changeOrigin: true,
      },
      "/folder": {
        target: "https://cloudit-m0tx.onrender.com/",
        changeOrigin: true,
      },
      "/upload": {
        target: "https://cloudit-m0tx.onrender.com/",
        changeOrigin: true,
      },
      "/delete": {
        target: "https://cloudit-m0tx.onrender.com/",
        changeOrigin: true,
      },
      "/api": {
        target: "https://cloudit-m0tx.onrender.com/",
        changeOrigin: true,
      },
    },
  },
});
