#!/usr/bin/env node
/**
 * design-lint — deterministic gate for landing-page-design Part B.
 *
 * Usage: node scripts/design-lint.mjs [rootDir]
 * Exit 1 if any error-level violation is found, 0 otherwise.
 *
 * Why this exists: model quality varies, rules do not. This runs the same
 * checks regardless of which model wrote the code, so a cheaper model cannot
 * silently reintroduce banned fonts, arbitrary spacing, or default easing.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.argv[2] ?? ".";
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out", "coverage",
  ".venv", "venv", "__pycache__", ".turbo", ".vercel", "worktrees",
]);
const CODE_EXT = new Set([".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte", ".html"]);
const CSS_EXT = new Set([".css", ".scss", ".pcss"]);

const BANNED_FONTS = /\b(Inter|Roboto|Arial|Helvetica|Open Sans)\b/i;
const ARBITRARY = /\b(?:text|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|w|h|min-w|min-h|max-w|rounded|leading|tracking|size)-\[[^\]]+\]/g;
const BLACK_WEIGHT = /\bfont-black\b|\bfont-\[(?:800|900)\]/g;
const ITALIC = /\bitalic\b|\bfont-style:\s*italic/g;
const BG_GRADIENT = /\bbg-gradient-to-[a-z]+\b/g;
const DEFAULT_EASE = /\btransition-all\b|\bease-in-out\b|\bease-linear\b|\bease-in\b|\bease-out\b/g;
const SCROLL_LISTENER = /addEventListener\(\s*["']scroll["']/g;
const HARD_HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const SINGLE_BORDER = /\brounded-[a-z0-9]+\b[^"'`]*\bborder-(?:t|b|l|r)\b|\bborder-(?:t|b|l|r)\b[^"'`]*\brounded-[a-z0-9]+\b/g;
const WINDOW_ALERT = /\bwindow\.alert\(/g;
const DEAD_LINK = /href=["']#["']/g;

const RULES = [
  { id: "banned-font", level: "error", re: BANNED_FONTS, msg: "banned typeface (use Geist / Manrope / Geist Mono / Poppins; one family per site)" },
  { id: "arbitrary-value", level: "error", re: ARBITRARY, msg: "arbitrary Tailwind value — snap to the type/spacing scale" },
  { id: "black-weight", level: "error", re: BLACK_WEIGHT, msg: "weight above bold — cap at semibold/bold" },
  { id: "italic", level: "error", re: ITALIC, msg: "italic text is banned in the interface" },
  { id: "bg-gradient", level: "error", re: BG_GRADIENT, msg: "background gradient — backgrounds must be flat (text gradients are allowed)" },
  { id: "default-ease", level: "error", re: DEFAULT_EASE, msg: "default easing / transition-all — use the approved cubic-bezier and name the properties" },
  { id: "scroll-listener", level: "error", re: SCROLL_LISTENER, msg: "unthrottled scroll listener — use IntersectionObserver" },
  { id: "single-border", level: "warn", re: SINGLE_BORDER, msg: "one-sided border on a rounded card — border all sides or none" },
  { id: "hardcoded-hex", level: "warn", re: HARD_HEX, msg: "hardcoded hex outside tokens" },
  { id: "window-alert", level: "error", re: WINDOW_ALERT, msg: "window.alert — use an inline error state" },
  { id: "dead-link", level: "warn", re: DEAD_LINK, msg: 'dead link href="#"' },
];

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(full);
    } else {
      yield full;
    }
  }
}

const findings = [];
for (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!CODE_EXT.has(ext) && !CSS_EXT.has(ext)) continue;
  // tokens are allowed to define raw values; only stylesheets named globals/theme are exempt
  const isTokenFile = /(globals|theme|tokens|clerk-appearance)\.(css|scss|ts|js)$/i.test(file);
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  for (const rule of RULES) {
    if (rule.id === "bg-gradient" && /\.svg$/.test(file)) continue;
    if ((rule.id === "hardcoded-hex" || rule.id === "arbitrary-value" || rule.id === "default-ease") && isTokenFile) continue;
    if (rule.id === "arbitrary-value" && CSS_EXT.has(ext)) continue;

    lines.forEach((line, i) => {
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
      // text-clipped gradients are the one allowed gradient (hero heading)
      if (rule.id === "bg-gradient" && /\bbg-clip-text\b/.test(line)) return;
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (m) {
        findings.push({
          level: rule.level,
          rule: rule.id,
          file: relative(ROOT, file),
          line: i + 1,
          match: m[0].slice(0, 48),
          msg: rule.msg,
        });
      }
    });
  }
}

findings.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line, undefined, { numeric: true }));

const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");
const fmt = (f) => `${f.level === "error" ? "ERR " : "WARN"} ${f.file}:${f.line}  [${f.rule}]  ${f.match}\n       ${f.msg}`;

if (findings.length === 0) {
  console.log(`design-lint: clean (${ROOT})`);
  process.exit(0);
}

for (const f of findings) console.log(fmt(f));
console.log(`\ndesign-lint: ${errors.length} error(s), ${warns.length} warning(s) in ${ROOT}`);
process.exit(errors.length > 0 ? 1 : 0);
