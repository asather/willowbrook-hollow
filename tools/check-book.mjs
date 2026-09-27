#!/usr/bin/env node
/*
 * Willowbrook Hollow — book checker
 *
 *   node tools/check-book.mjs books/acorn-001/book.json
 *   node tools/check-book.mjs --all
 *
 * 1. Validates manifest.json, every book.json and every circles/<circle>/words.json
 *    against the schemas in /docs.
 * 2. Checks a book's reader-facing text (pages and quiz) against its Circle's rules:
 *    syllable limit, spelling patterns in scope, sentence length, page / chapter / book length,
 *    and the number of story words used.
 *
 * Words that are always allowed: proper names (circles/names.json), heart words and story
 * words from this Circle and every earlier Circle.
 *
 * Exit code 0 = everything passes; 1 = at least one problem was reported.
 * No dependencies — runs on any Node 18+.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const S = require(path.join(ROOT, "js/syllables.js"));

const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
let problems = 0;
const fail = (msg) => { problems++; console.log("  ✗ " + msg); };
const ok = (msg) => console.log("  ✓ " + msg);
const info = (msg) => console.log("    " + msg);

/* ---------- minimal JSON Schema validator (the subset our schemas use) ---------- */
function validate(schema, data, where = "$", root = schema) {
  const errs = [];
  if (schema.$ref) {
    const ref = schema.$ref.replace(/^#\//, "").split("/").reduce((o, k) => o[k], root);
    return validate(ref, data, where, root);
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter(s => validate(s, data, where, root).length === 0);
    if (passing.length !== 1) errs.push(`${where}: must match exactly one allowed shape`);
    return errs;
  }
  const t = schema.type;
  const typeOf = (v) => v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
  if (t) {
    const types = Array.isArray(t) ? t : [t];
    const actual = typeOf(data);
    const okType = types.some(x => x === actual || (x === "number" && actual === "integer"));
    if (!okType) { errs.push(`${where}: expected ${types.join("|")}, got ${actual}`); return errs; }
  }
  if (schema.enum && !schema.enum.includes(data)) errs.push(`${where}: must be one of ${schema.enum.join(", ")}`);
  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) errs.push(`${where}: must be ≥ ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum) errs.push(`${where}: must be ≤ ${schema.maximum}`);
  }
  if (typeof data === "string" && schema.pattern && !new RegExp(schema.pattern).test(data)) errs.push(`${where}: does not match ${schema.pattern}`);
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) errs.push(`${where}: needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && data.length > schema.maxItems) errs.push(`${where}: allows at most ${schema.maxItems} item(s)`);
    if (schema.items) data.forEach((v, i) => errs.push(...validate(schema.items, v, `${where}[${i}]`, root)));
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    (schema.required || []).forEach(k => { if (!(k in data)) errs.push(`${where}: missing "${k}"`); });
    const props = schema.properties || {};
    Object.keys(data).forEach(k => {
      if (props[k]) errs.push(...validate(props[k], data[k], `${where}.${k}`, root));
      else if (schema.additionalProperties === false) errs.push(`${where}: unexpected field "${k}"`);
      else if (typeof schema.additionalProperties === "object") errs.push(...validate(schema.additionalProperties, data[k], `${where}.${k}`, root));
    });
  }
  return errs;
}

function schemaCheck(schemaFile, dataFile) {
  const errs = validate(readJSON(schemaFile), readJSON(dataFile));
  if (errs.length) errs.forEach(e => fail(`${dataFile} ${e}`));
  else ok(`${dataFile} matches ${path.basename(schemaFile)}`);
}

/* ---------- text analysis ---------- */
const manifest = readJSON("manifest.json");
const CIRCLES = manifest.circles;
const names = new Map(readJSON("circles/names.json").names.map(n => [n.name.toLowerCase(), n]));

function circleData(circle) {
  const idx = CIRCLES.indexOf(circle);
  const own = readJSON(`circles/${circle.toLowerCase()}/words.json`);
  const heart = new Set(), story = new Map();
  CIRCLES.slice(0, idx + 1).forEach(c => {
    const d = readJSON(`circles/${c.toLowerCase()}/words.json`);
    (d.heartWords || []).forEach(w => heart.add(w.toLowerCase()));
    (d.words || []).forEach(w => story.set(w.word.toLowerCase(), { ...w, circle: c }));
  });
  return { rules: own.rules, heart, story, ownStory: new Set((own.words || []).map(w => w.word.toLowerCase())) };
}

