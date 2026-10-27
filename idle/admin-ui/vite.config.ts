import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const idleRoot = resolve(root, "..");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/sinergia-idle/admin/",
  resolve: {
    alias: [
      {
        find: /^@\/lib\/sinergia-idle\/(.*)$/,
        replacement: resolve(idleRoot, "lib/sinergia-idle/$1"),
      },
      { find: "@", replacement: resolve(root, "src") },
    ],
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8787",
      "/sinergia-idle": {
        target: "http://localhost:8787",
        bypass: (req) => (req.url?.startsWith("/sinergia-idle/admin") ? req.url : undefined),
      },
    },
  },
  build: {
    outDir: resolve(idleRoot, "public/sinergia-idle/admin"),
    emptyOutDir: true,
  },
});
