import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bundle server.mjs
await esbuild.build({
  entryPoints: ["app/server-src.mjs"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "app/server.mjs",
  external: ["better-sqlite3"],
  minify: true,
  sourcemap: false,
});

console.log("✓ Bundled app/server.mjs");

// Copy public files
mkdirSync("public", { recursive: true });
copyFileSync("../../artifacts/diagnostic-erp/dist/index.html", "public/index.html");
copyFileSync("../../artifacts/diagnostic-erp/dist/assets/index.css", "public/styles.css");
copyFileSync("../../artifacts/diagnostic-erp/dist/assets/index.js", "public/app.js");

console.log("✓ Copied public files");
console.log("\nBuild complete. Ready for USB deployment.");
