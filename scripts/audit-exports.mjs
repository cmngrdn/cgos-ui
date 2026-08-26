#!/usr/bin/env node
/**
 * AN ATOM THAT IS NOT IN `exports` DOES NOT EXIST TO ANY CONSUMER.
 *
 * `package.json` lists every subpath explicitly (`"./ui/Button"`,
 * `"./ui/Button.css"`, …). Node and TypeScript both refuse anything not listed,
 * so a file added under `ui/` and shipped in a tagged release still fails in
 * every consumer with `TS2307: Cannot find module 'cgos-ui/ui/X'`.
 *
 * Nothing here catches that on its own. The file is present, this repo has no
 * build to fail, and the breakage surfaces only in a consumer — AFTER the tag
 * is cut, after the consumer bumps its pin, and after somebody has spent time
 * wondering why a brand-new atom cannot be imported. `TagListField` shipped
 * that way in v0.51.0 and needed v0.51.1 within the minute.
 *
 * That is the most expensive possible place to find a one-line omission, which
 * is exactly what a gate is for. This runs in CI on every push and PR, needs no
 * dependencies, and takes about a second.
 *
 * Usage: node scripts/audit-exports.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const exp = pkg.exports ?? {};

/**
 * Files under `ui/` that are deliberately internal — imported by a sibling
 * atom with a relative path, never by a consumer. Add sparingly and say why:
 * the default assumption is that anything in `ui/` is meant to be importable,
 * and an entry here is a claim that it isn't.
 */
const INTERNAL = new Set([]);

const problems = [];

for (const file of readdirSync(join(ROOT, "ui"))) {
  if (INTERNAL.has(file)) continue;

  if (file.endsWith(".tsx")) {
    const key = `./ui/${file.replace(/\.tsx$/, "")}`;
    if (!exp[key]) {
      problems.push(
        `ui/${file} has no "${key}" entry — every consumer gets TS2307 on import.`,
      );
      continue;
    }
    // An entry that points at the wrong file is the same failure wearing a
    // passing check, so verify the target rather than the key alone.
    const target = exp[key]?.import ?? exp[key];
    if (target !== `./ui/${file}`) {
      problems.push(
        `"${key}" resolves to ${target}, not ./ui/${file}.`,
      );
    }
  }

  if (file.endsWith(".css")) {
    const key = `./ui/${file}`;
    // A companion stylesheet imported RELATIVELY by its atom does not strictly
    // need an entry — but every other atom's does have one, and a consumer that
    // wants to import the sheet directly (to reorder the cascade, or to load it
    // without the component) can only do so if it is listed. Consistency here
    // costs one line and removes a question nobody should have to ask.
    if (!exp[key]) {
      problems.push(
        `ui/${file} has no "${key}" entry — a consumer cannot import the stylesheet directly.`,
      );
    }
  }
}

// The reverse direction: an entry pointing at a file that no longer exists is
// a broken import waiting for the first person to follow the inventory.
const uiFiles = new Set(readdirSync(join(ROOT, "ui")));
for (const key of Object.keys(exp)) {
  if (!key.startsWith("./ui/")) continue;
  const target = exp[key]?.import ?? exp[key];
  if (typeof target !== "string") continue;
  const name = target.replace(/^\.\/ui\//, "");
  if (!uiFiles.has(name)) {
    problems.push(`"${key}" points at ui/${name}, which does not exist.`);
  }
}

// lib/ has the same failure mode as ui/ and was not checked. A module can be
// written, tested, committed and TAGGED, and still be unreachable from every
// consumer — Node resolves a subpath ONLY if the exports map names it, so the
// import fails with "Cannot find module" long after the release looks done.
// That is not hypothetical: lib/sms-body.ts shipped in v0.54.0 and could not be
// imported until v0.54.1, and this audit passed both times because it only ever
// checked the direction that was already covered (every ENTRY resolves), never
// the one that bites (every MODULE is entered).
// .tsx counts — lib/activity.tsx is a lib module that happens to render.
const libFiles = readdirSync(join(ROOT, "lib")).filter(
  (f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts") && !/\.test\.tsx?$/.test(f),
);
const libKeys = new Set(
  Object.keys(exp)
    .filter((k) => k.startsWith("./lib/"))
    .map((k) => k.replace(/^\.\/lib\//, "")),
);
for (const file of libFiles) {
  const bare = file.replace(/\.tsx?$/, "");
  if (!libKeys.has(bare)) {
    problems.push(
      `lib/${file} has no "./lib/${bare}" entry — it is unreachable from every ` +
        `consumer no matter what version it ships in.`,
    );
  }
}
for (const key of Object.keys(exp)) {
  if (!key.startsWith("./lib/")) continue;
  const target = exp[key]?.import ?? exp[key];
  if (typeof target !== "string") continue;
  const name = target.replace(/^\.\/lib\//, "");
  if (!libFiles.includes(name)) {
    problems.push(`"${key}" points at lib/${name}, which does not exist.`);
  }
}

if (problems.length) {
  console.error("\n[exports] cgos-ui export map is out of step with ui/:\n");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    "\n  Add the entry to `exports` in package.json, in the SAME commit as the\n" +
      "  file. The shape is:\n\n" +
      '    "./ui/Thing":     { "types": "./ui/Thing.tsx", "import": "./ui/Thing.tsx" },\n' +
      '    "./ui/Thing.css": "./ui/Thing.css"\n' +
      '    "./lib/thing":    { "types": "./lib/thing.ts",  "import": "./lib/thing.ts" }\n',
  );
  process.exit(1);
}

const atoms = readdirSync(join(ROOT, "ui")).filter((f) => f.endsWith(".tsx")).length;
console.log(`[exports] ✓ ${atoms} atoms, every one importable and every entry resolving.`);
