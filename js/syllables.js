/*
 * Willowbrook Hollow — syllable splitter
 *
 * Splits an English word into syllables using the classroom division rules readers
 * are taught (closed, open, vowel-consonant-e, vowel team, r-controlled and
 * consonant-le syllables; VC/CV, V/CV and V/V division; suffixes split off first).
 *
 * The reader app uses it when a child taps a word, and tools/check-book.mjs uses it
 * to check each Circle's syllable limits, so both always agree.
 * A word's `syllables` entry in its Circle's words.json always wins over this splitter.
 *
 * Works in the browser (window.WillowSyllables) and in Node (module.exports).
 */
(function (root) {
  const VOWELS = "aeiou";
  const VOWEL_TEAMS = ["eigh", "igh", "augh", "ough", "ai", "ay", "ea", "ee", "ey", "ei", "ie", "oa", "oe", "oi", "oy", "ou", "ow", "oo", "ue", "ew", "au", "aw", "ui"];
  const CONS_UNITS = ["tch", "dge", "sch", "shr", "thr", "chr", "sh", "ch", "th", "wh", "ph", "ck", "ng", "qu", "gh", "kn", "wr", "gn"];
  // Blends that stay together at the start of a syllable (V/CCV) when the first vowel is long.
  const BLENDS = ["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw", "thr", "shr", "str", "spr", "scr", "spl"];
  const SUFFIXES = ["ing", "est", "ness", "less", "ful", "ly", "er", "ed", "es", "s", "y"];
  const PREFIXES = ["un", "re", "dis", "mis", "pre"];

  function isVowelAt(w, i) {
    const c = w[i];
    if (!c) return false;
    if (VOWELS.includes(c)) {
      // "u" after "q" belongs to the consonant unit "qu".
      if (c === "u" && w[i - 1] === "q") return false;
      return true;
    }
    if (c === "y") {
      // y is a vowel unless it starts the word or is followed by a vowel.
      return i > 0 && !VOWELS.includes(w[i + 1] || "");
    }
    return false;
  }

  // Tokenise into units: {t: text, v: bool}
  function units(w) {
    const out = [];
    let i = 0;
    while (i < w.length) {
      let matched = null;
      // r-controlled vowel: vowel + r (not followed by another r or a vowel)
      if (isVowelAt(w, i) && w[i + 1] === "r" && !isVowelAt(w, i + 2) && w[i + 2] !== "r") {
        matched = { t: w.slice(i, i + 2), v: true };
      }
      if (!matched) {
        for (const team of VOWEL_TEAMS) {
          if (w.startsWith(team, i) && isVowelAt(w, i)) {
            // "ow"/"ay"/"ey"/"aw"/"ew" teams end with w/y — accept.
            matched = { t: team, v: true };
            break;
          }
        }
      }
      if (!matched && isVowelAt(w, i)) matched = { t: w[i], v: true };
      if (!matched) {
        for (const cu of CONS_UNITS) {
          if (w.startsWith(cu, i)) { matched = { t: cu, v: false }; break; }
        }
      }
      if (!matched) matched = { t: w[i], v: false };
      out.push(matched);
      i += matched.t.length;
    }
    return out;
  }

  // Split a base word (no suffix handling) into syllables.
  function splitBase(w) {
    if (w.length <= 3) return [w];
    let u = units(w);

    // consonant-le ending: "-ble", "-tle", "-ckle" ... → own syllable
    let tail = null;
    if (/[^aeiouy]le$/.test(w) && u.filter(x => x.v).length > 1) {
      const cons = w[w.length - 3];
      tail = cons + "le";
      w = w.slice(0, -3);
      if (w.endsWith("c") && cons === "k") { /* "ckle": keep ck together */ tail = "ckle"; w = w.slice(0, -1); }
      u = units(w);
    }

    // silent final e (vowel-consonant-e): merge into previous syllable
    const vowelIdx = u.map((x, i) => (x.v ? i : -1)).filter(i => i >= 0);
    if (u.length >= 3 && u[u.length - 1].t === "e" && !u[u.length - 2].v && vowelIdx.length > 1) {
      u[u.length - 2] = { t: u[u.length - 2].t + "e", v: false };
      u.pop();
    }

    const nuclei = u.map((x, i) => (x.v ? i : -1)).filter(i => i >= 0);
    if (nuclei.length <= 1) return tail ? [w, tail].filter(Boolean) : [w];

    const cuts = []; // index in u where a new syllable starts
    for (let k = 0; k < nuclei.length - 1; k++) {
      const a = nuclei[k], b = nuclei[k + 1];
      const between = b - a - 1;
      if (between === 0) cuts.push(b); // V/V
      else if (between === 1) {
        // V/CV (open) by default; keep closed when the vowel is short-looking before x or double letter
        const c = u[a + 1].t;
        if (c === "x" || c === "ck" || c === "ng" || c === "tch" || c === "dge") cuts.push(a + 2);
        else cuts.push(a + 1);
      } else if (between === 2) {
        // VC/CV: split between the two consonant units (rab-bit, sis-ter)
        cuts.push(a + 2);
      } else {
        // three or more consonants: keep a final blend together (hun-dred, mon-ster), else split after the second (sand-wich)
        const lastTwo = u[b - 2].t + u[b - 1].t;
        cuts.push(BLENDS.includes(lastTwo) ? b - 2 : b - 1);
      }
    }
    const sylls = [];
    let start = 0;
    for (const c of cuts) { sylls.push(u.slice(start, c).map(x => x.t).join("")); start = c; }
    sylls.push(u.slice(start).map(x => x.t).join(""));
    if (tail) sylls.push(tail);
    return sylls.filter(Boolean);
  }

  function split(word) {
    const raw = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!raw) return [];
    // prefixes
    for (const p of PREFIXES) {
      if (raw.startsWith(p) && raw.length - p.length >= 3 && units(raw.slice(p.length)).some(x => x.v) && !VOWELS.includes(raw[p.length])) {
        const rest = split(raw.slice(p.length));
        if (rest.length) return [p, ...rest];
      }
    }
    // suffixes
    for (const s of SUFFIXES) {
      if (!raw.endsWith(s) || raw.length - s.length < 2) continue;
      let base = raw.slice(0, -s.length);
      if (!units(base).some(x => x.v)) continue;
      if (s === "s") {
        if (base.endsWith("s") && !base.endsWith("ss")) continue;
        return attach(split(base), "s");
      }
      if (s === "es") {
        if (/(s|x|z|ch|sh)$/.test(base)) return [...split(base), "es"];
        continue; // "es" otherwise handled as silent-e + s
      }
      if (s === "ed") {
        if (/[^aeiou][rl]$/.test(base) && !/(rl|ll)$/.test(base)) continue; // hundred, kindred
        if (/[td]$/.test(base)) return [...split(base), "ed"];
        if (/[aeiou]$/.test(base) && !/e$/.test(base)) continue;
        return attach(split(base), "ed");
      }
      if (s === "y") {
        if (/[aeiou]$/.test(base) || base.length < 3) continue;
        // double consonant: fun-ny, hap-py
        if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
          const b = split(base.slice(0, -1));
          return [...b, base[base.length - 1] + "y"];
        }
        const b = split(base);
        const last = b[b.length - 1];
        // move a single final consonant to the y syllable (squeak-y stays; ti-ny)
        return [...b, "y"].length ? mergeY(b) : b;
      }
      if ((s === "er" || s === "est") && !(base.length >= 2 && base[base.length - 1] === base[base.length - 2]) && !/(ck|ch|sh|th|ng|nk|tch|[aeiou]{2}[^aeiou])$/.test(base)) {
        continue; // let the base rules treat "er" as an r-controlled syllable (mon-ster, clo-ver)
      }
      if (s === "er" || s === "est" || s === "ing") {
        if (base.length >= 2 && base[base.length - 1] === base[base.length - 2] && !/(ll|ss|ff|zz)$/.test(base)) {
          // doubled consonant: run-ning, big-ger
          return [...split(base.slice(0, -1)), base[base.length - 1] + s];
        }
        if (s === "ing" && /[aeiou]$/.test(base) === false && raw.length > 4) return [...split(base), s];
        if (s !== "ing") {
          if (/[aeiou]$/.test(base)) continue;
          return [...split(base), s];
        }
        return [...split(base), s];
      }
      return [...split(base), s];
    }
    return splitBase(raw);
  }

  function attach(sylls, tail) {
    if (!sylls.length) return [tail];
    const out = sylls.slice();
    out[out.length - 1] += tail;
    return out;
  }
  function mergeY(b) {
    const out = b.slice();
    const last = out[out.length - 1];
    if (/[aeiou]{2}/.test(last) || /ee|ea|ai|oa|ou|oo/.test(last)) { out.push("y"); return out; } // squeak-y
    const m = last.match(/^(.*?[aeiouy]+[^aeiouy]*?)([^aeiouy])$/);
    if (m && m[1] && !/(ck|sh|ch|th|ng)$/.test(last)) {
      out[out.length - 1] = m[1];
      out.push(m[2] + "y");
    } else out.push("y");
    return out;
  }

  function count(word) { return split(word).length; }

  const api = { split, count, units };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WillowSyllables = api;
})(typeof window !== "undefined" ? window : globalThis);
