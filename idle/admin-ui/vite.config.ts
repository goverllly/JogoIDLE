import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const idleRoot = resolve(root, "..");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/jogo-idle/admin/",
  resolve: {
    alias: [
      {
        find: /^@\/lib\/jogo-idle\/(.*)$/,
        replacement: resolve(idleRoot, "lib/jogo-idle/$1"),
      },
      { find: "@", replacement: resolve(root, "src") },
    ],
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8787",
      "/jogo-idle": {
        target: "http://localhost:8787",
        bypass: (req) => (req.url?.startsWith("/jogo-idle/admin") ? req.url : undefined),
      },
    },
  },
  build: {
    outDir: resolve(idleRoot, "public/jogo-idle/admin"),
    emptyOutDir: true,
  },
});
