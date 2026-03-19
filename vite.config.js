import {defineConfig} from "vite";
import {resolve} from "path";

export default defineConfig({
  // Settings
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        'fuel-calculator': resolve(__dirname, "fuel-calculator.html"),
      }
    }
  }
});