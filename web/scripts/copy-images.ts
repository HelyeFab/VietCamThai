import fs from "fs";
import path from "path";

// Find guida/ from either web/ or project root
const cwd = process.cwd();
const SRC = fs.existsSync(path.join(cwd, "guida"))
  ? path.join(cwd, "guida", "assets", "images")
  : path.join(cwd, "..", "guida", "assets", "images");
const DEST = fs.existsSync(path.join(cwd, "public"))
  ? path.join(cwd, "public", "images")
  : path.join(cwd, "web", "public", "images");

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(SRC, DEST);
const count = fs
  .readdirSync(DEST, { recursive: true })
  .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(String(f))).length;
console.log(`✓ Copied ${count} images to public/images/`);
