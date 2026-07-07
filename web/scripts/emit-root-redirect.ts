import fs from "fs";
import path from "path";

// The site is fully localized under /it and /en, so there is no page at `/`.
// Emit a small static index.html at the export root that redirects the visitor
// to their preferred language (falls back to Italian, the primary locale).
// This keeps the redirect host-independent (no server / middleware needed).

const cwd = process.cwd();
const OUT_DIR = fs.existsSync(path.join(cwd, "out"))
  ? path.join(cwd, "out")
  : path.join(cwd, "web", "out");

if (!fs.existsSync(OUT_DIR)) {
  console.warn(`⚠ out/ not found at ${OUT_DIR}; skipping root redirect.`);
  process.exit(0);
}

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VCT Guida / Guide</title>
<meta http-equiv="refresh" content="0; url=/it/">
<script>
  (function () {
    var l = (navigator.language || "it").toLowerCase();
    window.location.replace(l.indexOf("en") === 0 ? "/en/" : "/it/");
  })();
</script>
</head>
<body>
<p>Redirecting… If nothing happens, choose a language:
<a href="/it/">Italiano</a> · <a href="/en/">English</a></p>
</body>
</html>
`;

fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf-8");
console.log("✓ Emitted out/index.html root language redirect");
