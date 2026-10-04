import test from "node:test";
import assert from "node:assert/strict";
import { buildDownload, extractBuildDocument } from "../src/buildArtifact.js";

test("combines separate HTML, CSS and JavaScript blocks", () => {
  const result = extractBuildDocument(`
\`\`\`html
<main><h1>Bakery</h1></main>
\`\`\`
\`\`\`css
h1 { color: chocolate; }
\`\`\`
\`\`\`javascript
document.querySelector('h1').textContent += ' shop';
\`\`\`
  `);

  assert.match(result, /<!doctype html>/i);
  assert.match(result, /<style>[\s\S]*color: chocolate/);
  assert.match(result, /<script>[\s\S]*textContent/);
  assert.match(result, /Content-Security-Policy/);
});

test("keeps a complete standalone HTML build downloadable", () => {
  const result = buildDownload("```html\n<!doctype html><html><head></head><body>Ready</body></html>\n```");

  assert.equal(result.filename, "ell-ex-build.html");
  assert.equal(result.type, "text/html");
  assert.match(result.content, /Ready/);
});

test("downloads non-HTML build guidance as Markdown", () => {
  const result = buildDownload("## Build plan\n\nUse React.");

  assert.equal(result.filename, "ell-ex-build.md");
  assert.equal(result.type, "text/markdown");
});
