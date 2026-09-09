#!/usr/bin/env node
/**
 * scrub-check — the private→public boundary, enforced instead of remembered.
 *
 * This repo is a hand-copied reference of a private codebase. Every refresh is a
 * human copying files across a boundary, so this script is the thing that catches
 * what a human forgets. Run it before every push:
 *
 *   node scripts/scrub-check.mjs
 *
 * It fails (exit 1) on any of:
 *   1. a file that must never be public (eas.json, *.p8, google-services.json, .env*, keys)
 *   2. a directory that belongs to the private engine (src/lib, packages)
 *   3. a credential-shaped string (Google API key, Anthropic/Stripe/GitHub tokens, PEM, JWT)
 *   4. a private term — a real address, production ids, on-device auth-store keys,
 *      internal table names, personal email
 *   4b. a term from an untracked `.scrub-private-terms.json`, if present — for terms that
 *      cannot be named in a public file (R&D device names, unfiled patent subject matter,
 *      feedstock specs, TTP scoring factors)
 *   5. an import in src/ that would only resolve privately, except what is private BY
 *      DESIGN and documented in src/README.md: `@/lib/*`, `@ml-systems/*`, image assets
 *   6. a `process.env.X` read that is not `EXPO_PUBLIC_*`
 *
 * No dependencies. Node 18+.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = relative(ROOT, fileURLToPath(import.meta.url)).split(sep).join("/");

const SKIP_DIRS = new Set([".git", "node_modules", "screenshots"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json", ".jsonld", ".txt", ".yml", ".yaml"]);

// 1 — files that must never be public.
const FORBIDDEN_FILES = [
  [/^eas\.json$/, "EAS config carries live API keys"],
  [/\.p8$/, "Apple signing key"],
  [/^google-services\.json$/, "Firebase / Google services config"],
  [/^GoogleService-Info\.plist$/, "Firebase / Google services config"],
  [/^\.env(\..*)?$/, "environment file"],
  [/\.(pem|key|keystore|jks|p12)$/, "key material"],
];

// 2 — directories that belong to the private engine.
const FORBIDDEN_DIRS = ["src/lib", "packages", "apps"];

// 3 — credential-shaped strings.
const SECRET_PATTERNS = [
  [/AIza[0-9A-Za-z_-]{35}/, "Google API key"],
  [/sk-ant-[A-Za-z0-9_-]{8,}/, "Anthropic API key"],
  [/sk_(live|test)_[A-Za-z0-9]{8,}/, "Stripe secret key"],
  [/ghp_[A-Za-z0-9]{36}/, "GitHub token"],
  [/xox[baprs]-[A-Za-z0-9-]{8,}/, "Slack token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "PEM private key"],
  [/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}/, "JWT"],
];

// 4 — private terms. Case-insensitive. Keep the reasons honest: they are what a
// future editor needs in order to decide whether a new hit is the same problem.
const PRIVATE_TERMS = [
  [/whitehall/i, "the founder's real test address — use the generic example home"],
  [/f1d0b933|b5fb538f/i, "production property / project ids"],
  [/salparvezml@gmail/i, "personal email — the public contact is the mlsystemsri.com address"],
  [/ml\.adminConfirmed|ml\.viewMode|ml\.sandboxFlipped/i, "on-device auth-store keys"],
  [/manualCustodianUnlock|webCustodianToggle/i, "operator-lens unlock mechanics — say 'admin-gated' and stop"],
  [/vc_entry_review|vc_agent_run/i, "review-state table names"],
  [/\b00(19|20|21)_[a-z]/i, "migration file names"],
];
// (The company's town is public — it is on the README and the LocalBusiness schema — so
// it is deliberately NOT a term. The address is what's private, and "whitehall" catches it.)

// 4b — local private terms. Some terms cannot be listed above, because this script is itself
// public and the list would be the disclosure it is meant to prevent: R&D device names,
// unfiled patent subject matter, feedstock specs, TTP scoring factors. Those live in an
// untracked `.scrub-private-terms.json` next to this repo, so the mechanism ships publicly
// and the list stays on disk. Shape:
//
//   { "terms": [ { "pattern": "some-term", "reason": "why it is private" } ] }
//
// Patterns are regex source, matched case-insensitively. A missing file is not an error —
// but if the file is present and malformed, that IS an error: a scrub list that silently
// fails to load is worse than no scrub list at all.
const LOCAL_TERMS_FILE = ".scrub-private-terms.json";
function loadLocalTerms() {
  const path = join(ROOT, LOCAL_TERMS_FILE);
  if (!existsSync(path)) return [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`scrub-check: ${LOCAL_TERMS_FILE} is present but is not valid JSON — ${err.message}`);
    process.exit(2);
  }
  const terms = parsed?.terms;
  if (!Array.isArray(terms)) {
    console.error(`scrub-check: ${LOCAL_TERMS_FILE} must contain a "terms" array.`);
    process.exit(2);
  }
  return terms.map(({ pattern, reason }, i) => {
    if (typeof pattern !== "string" || !pattern) {
      console.error(`scrub-check: ${LOCAL_TERMS_FILE} terms[${i}] is missing a "pattern" string.`);
      process.exit(2);
    }
    try {
      return [new RegExp(pattern, "i"), reason || "local private term"];
    } catch (err) {
      console.error(`scrub-check: ${LOCAL_TERMS_FILE} terms[${i}] pattern is not a valid regex — ${err.message}`);
      process.exit(2);
    }
  });
}
const LOCAL_PRIVATE_TERMS = loadLocalTerms();

// 5 — imports. `@/lib/*` and `@ml-systems/*` are private by design (documented in
// src/README.md), and image assets are not published; everything else must resolve
// inside src/.
const PRIVATE_BY_DESIGN = [/^@\/lib\//, /^@ml-systems\//, /\.(png|jpe?g|gif|webp|svg)$/i];

const findings = [];
const flag = (file, line, rule, detail) => findings.push({ file, line, rule, detail });

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).split(sep).join("/");
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (FORBIDDEN_DIRS.includes(rel)) flag(rel + "/", 0, "forbidden-dir", "belongs to the private engine");
      walk(full, out);
    } else {
      for (const [re, why] of FORBIDDEN_FILES) if (re.test(name)) flag(rel, 0, "forbidden-file", why);
      out.push({ full, rel });
    }
  }
  return out;
}

function resolvesInSrc(fromFile, spec) {
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : resolve(dirname(fromFile), spec);
  if (!base.startsWith(join(ROOT, "src"))) return false;
  const candidates = [base, ...[".tsx", ".ts", ".js", ".mjs"].map((e) => base + e), join(base, "index.tsx"), join(base, "index.ts")];
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

const files = walk(ROOT);
for (const { full, rel } of files) {
  if (rel === SELF) continue;
  // The local term list necessarily contains every term it forbids — scanning it would flag
  // it on every line. It is untracked; that is what keeps it out of the repo, not this skip.
  if (rel === LOCAL_TERMS_FILE) continue;
  if (!TEXT_EXT.has(extname(rel))) continue;
  const text = readFileSync(full, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((ln, i) => {
    for (const [re, why] of SECRET_PATTERNS) if (re.test(ln)) flag(rel, i + 1, "secret", why);
    for (const [re, why] of PRIVATE_TERMS) if (re.test(ln)) flag(rel, i + 1, "private-term", why);
    for (const [re, why] of LOCAL_PRIVATE_TERMS) if (re.test(ln)) flag(rel, i + 1, "local-private-term", why);
  });

  if (rel.startsWith("src/") && (rel.endsWith(".ts") || rel.endsWith(".tsx"))) {
    const importRe = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g;
    let m;
    while ((m = importRe.exec(text))) {
      const spec = m[1];
      const line = text.slice(0, m.index).split("\n").length;
      if (PRIVATE_BY_DESIGN.some((re) => re.test(spec))) continue;
      const local = spec.startsWith("@/") || spec.startsWith("./") || spec.startsWith("../");
      if (!local) continue;
      if (!resolvesInSrc(full, spec)) flag(rel, line, "unresolved-import", `${spec} — not in src/ and not private-by-design`);
    }
    const envRe = /process\.env\.([A-Za-z0-9_]+)/g;
    while ((m = envRe.exec(text))) {
      const name = m[1];
      if (name === "NODE_ENV" || name.startsWith("EXPO_PUBLIC_")) continue;
      flag(rel, text.slice(0, m.index).split("\n").length, "env", `process.env.${name} — only EXPO_PUBLIC_* may be read here`);
    }
  }
}

if (findings.length) {
  console.error(`scrub-check: ${findings.length} finding${findings.length === 1 ? "" : "s"} — do not push.\n`);
  for (const f of findings) console.error(`  ${f.file}${f.line ? ":" + f.line : ""}  [${f.rule}]  ${f.detail}`);
  process.exit(1);
}
const localNote = LOCAL_PRIVATE_TERMS.length
  ? `${LOCAL_PRIVATE_TERMS.length} local terms`
  : `no ${LOCAL_TERMS_FILE} — local terms not enforced`;
console.log(`scrub-check: clean — ${files.length} files, ${findings.length} findings (${localNote}).`);
