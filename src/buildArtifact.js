const CODE_BLOCK_PATTERN = /```([^\n\r`]*)\r?\n([\s\S]*?)```/g;

function languageName(value = "") {
  return value.trim().split(/\s+/)[0].toLowerCase();
}

function insertBefore(document, closingTag, content) {
  if (!content) return document;
  const closingPattern = new RegExp(`</${closingTag}>`, "i");
  return closingPattern.test(document)
    ? document.replace(closingPattern, `${content}\n</${closingTag}>`)
    : `${document}\n${content}`;
}

export function extractBuildDocument(markdown = "") {
  const blocks = [...markdown.matchAll(CODE_BLOCK_PATTERN)].map((match) => ({
    language: languageName(match[1]),
    code: match[2].trim(),
  }));

  const htmlBlock = blocks.find(({ language, code }) =>
    ["html", "htm"].includes(language) || /<!doctype html|<html[\s>]/i.test(code)
  );

  if (!htmlBlock) return "";

  const styles = blocks
    .filter(({ language }) => language === "css")
    .map(({ code }) => code)
    .join("\n\n");
  const scripts = blocks
    .filter(({ language }) => ["js", "javascript"].includes(language))
    .map(({ code }) => code)
    .join("\n\n");
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:;">';

  let document = htmlBlock.code;
  if (!/<html[\s>]/i.test(document)) {
    document = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>ELL-EX Build</title>\n</head>\n<body>\n${document}\n</body>\n</html>`;
  }

  document = insertBefore(document, "head", `${policy}${styles ? `\n<style>\n${styles}\n</style>` : ""}`);
  document = insertBefore(document, "body", scripts ? `<script>\n${scripts}\n</script>` : "");

  return document;
}

export function buildDownload(markdown = "") {
  const html = extractBuildDocument(markdown);
  return html
    ? { content: html, filename: "ell-ex-build.html", type: "text/html" }
    : { content: markdown, filename: "ell-ex-build.md", type: "text/markdown" };
}