const CONTRACTIONS = { "won't": "will", "can't": "can", "i'm": "i", "i'll": "i", "i've": "i", "i'd": "i" };
function normalise(token) {
  let w = token.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, "");
  if (!w) return null;
  if (CONTRACTIONS[w]) return CONTRACTIONS[w];
  w = w.replace(/'s$/, "").replace(/n't$/, "").replace(/'(ll|re|ve|d|m)$/, "");
  return w.replace(/'/g, "");
}

// Story words may appear with simple endings (strings, practiced).
function lookupStory(w, story) {
  if (story.has(w)) return w;
  for (const end of ["s", "es", "ed", "d", "ing"]) {
    if (w.endsWith(end) && story.has(w.slice(0, -end.length))) return w.slice(0, -end.length);
  }
  return null;
}

function sentences(text) {
  return text.replace(/[“”]/g, '"').split(/(?<=[.!?…]["'’”)]*)\s+/).map(s => s.trim()).filter(s => /[A-Za-z]/.test(s));
}
const wordsIn = (text) => text.split(/[\s—–-]+/).map(normalise).filter(Boolean).filter(w => /[a-z]/.test(w));

function checkBook(bookPath) {
  const book = readJSON(bookPath);
  console.log(`\n${book.title} (${book.bookId}, ${book.circle} Circle)`);
  const ids = new Set(book.chapters.map(c => c.id));
  book.toc.filter(t => t.type === "chapter").forEach(t => { if (!ids.has(t.anchor)) fail(`toc "${t.label}" points to missing chapter "${t.anchor}"`); });
  book.chapters.flatMap(c => c.pages).forEach((pg, i) => { if (pg.number !== i + 1) fail(`page numbers must run 1, 2, 3…; found ${pg.number} at position ${i + 1}`); });
  const bios = readJSON("docs/character-bios.json");
  book.cast.forEach(id => { if (!bios[id]) fail(`cast member "${id}" has no entry in docs/character-bios.json`); });
  const { rules, heart, story, ownStory } = circleData(book.circle);

  const flagged = new Map();   // word -> reason
  const storyUsed = new Set();
  const allSentences = [];
  let bookWords = 0;

  const checkText = (text, where) => {
    const ws = wordsIn(text);
    ws.forEach(w => {
      if (names.has(w)) return;
      const sw = lookupStory(w, story);
      if (sw) { storyUsed.add(sw); return; }
      if (heart.has(w)) return;
      const syl = S.count(w);
      if (rules.maxSyllables && syl > rules.maxSyllables) flagged.set(w, `${syl} syllables (${S.split(w).join("-")}) — limit ${rules.maxSyllables}`);
      for (const p of rules.outOfScope || []) {
        if (new RegExp(p.pattern).test(w)) { flagged.set(w, `spelling pattern not yet in scope: ${p.label}`); break; }
      }
    });
    sentences(text).forEach(s => {
      const n = wordsIn(s).length;
      allSentences.push(n);
      if (n > rules.maxSentenceWords) fail(`${where}: sentence has ${n} words (limit ${rules.maxSentenceWords}): "${s}"`);
    });
    return ws.length;
  };

  book.chapters.forEach(ch => {
    let chWords = 0;
    ch.pages.forEach(pg => {
      const n = pg.text.reduce((sum, t) => sum + checkText(t, `page ${pg.number}`), 0);
      chWords += n;
      if (n < rules.pageWords[0] || n > rules.pageWords[1]) fail(`page ${pg.number}: ${n} words (range ${rules.pageWords.join("–")})`);
      if (!pg.media || !pg.media.length) fail(`page ${pg.number}: no art`);
    });
    checkText(ch.title.replace(/^Chapter \d+:\s*/, ""), `${ch.id} title`);
    bookWords += chWords;
    if (chWords < rules.chapterWords[0] || chWords > rules.chapterWords[1]) fail(`${ch.id} "${ch.title}": ${chWords} words (range ${rules.chapterWords.join("–")})`);
    else info(`${ch.id}: ${chWords} words`);
  });

  (book.quiz?.questions || []).forEach(q => {
    checkText(q.prompt, `quiz ${q.id}`);
    q.choices.forEach(c => checkText(c, `quiz ${q.id} choice`));
  });

  if (bookWords < rules.bookWords[0] || bookWords > rules.bookWords[1]) fail(`book has ${bookWords} words (range ${rules.bookWords.join("–")})`);
  else ok(`book length ${bookWords} words (range ${rules.bookWords.join("–")})`);

  const avg = allSentences.reduce((a, b) => a + b, 0) / allSentences.length;
  const [lo, hi] = rules.avgSentenceWords;
  if (avg < lo || avg > hi) fail(`average sentence ${avg.toFixed(1)} words (target ${lo}–${hi})`);
  else ok(`average sentence ${avg.toFixed(1)} words (target ${lo}–${hi}); longest ${Math.max(...allSentences)}`);

  if (storyUsed.size > rules.maxStoryWordsPerBook) fail(`${storyUsed.size} story words used (limit ${rules.maxStoryWordsPerBook})`);
  else ok(`story words used (${storyUsed.size}/${rules.maxStoryWordsPerBook}): ${[...storyUsed].join(", ") || "none"}`);
  [...storyUsed].filter(w => !ownStory.has(w)).forEach(w => info(`"${w}" is a story word from an earlier Circle`));

  if (flagged.size) [...flagged].forEach(([w, why]) => fail(`"${w}": ${why}`));
  else ok("every word is within the Circle's syllable and spelling rules");

  // Informational: Flesch–Kincaid grade of the page text
  const allText = book.chapters.flatMap(c => c.pages.flatMap(p => p.text)).join(" ");
  const ws = wordsIn(allText);
  const syl = ws.reduce((a, w) => a + (names.get(w)?.syllables.length || S.count(w)), 0);
  const fk = 0.39 * (ws.length / allSentences.length) + 11.8 * (syl / ws.length) - 15.59;
  info(`Flesch–Kincaid grade (for reference only): ${fk.toFixed(1)}`);
}

/* ---------- levelled text outside books: character bios and the About page ---------- */
function checkLevelledText() {
  console.log("\nCharacter bios and About text (each level checked against its Circle's word rules)");
  const bios = readJSON("docs/character-bios.json");
  const about = readJSON("docs/about.json");
  let before = problems;
  CIRCLES.forEach(c => {
    const key = c.toLowerCase();
    const { rules, heart, story } = circleData(c);
    const texts = Object.entries(bios).map(([id, b]) => [`bio ${id} (${key})`, b.levels[key]]);
    if (about.levels[key]) texts.push([`about (${key})`, about.levels[key]]);
    texts.forEach(([where, text]) => {
      if (!text) { fail(`${where}: missing`); return; }
      const bad = new Set();
      wordsIn(text).forEach(w => {
        if (names.has(w) || lookupStory(w, story) || heart.has(w)) return;
        if (rules.maxSyllables && S.count(w) > rules.maxSyllables) bad.add(`${w} (${S.split(w).join("-")})`);
        else if ((rules.outOfScope || []).some(p => new RegExp(p.pattern).test(w))) bad.add(w);
      });
      if (bad.size) fail(`${where}: outside ${c} word rules: ${[...bad].join(", ")}`);
      sentences(text).forEach(sn => { const n = wordsIn(sn).length; if (n > rules.maxSentenceWords) fail(`${where}: ${n}-word sentence (limit ${rules.maxSentenceWords})`); });
    });
  });
  if (problems === before) ok("all levels within their Circle's word rules");
}

/* ---------- run ---------- */
const args = process.argv.slice(2);
console.log("Schemas");
schemaCheck("docs/manifest.schema.json", "manifest.json");
CIRCLES.forEach(c => schemaCheck("docs/words.schema.json", `circles/${c.toLowerCase()}/words.json`));
const bookPaths = args.includes("--all") || !args.length
  ? manifest.books.map(b => b.path.replace(/^\.\//, ""))
  : args.filter(a => !a.startsWith("--"));
bookPaths.forEach(p => schemaCheck("docs/book.schema.json", p));
manifest.books.forEach(b => {
  if (!CIRCLES.includes(b.circle)) fail(`manifest: book ${b.bookId} uses unknown Circle "${b.circle}"`);
  if (!fs.existsSync(path.join(ROOT, b.path))) fail(`manifest: ${b.path} does not exist`);
});
// Circle word files: no duplicates, syllables spell the word, circle matches folder
CIRCLES.forEach(c => {
  const f = `circles/${c.toLowerCase()}/words.json`, d = readJSON(f);
  if (d.circle !== c) fail(`${f}: "circle" is "${d.circle}", expected "${c}"`);
  const seen = new Set();
  [...(d.heartWords || []), ...(d.words || []).map(w => w.word)].forEach(w => {
    const k = w.toLowerCase();
    if (seen.has(k)) fail(`${f}: "${w}" is listed twice`);
    seen.add(k);
  });
  (d.words || []).forEach(w => { if (w.syllables.join("").toLowerCase() !== w.word.toLowerCase()) fail(`${f}: syllables of "${w.word}" spell "${w.syllables.join("")}"`); });
});
readJSON("circles/names.json").names.forEach(n => { if (n.syllables.join("") !== n.name) fail(`circles/names.json: syllables of "${n.name}" spell "${n.syllables.join("")}"`); });
CIRCLES.forEach(c => {
  const list = manifest.books.filter(b => b.circle === c);
  const cer = list.filter(b => b.ceremony);
  if (cer.length > 1) fail(`manifest: Circle ${c} has ${cer.length} ceremony books`);
  if (cer.length === 1 && list[list.length - 1] !== cer[0]) fail(`manifest: ${cer[0].bookId} is the ${c} ceremony book but is not the Circle's last book`);
});

bookPaths.forEach(checkBook);
checkLevelledText();

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll checks passed.");
process.exit(problems ? 1 : 0);
