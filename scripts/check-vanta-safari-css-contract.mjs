import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const stylesPath = resolve(repoRoot, "src/styles.css");
const styles = readFileSync(stylesPath, "utf8");

function getDeclarationBlocks(css) {
  const blocks = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/gu;
  let match;

  while ((match = blockPattern.exec(css)) !== null) {
    blocks.push({
      selector: match[1].trim(),
      declarations: match[2],
    });
  }

  return blocks;
}

const blocks = getDeclarationBlocks(styles);

const missingWebkitBackdrop = blocks.filter(
  (block) =>
    /(^|\n)\s*backdrop-filter\s*:/u.test(block.declarations) &&
    !/(^|\n)\s*-webkit-backdrop-filter\s*:/u.test(block.declarations),
);

const missingWebkitMask = blocks.filter(
  (block) =>
    /(^|\n)\s*mask-image\s*:/u.test(block.declarations) &&
    !/(^|\n)\s*-webkit-mask-image\s*:/u.test(block.declarations),
);

assert.deepEqual(
  missingWebkitBackdrop.map((block) => block.selector),
  [],
  "Every backdrop-filter declaration in src/styles.css must include a paired -webkit-backdrop-filter for Safari.",
);

assert.deepEqual(
  missingWebkitMask.map((block) => block.selector),
  [],
  "Every mask-image declaration in src/styles.css must include a paired -webkit-mask-image for Safari.",
);

assert.match(
  styles,
  /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/u,
  "src/styles.css must include a fallback for browsers that cannot render glass blur consistently.",
);

assert.match(
  styles,
  /@supports not \(\(mask-image: linear-gradient\(black, transparent\)\) or \(-webkit-mask-image: linear-gradient\(black, transparent\)\)\)/u,
  "src/styles.css must include a fallback for browsers that cannot render masked grid fades consistently.",
);

console.log("Safari CSS contract passed.");
