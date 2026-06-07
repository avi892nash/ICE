import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The units under test are pure TS modules (candidate parsing, signal
    // encode/decode, scenario data). No DOM needed — `btoa`/`atob` are Node
    // globals, and the WebRTC types are erased at runtime.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
