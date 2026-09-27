/*
 * Willowbrook Hollow — reader app
 * What each feature does and why: docs/READER_APP.md
 */
const { useState, useEffect, useMemo, useRef, useCallback, useContext, createContext } = React;
const Syl = window.WillowSyllables;
const cls = (...parts) => parts.filter(Boolean).join(" ");

/* ============================================================
   Progress store (browser storage) — docs/READER_APP.md §8
   ============================================================ */
const STORE_KEY = "willowbrook-progress-v1";
const DEFAULT_SETTINGS = { font: "atkinson", size: "L", spacing: "roomy", ruler: false, theme: "paper", reduceMotion: null, voiceRate: "normal" };
const freshProgress = () => ({
  version: 1, settings: { ...DEFAULT_SETTINGS }, unlocked: ["Acorn"], visited: {}, quiz: {}, finished: {},
  practice: {}, readToMe: {}, badges: [], ceremonies: [], last: null,
});
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshProgress();
    const p = JSON.parse(raw);
    return { ...freshProgress(), ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } };
  } catch { return freshProgress(); }
}
function saveProgress(p) { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* private mode: keep in memory */ } }

const ProgressCtx = createContext(null);
const DataCtx = createContext(null);
const useProgress = () => useContext(ProgressCtx);
const useData = () => useContext(DataCtx);

function awardBadge(p, id, label, icon) {
  if (p.badges.some(b => b.id === id)) return p;
  return { ...p, badges: [...p.badges, { id, label, icon, date: new Date().toISOString().slice(0, 10) }], _newBadge: { id, label, icon } };
}

/* ============================================================
   Speech — Read to Me, tap-a-word, quiz read-aloud
   ============================================================ */
const RATES = { slow: 0.7, normal: 0.9, quick: 1.05 };
let cachedVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  const en = voices.filter(v => /^en(-|_|$)/i.test(v.lang));
  cachedVoice = en.find(v => /samantha|google us english|aria|jenny|natural/i.test(v.name)) || en.find(v => /en-US/i.test(v.lang)) || en[0] || voices[0] || null;
  return cachedVoice;
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };

function speak(text, { rate = "normal", onBoundary, onEnd } = {}) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return () => {}; }
  // A device with no voices installed never fires onend: finish after the estimated reading time.
  if (speechSynthesis.getVoices().length === 0) {
    const ms = Math.max(600, text.split(/\s+/).length * 1000 / ({ slow: 1.7, normal: 2.3, quick: 2.8 }[rate] || 2.3));
    const t = setTimeout(() => onEnd?.(), ms);
    return () => clearTimeout(t);
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(); if (v) u.voice = v;
  u.rate = RATES[rate] || 0.9; u.pitch = 1.05;
  if (onBoundary) u.onboundary = (e) => { if (e.name === "word" || e.name === undefined) onBoundary(e.charIndex); };
  let done = false;
  u.onend = () => { if (!done) { done = true; onEnd?.(); } };
  u.onerror = () => { if (!done) { done = true; onEnd?.(); } };
  speechSynthesis.speak(u);
  return () => { done = true; speechSynthesis.cancel(); };
}
function speakSequence(parts, { rate, gapMs = 350, onPart, onEnd } = {}) {
  let i = 0, cancelled = false, stop = () => {};
  const next = () => {
    if (cancelled) return;
    if (i >= parts.length) { onPart?.(-1); onEnd?.(); return; }
    onPart?.(i);
    stop = speak(parts[i], { rate, onEnd: () => { i++; setTimeout(next, gapMs); } });
  };
  next();
  return () => { cancelled = true; stop(); onPart?.(-1); };
}

/* ============================================================
   Words — tokenising text, story words, names, syllables
   ============================================================ */
const WORD_RE = /([A-Za-z]+(?:[’'\-][A-Za-z]+)*)/g;
function tokenize(text) {
  const out = []; let last = 0, m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), word: false });
    out.push({ t: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), word: false });
  return out;
}
const baseOf = (w) => w.toLowerCase().replace(/[’']s$/, "").replace(/[^a-z\-]/g, "");

function useCircleWords(circle) {
  const { circleWordsFor } = useData();
  return circleWordsFor(circle);
}
function storyEntry(word, story) {
  const w = baseOf(word).replace(/-/g, "");
  if (story.has(w)) return story.get(w);
  for (const end of ["s", "es", "ed", "d", "ing"]) if (w.endsWith(end) && story.has(w.slice(0, -end.length))) return story.get(w.slice(0, -end.length));
  return null;
}
function syllablesFor(word, story, names) {
  if (/-/.test(word)) return word.split("-").filter(Boolean);            // VI-O-LA
  const clean = word.replace(/[’']s$/, "").replace(/[^A-Za-z]/g, "");
  const n = names.get(clean.toLowerCase()); if (n) return n.syllables;
  const s = story.get(clean.toLowerCase()); if (s) return s.syllables;
  const parts = Syl.split(clean);
  // keep the reader's capitalisation
  let i = 0; return parts.map(p => { const seg = clean.slice(i, i + p.length); i += p.length; return seg; });
}
const spokenFor = (word, story) => storyEntry(word, story)?.pronounce || word.replace(/-/g, " ");

/* ============================================================
   App shell
   ============================================================ */
function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [data, setData] = useState(null);
  const [view, setView] = useState({ kind: "home" });
  const [overlay, setOverlay] = useState(null); // settings | parents | library | about
  const [toast, setToast] = useState(null);
  const wordsCache = useRef({});

  const update = useCallback((fn) => {
    setProgress(prev => {
      let next = fn(prev);
      if (next._newBadge) { const b = next._newBadge; delete next._newBadge; setTimeout(() => setToast(b), 50); }
      saveProgress(next);
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all(["./manifest.json", "./docs/character-bios.json", "./circles/names.json", "./docs/about.json"].map(u => fetch(u).then(r => r.json())))
      .then(async ([manifest, bios, names, about]) => {
        const words = {};
        await Promise.all(manifest.circles.map(c => fetch(`./circles/${c.toLowerCase()}/words.json`).then(r => r.json()).then(d => { words[c] = d; })));
        setData({ manifest, bios, names: new Map(names.names.map(n => [n.name.toLowerCase(), n])), about, words });
      }).catch(() => setData({ error: true }));
  }, []);

  const circleWordsFor = useCallback((circle) => {
    if (!data?.words) return new Map();
    if (wordsCache.current[circle]) return wordsCache.current[circle];
    const idx = data.manifest.circles.indexOf(circle);
    const story = new Map();
    data.manifest.circles.slice(0, idx + 1).forEach(c => (data.words[c]?.words || []).forEach(w => story.set(w.word.toLowerCase(), w)));
    wordsCache.current[circle] = story;
    return story;
  }, [data]);

  const s = progress.settings;
  const reduceMotion = s.reduceMotion ?? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const theme = THEMES[s.theme] || THEMES.paper;
  const rootStyle = {
    "--read-font": FONTS[s.font]?.css || FONTS.atkinson.css,
    "--read-size": SIZES[s.size] || SIZES.L,
    "--read-leading": SPACINGS[s.spacing] || SPACINGS.roomy,
    "--bg": theme.bg, "--ink": theme.ink, "--card": theme.card, "--line": theme.line, "--accent": theme.accent, "--accent-ink": theme.accentInk, "--story": theme.story, "--muted": theme.muted,
    background: "var(--bg)", color: "var(--ink)", fontFamily: FONTS.atkinson.css,
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-stone-500">Loading the Hollow…</div>;
  if (data.error) return <div className="min-h-screen flex items-center justify-center p-6 text-center">The Hollow could not load. If you opened this file directly, run a small web server instead (see docs/READER_APP.md).</div>;

  const openBook = (meta, page) => fetch(meta.path).then(r => r.json()).then(book => {
    setView({ kind: "book", book, meta, startPage: page ?? (progress.last?.bookId === meta.bookId ? progress.last.page : 0) });
  });

  return (
    <DataCtx.Provider value={{ ...data, circleWordsFor, reduceMotion, openBook }}>
      <ProgressCtx.Provider value={{ progress, update }}>
        <div className={cls("min-h-screen", reduceMotion && "wh-reduce-motion")} style={rootStyle}>
          {view.kind === "home" && <HomeScreen go={setView} openOverlay={setOverlay} />}
          {view.kind === "book" && (
            <BookViewer key={view.book.bookId} book={view.book} meta={view.meta} startPage={view.startPage}
              onExit={() => setView({ kind: "home" })} openOverlay={setOverlay}
              onCeremony={(circle) => setView({ kind: "ceremony", circle })} />
          )}
          {view.kind === "bio" && <CharacterBioView id={view.id} onExit={() => setView({ kind: "home" })} />}
          {view.kind === "ceremony" && <CeremonyView circle={view.circle} onDone={() => setView({ kind: "home" })} />}

          {overlay === "library" && <LibraryDrawer onClose={() => setOverlay(null)} />}
          {overlay === "settings" && <SettingsPanel onClose={() => setOverlay(null)} />}
          {overlay === "parents" && <ParentCorner onClose={() => setOverlay(null)} />}
          {overlay === "about" && <AboutView onClose={() => setOverlay(null)} />}
          {toast && <BadgeToast badge={toast} onDone={() => setToast(null)} />}
        </div>
      </ProgressCtx.Provider>
    </DataCtx.Provider>
  );
}

/* ---------- reading comfort settings (docs/READER_APP.md §7) ---------- */
const FONTS = {
  atkinson: { label: "Atkinson Hyperlegible", css: "'Atkinson Hyperlegible', system-ui, sans-serif" },
  lexend: { label: "Lexend", css: "'Lexend', system-ui, sans-serif" },
  dyslexic: { label: "OpenDyslexic", css: "'OpenDyslexic', 'Atkinson Hyperlegible', sans-serif" },
  classic: { label: "Classic serif", css: "'Literata', Georgia, serif" },
};
const SIZES = { S: "18px", M: "21px", L: "24px", XL: "28px" };
const SPACINGS = { normal: "1.5", roomy: "1.8", extra: "2.15" };
const THEMES = {
  paper: { bg: "#fbf6ec", card: "#fffdf8", ink: "#2d2a24", muted: "#6b6558", line: "#e7dcc6", accent: "#2f7d5b", accentInk: "#ffffff", story: "#fde6a8" },
  contrast: { bg: "#ffffff", card: "#ffffff", ink: "#000000", muted: "#222222", line: "#000000", accent: "#0b3d91", accentInk: "#ffffff", story: "#ffe14d" },
};

/* ============================================================
   Shared UI bits
   ============================================================ */
// Web-sized copies of the master art (built by tools/make-web-images.py); GitHub Pages cannot serve the LFS masters.
const masterFor = (id) => `images/web/characters/${id.replace(/-/g, "_")}.webp`;
const emblemFor = (circle) => `images/web/circles/circle-${circle.toLowerCase()}.webp`;

function Btn({ children, onClick, kind = "soft", className, ...rest }) {
  const base = "min-h-[44px] px-4 rounded-2xl font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 disabled:opacity-40";
  const styles = {
    solid: { background: "var(--accent)", color: "var(--accent-ink)" },
    soft: { background: "var(--card)", color: "var(--ink)", border: "2px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--ink)" },
  };
  return <button type="button" onClick={onClick} className={cls(base, className)} style={styles[kind]} {...rest}>{children}</button>;
}

function Sheet({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cls("relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-xl")}
        style={{ background: "var(--card)", color: "var(--ink)" }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <Btn onClick={onClose} aria-label="Close">✕</Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

function BadgeToast({ badge, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 wh-pop" style={{ background: "var(--accent)", color: "var(--accent-ink)" }} role="status">
      <span className="text-2xl" aria-hidden="true">{badge.icon}</span>
      <span className="font-bold">New badge: {badge.label}!</span>
    </div>
  );
}

/* ============================================================
   Home, Library, Bios, About
   ============================================================ */
function currentCircle(manifest, progress) {
  return [...manifest.circles].reverse().find(c => progress.unlocked.includes(c)) || manifest.circles[0];
}

function HomeScreen({ go, openOverlay }) {
  const { manifest, bios, openBook } = useData();
  const { progress } = useProgress();
  const circle = currentCircle(manifest, progress);
  const lastMeta = progress.last && manifest.books.find(b => b.bookId === progress.last.bookId);
  const nextMeta = lastMeta && !progress.finished[lastMeta.bookId] ? lastMeta
    : manifest.books.find(b => progress.unlocked.includes(b.circle) && !progress.finished[b.bookId]) || manifest.books[0];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Btn onClick={() => openOverlay("library")}>☰ Library</Btn>
        <div className="flex gap-2">
          <Btn onClick={() => openOverlay("about")}>About</Btn>
          <Btn onClick={() => openOverlay("settings")} aria-label="Settings">⚙</Btn>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16 text-center">
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: "var(--read-font)" }}>Willowbrook Hollow</h1>
        <p className="mt-2 text-lg" style={{ color: "var(--muted)" }}>Behind the animal sanctuary, the critters are talking. Want to listen in?</p>

        <div className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-2xl" style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
          <img src={emblemFor(circle)} alt="" className="h-10" />
          <span className="font-semibold">You are in the {circle} Circle</span>
        </div>

        {nextMeta && (
          <div className="mt-5">
            <Btn kind="solid" className="text-xl px-7 py-3" onClick={() => openBook(nextMeta, progress.finished[nextMeta.bookId] ? 0 : undefined)}>
              {progress.finished[nextMeta.bookId] ? "Read again" : progress.last?.bookId === nextMeta.bookId ? "Keep reading" : "Start reading"}: {nextMeta.title} →
            </Btn>
          </div>
        )}

        {progress.badges.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>Your badges</div>
            <div className="flex flex-wrap justify-center gap-2">
              {progress.badges.map(b => (
                <span key={b.id} className="px-3 py-1 rounded-full text-sm" style={{ background: "var(--card)", border: "2px solid var(--line)" }} title={b.date}>{b.icon} {b.label}</span>
              ))}
            </div>
          </div>
        )}

        <h2 className="mt-10 mb-3 text-lg font-bold">Meet the Hollow</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Object.entries(bios).map(([id, b]) => (
            <button key={id} onClick={() => go({ kind: "bio", id })}
              className="rounded-2xl p-3 flex flex-col items-center gap-2 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
              style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
              <img src={masterFor(id)} alt={b.name} className="h-24 w-24 object-contain" />
              <span className="text-sm font-semibold">{b.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-12"><ParentsDoor onOpen={() => openOverlay("parents")} /></div>
      </main>
    </div>
  );
}

// Grown-up check: press and hold for 2 seconds.
function ParentsDoor({ onOpen }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef(null);
  const start = () => { setHolding(true); timer.current = setTimeout(() => { setHolding(false); onOpen(); }, 2000); };
  const stop = () => { setHolding(false); clearTimeout(timer.current); };
  return (
    <button onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={e => e.preventDefault()}
      onKeyDown={e => { if (e.key === "Enter" && !e.repeat) start(); }} onKeyUp={stop}
      className="relative overflow-hidden min-h-[44px] px-4 rounded-2xl text-sm select-none" style={{ border: "2px dashed var(--line)", color: "var(--muted)" }}>
      <span className="absolute inset-y-0 left-0 transition-[width] ease-linear" style={{ width: holding ? "100%" : "0%", transitionDuration: holding ? "2s" : "0s", background: "var(--line)" }} />
      <span className="relative">For grown-ups: press and hold</span>
    </button>
  );
}

function LibraryDrawer({ onClose }) {
  const { manifest, openBook } = useData();
  const { progress } = useProgress();
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Library">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <nav className="absolute left-0 top-0 h-full w-[22rem] max-w-[90vw] overflow-y-auto p-5 shadow-2xl" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">Library</h2><Btn onClick={onClose}>✕</Btn></div>
        {manifest.circles.map(circle => {
          const open = progress.unlocked.includes(circle);
          const books = manifest.books.filter(b => b.circle === circle);
          return (
            <section key={circle} className="mb-5">
              <div className="flex items-center gap-2 font-bold mb-2">
                <img src={emblemFor(circle)} alt="" className={cls("h-8", !open && "grayscale opacity-50")} />
                {circle} {!open && <span aria-label="locked">🔒</span>}
              </div>
              {books.length === 0 && <div className="text-sm pl-10" style={{ color: "var(--muted)" }}>Stories coming soon.</div>}
              <ul className="space-y-2">
                {books.map(b => (
                  <li key={b.bookId}>
                    <button disabled={!open} onClick={() => { onClose(); openBook(b); }}
                      className="w-full text-left rounded-xl px-3 py-2 min-h-[44px] disabled:opacity-40 hover:shadow" style={{ border: "2px solid var(--line)" }}>
                      <div className="font-semibold">{progress.finished[b.bookId] && "✓ "}{b.title}</div>
                      {b.subtitle && <div className="text-sm" style={{ color: "var(--muted)" }}>{b.subtitle}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </div>
  );
}

function CharacterBioView({ id, onExit }) {
  const { bios, manifest, names } = useData();
  const { progress } = useProgress();
  const bio = bios[id];
  const [level, setLevel] = useState(currentCircle(manifest, progress).toLowerCase());
  const circleName = manifest.circles.find(c => c.toLowerCase() === level);
  return (
    <div className="min-h-screen">
      <header className="px-4 py-3 flex items-center gap-2"><Btn onClick={onExit}>← Back</Btn></header>
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-3xl p-6 grid gap-6 sm:grid-cols-[180px,1fr] items-start" style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
          <img src={masterFor(id)} alt={bio.name} className="w-44 h-44 object-contain mx-auto" />
          <div>
            <h1 className="text-3xl font-extrabold">{bio.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {manifest.circles.map(c => (
                <Btn key={c} kind={level === c.toLowerCase() ? "solid" : "soft"} onClick={() => setLevel(c.toLowerCase())}>{c}</Btn>
              ))}
            </div>
            <div className="mt-4">
              <ReadingText paragraphs={bio.levels[level].split(/\n\s*\n/)} circle={circleName} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AboutView({ onClose }) {
  const { about, manifest } = useData();
  const order = about.ui?.levelOrder || ["mom-dad", ...manifest.circles.map(c => c.toLowerCase())];
  const [level, setLevel] = useState(about.ui?.defaultLevel || "mom-dad");
  const circleName = manifest.circles.find(c => c.toLowerCase() === level);
  return (
    <Sheet title="About Willowbrook Hollow" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2 mb-4">
        {order.map(l => <Btn key={l} kind={l === level ? "solid" : "soft"} onClick={() => setLevel(l)}>{l === "mom-dad" ? "Grown-ups" : l[0].toUpperCase() + l.slice(1)}</Btn>)}
      </div>
      {circleName
        ? <ReadingText paragraphs={about.levels[level].trim().split(/\n\s*\n/)} circle={circleName} />
        : <div className="space-y-3 leading-relaxed">{about.levels[level].trim().split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>}
    </Sheet>
  );
}

/* ============================================================
   Reading text: tappable words, story-word highlight, Read-to-Me highlight, ruler
   ============================================================ */
function ReadingText({ paragraphs, circle, activeWord = -1, readThrough = -1, ruler = false, onWordIndex }) {
  const story = useCircleWords(circle || "Acorn");
  const { names } = useData();
  const [card, setCard] = useState(null);
  const [rulerPara, setRulerPara] = useState(0);
  let wi = -1;
  return (
    <div style={{ fontFamily: "var(--read-font)", fontSize: "var(--read-size)", lineHeight: "var(--read-leading)", letterSpacing: "0.01em" }}>
      {paragraphs.map((para, pi) => (
        <p key={pi} className="mb-[0.7em] transition-opacity" onClick={() => setRulerPara(pi)}
          style={{ opacity: ruler && pi !== rulerPara ? 0.3 : 1 }}>
          {tokenize(para).map((tok, ti) => {
            if (!tok.word) return <span key={ti}>{tok.t}</span>;
            wi++;
            const idx = wi;
            const isStory = !!storyEntry(tok.t, story);
            const active = idx === activeWord;
            const wasRead = !active && idx <= readThrough;
            return (
              <span key={ti} role="button" tabIndex={0} data-word-index={idx}
                onClick={(e) => { e.stopPropagation(); onWordIndex ? onWordIndex(idx, tok.t) : setCard(tok.t); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onWordIndex ? onWordIndex(idx, tok.t) : setCard(tok.t); } }}
                className={cls("rounded-md cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-amber-300 transition-colors", isStory && "wh-story")}
                style={{
                  background: active ? "var(--accent)" : wasRead ? "rgba(47,125,91,.16)" : isStory ? "var(--story)" : undefined,
                  color: active ? "var(--accent-ink)" : undefined,
                  padding: isStory || active ? "0 0.12em" : undefined,
                  boxShadow: isStory && !active ? "inset 0 -3px 0 rgba(180,120,0,.55)" : undefined,
                }}>{tok.t}</span>
            );
          })}
        </p>
      ))}
      {card && <WordCard word={card} story={story} names={names} onClose={() => setCard(null)} />}
    </div>
  );
}

function WordCard({ word, story, names, onClose }) {
  const { progress } = useProgress();
  const rate = progress.settings.voiceRate;
  const entry = storyEntry(word, story);
  const nameEntry = names.get(word.replace(/[’']s$/, "").toLowerCase());
  const sylls = syllablesFor(word, story, names);
  const [lit, setLit] = useState(-1);
  const stopRef = useRef(() => {});
  const sayWord = () => { stopRef.current(); stopRef.current = speak(spokenFor(word, story), { rate }); };
  const saySlow = () => { stopRef.current(); stopRef.current = speakSequence(sylls.map(s => s.toLowerCase()), { rate: "slow", onPart: setLit, onEnd: () => setTimeout(sayWord, 300) }); };
  useEffect(() => { sayWord(); return () => stopRef.current(); }, []);
  return (
    <Sheet title={nameEntry ? "A name" : entry ? "Story word" : "Tap to hear"} onClose={onClose}>
      <div className="text-center">
        <div className="flex justify-center flex-wrap gap-2 my-2" style={{ fontFamily: "var(--read-font)" }} aria-label={`Syllables: ${sylls.join(", ")}`}>
          {sylls.map((s, i) => (
            <span key={i} className="px-3 py-1 rounded-xl text-4xl font-bold transition-colors"
              style={{ background: lit === i ? "var(--accent)" : ["#dff1e6", "#fdebd0", "#e3ecfb", "#f6e1ef", "#eee7fb"][i % 5], color: lit === i ? "var(--accent-ink)" : "#1f1f1f" }}>{s}</span>
          ))}
        </div>
        <div className="text-sm mb-4" style={{ color: "var(--muted)" }}>{sylls.length} {sylls.length === 1 ? "syllable" : "syllables"}</div>
        <div className="flex justify-center gap-3 flex-wrap">
          <Btn kind="solid" onClick={sayWord}>🔊 Say it</Btn>
          {sylls.length > 1 && <Btn onClick={saySlow}>🐢 Say it slowly</Btn>}
        </div>
        {entry && <p className="mt-5 text-lg leading-relaxed" style={{ fontFamily: "var(--read-font)" }}>{entry.definition}</p>}
      </div>
    </Sheet>
  );
}

/* ============================================================
   Book viewer
   ============================================================ */
function BookViewer({ book, meta, startPage, onExit, openOverlay, onCeremony }) {
  const { progress, update } = useProgress();
  const pages = useMemo(() => [{ kind: "title" }, ...book.chapters.flatMap(ch => ch.pages.map(p => ({ kind: "page", chapterId: ch.id, chapterTitle: ch.title, ...p })))], [book]);
  const [index, setIndex] = useState(Math.min(startPage || 0, pages.length - 1));
  const [panel, setPanel] = useState(null); // toc | quiz | practice
  const current = pages[index];
  const lastIndex = pages.length - 1;

  useEffect(() => {
    update(p => {
      let next = { ...p, last: { bookId: book.bookId, page: index } };
      if (current.kind === "page") {
        const seen = new Set(p.visited[book.bookId] || []); seen.add(current.number);
        next.visited = { ...p.visited, [book.bookId]: [...seen].sort((a, b) => a - b) };
      }
      return next;
    });
    window.scrollTo({ top: 0 });
  }, [index]);

  const go = (d) => { if ("speechSynthesis" in window) speechSynthesis.cancel(); setIndex(i => Math.max(0, Math.min(lastIndex, i + d))); };
  useEffect(() => {
    const onKey = (e) => { if (panel) return; if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [panel, lastIndex]);
  const swipe = useRef(null);

  const onQuizDone = () => {
    let ceremonyCircle = null;
    update(p => {
      let next = { ...p, quiz: { ...p.quiz, [book.bookId]: true } };
      const allSeen = pages.filter(x => x.kind === "page").every(x => (next.visited[book.bookId] || []).includes(x.number));
      if (allSeen && !p.finished[book.bookId]) {
        next.finished = { ...p.finished, [book.bookId]: new Date().toISOString().slice(0, 10) };
        next = awardBadge(next, "first-book", "First Book", "📘");
        next = awardBadge(next, `finished-${book.bookId}`, `Finished “${book.title}”`, "✅");
        if (meta?.ceremony && !p.ceremonies.includes(book.circle)) ceremonyCircle = book.circle;
      }
      return next;
    });
    setPanel(null);
    if (ceremonyCircle) setTimeout(() => onCeremony(ceremonyCircle), 400);
  };

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto]"
      onTouchStart={e => { swipe.current = e.changedTouches[0].screenX; }}
      onTouchEnd={e => { const dx = e.changedTouches[0].screenX - (swipe.current ?? 0); if (!panel && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
      <header className="sticky top-0 z-30 px-3 py-2 flex items-center gap-2 flex-wrap" style={{ background: "var(--bg)", borderBottom: "2px solid var(--line)" }}>
        <Btn onClick={onExit}>← Library</Btn>
        <div className="flex-1 text-center font-bold truncate min-w-[8rem]">{book.title}</div>
        <Btn onClick={() => setPanel("toc")}>Chapters</Btn>
        <Btn onClick={() => setPanel("practice")}>⏱ Practice Read</Btn>
        <Btn onClick={() => openOverlay("settings")} aria-label="Settings">⚙</Btn>
      </header>

      <main className="w-full max-w-5xl mx-auto p-3 sm:p-5">
        {current.kind === "title"
          ? <TitlePage book={book} onStart={() => go(1)} />
          : <PageView key={current.number} page={current} book={book} />}
      </main>

      <footer className="sticky bottom-0 z-20 px-3 py-2" style={{ background: "var(--bg)", borderTop: "2px solid var(--line)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <Btn onClick={() => go(-1)} disabled={index === 0}>← Back</Btn>
          <div className="text-sm" style={{ color: "var(--muted)" }}>{current.kind === "title" ? "Title page" : `Page ${current.number} of ${pages.length - 1}`}</div>
          {index < lastIndex
            ? <Btn kind="solid" onClick={() => go(1)}>Next →</Btn>
            : <Btn kind="solid" onClick={() => setPanel("quiz")}>{progress.quiz[book.bookId] ? "Quiz again" : "Quiz time!"} ⭐</Btn>}
        </div>
      </footer>

      {panel === "toc" && (
        <Sheet title="Chapters" onClose={() => setPanel(null)}>
          <div className="grid gap-2">
            <Btn onClick={() => { setIndex(0); setPanel(null); }} className="text-left">Title page</Btn>
            {book.toc.filter(t => t.type === "chapter").map(t => (
              <Btn key={t.anchor} className="text-left" onClick={() => { setIndex(pages.findIndex(p => p.chapterId === t.anchor)); setPanel(null); }}>{t.label}</Btn>
            ))}
            <Btn kind="solid" onClick={() => setPanel("quiz")}>Quiz ⭐</Btn>
          </div>
        </Sheet>
      )}
      {panel === "quiz" && <Quiz book={book} onClose={() => setPanel(null)} onDone={onQuizDone} />}
      {panel === "practice" && <PracticeRead book={book} startChapter={current.chapterId} onClose={() => setPanel(null)} />}
    </div>
  );
}

function TitlePage({ book, onStart }) {
  const { bios } = useData();
  const { progress } = useProgress();
  return (
    <div className="rounded-3xl overflow-hidden shadow" style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
      <div className="relative">
        <img src={book.cover.image} alt={book.cover.alt} className="w-full aspect-[16/9] object-cover" />
        <img src={book.circleIcon} alt={`${book.circle} Circle`} className="absolute top-3 left-3 h-16 drop-shadow" />
      </div>
      <div className="p-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ fontFamily: "var(--read-font)" }}>{book.title}</h1>
        {book.subtitle && <p className="mt-1 text-lg" style={{ color: "var(--muted)" }}>{book.subtitle}</p>}
        <div className="mt-5 text-sm font-semibold" style={{ color: "var(--muted)" }}>In this story (tap to hear a name)</div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {book.cast.map(id => (
            <button key={id} onClick={() => speak(bios[id]?.name || id, { rate: progress.settings.voiceRate })}
              className="flex flex-col items-center w-20 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded-xl">
              <img src={masterFor(id)} alt="" className="h-16 w-16 object-contain" />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--read-font)" }}>{bios[id]?.name || id}</span>
            </button>
          ))}
        </div>
        <Btn kind="solid" className="mt-6 text-xl px-8" onClick={onStart}>Start reading →</Btn>
      </div>
    </div>
  );
}

function PageView({ page, book }) {
  const { progress, update } = useProgress();
  const { reduceMotion } = useData();
  const story = useCircleWords(book.circle);
  const [active, setActive] = useState(-1);
  const [mode, setMode] = useState("idle"); // idle | reading | yourTurn
  const [moving, setMoving] = useState({});
  const stopRef = useRef(() => {});
  useEffect(() => () => stopRef.current(), []);

  // Build the spoken text and a map from character offset → word index.
  const plan = useMemo(() => {
    let spoken = "", starts = [], wi = 0;
    page.text.forEach((para, pi) => {
      tokenize(para).forEach(tok => {
        if (tok.word) { starts.push([spoken.length, wi++]); spoken += spokenFor(tok.t, story); }
        else spoken += tok.t.replace(/[“”‘’]/g, "").replace(/…/g, "... ");
      });
      spoken += pi < page.text.length - 1 ? "\n" : "";
    });
    return { spoken, starts, count: wi };
  }, [page, story]);

  const readToMe = () => {
    if (mode === "reading") { stopRef.current(); setMode("idle"); setActive(-1); return; }
    setMode("reading"); setActive(0);
    let gotBoundary = false;
    const wordsPerSec = { slow: 1.7, normal: 2.3, quick: 2.8 }[progress.settings.voiceRate] || 2.3;
    const fallback = setInterval(() => { if (!gotBoundary) setActive(a => Math.min(plan.count - 1, a + 1)); }, 1000 / wordsPerSec);
    const stop = speak(plan.spoken, {
      rate: progress.settings.voiceRate,
      onBoundary: (ci) => { gotBoundary = true; let w = 0; for (const [s, i] of plan.starts) { if (s <= ci) w = i; else break; } setActive(w); },
      onEnd: () => { clearInterval(fallback); setActive(-1); setMode("yourTurn"); },
    });
    stopRef.current = () => { clearInterval(fallback); stop(); };
    update(p => ({ ...p, readToMe: { ...p.readToMe, [book.bookId]: { ...(p.readToMe[book.bookId] || {}), [page.chapterId]: true } } }));
  };

  const art = (
    <div className={cls("rounded-2xl p-3 flex items-end justify-center gap-2 flex-wrap", page.layout === "art-full" ? "min-h-[220px]" : "min-h-[260px] md:min-h-[380px]")}
      style={{ background: "linear-gradient(180deg,#fdf1dc 0%,#f3ead7 70%,#dfe9c9 100%)" }}>
      {page.media.map((m, i) => (
        <button key={i} onClick={() => setMoving(s => ({ ...s, [i]: (s[i] || 0) + 1 }))} aria-label={`${m.alt} (tap to wiggle)`}
          className="focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded-xl">
          <img key={moving[i] || 0} src={m.src} alt={m.alt}
            className={cls("object-contain", page.media.length > 2 ? "h-36 md:h-48" : page.media.length === 2 ? "h-44 md:h-64" : "h-56 md:h-80",
              moving[i] && !reduceMotion && `wh-anim-${m.animation?.kind || "wiggle"}`, moving[i] && reduceMotion && "wh-glow")} />
        </button>
      ))}
    </div>
  );

  const text = (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>{page.chapterTitle}</h3>
        <Btn kind={mode === "reading" ? "soft" : "solid"} onClick={readToMe}>{mode === "reading" ? "⏹ Stop" : "🔊 Read to me"}</Btn>
      </div>
      <ReadingText paragraphs={page.text} circle={book.circle} activeWord={active} ruler={progress.settings.ruler} />
      {mode === "yourTurn" && (
        <div className="mt-3 rounded-2xl px-4 py-3 font-semibold flex items-center gap-3 wh-pop" style={{ background: "var(--story)", color: "#1f1f1f" }}>
          <img src={masterFor("brindle")} alt="" className="h-10 w-10 object-contain" />
          Your turn! Read it out loud.
        </div>
      )}
    </div>
  );

  return (
    <article className="rounded-3xl p-4 sm:p-6 shadow" style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
      {page.layout === "art-full"
        ? <div className="grid gap-5">{art}{text}</div>
        : <div className="grid gap-6 md:grid-cols-2 items-start">
            <div className={page.layout === "art-right" ? "md:order-2" : ""}>{art}</div>
            <div className={page.layout === "art-right" ? "md:order-1" : ""}>{text}</div>
          </div>}
    </article>
  );
}

/* ============================================================
   Practice Read — docs/READER_APP.md §5
   ============================================================ */
function PracticeRead({ book, startChapter, onClose }) {
  const { progress, update } = useProgress();
  const [chapterId, setChapterId] = useState(startChapter || book.chapters[0].id);
  const [stage, setStage] = useState("pick"); // pick | ready | reading | mark | result
  const [left, setLeft] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [lastWord, setLastWord] = useState(-1);
  const [missed, setMissed] = useState(0);
  const [result, setResult] = useState(null);
  const startedAt = useRef(0), tick = useRef(null);
  const chapter = book.chapters.find(c => c.id === chapterId);
  const paragraphs = chapter.pages.flatMap(p => p.text);
  const history = progress.practice[book.bookId]?.[chapterId] || [];
  const best = history.reduce((m, r) => Math.max(m, r.wcpm), 0);

  useEffect(() => () => clearInterval(tick.current), []);
  const start = () => {
    setStage("reading"); setLeft(60); startedAt.current = Date.now();
    tick.current = setInterval(() => {
      const s = Math.min(60, Math.round((Date.now() - startedAt.current) / 1000));
      setLeft(60 - s);
      if (s >= 60) { clearInterval(tick.current); setElapsed(60); setStage("mark"); }
    }, 250);
  };
  const done = () => { clearInterval(tick.current); setElapsed(Math.max(5, Math.round((Date.now() - startedAt.current) / 1000))); setStage("mark"); };
  const save = () => {
    const words = lastWord + 1;
    const wcpm = Math.max(0, Math.round(((words - missed) * 60) / elapsed));
    const rec = { date: new Date().toISOString().slice(0, 10), words, missed, seconds: elapsed, wcpm };
    const isBest = history.length > 0 && wcpm > best;
    update(p => {
      const bookP = p.practice[book.bookId] || {};
      let next = { ...p, practice: { ...p.practice, [book.bookId]: { ...bookP, [chapterId]: [...(bookP[chapterId] || []), rec] } } };
      if (isBest) next = awardBadge(next, `best-${book.bookId}-${chapterId}-${wcpm}`, "Personal Best", "🏅");
      if (p.readToMe[book.bookId]?.[chapterId]) next = awardBadge(next, "echo-reader", "Echo Reader", "🦜");
      return next;
    });
    setResult({ ...rec, isBest, first: history.length === 0, earlier: history.map(r => r.wcpm) });
    setStage("result");
  };
  const reset = () => { setStage("ready"); setLastWord(-1); setMissed(0); setResult(null); };

  return (
    <Sheet title="⏱ Practice Read" onClose={onClose} wide>
      {stage === "pick" && (
        <div>
          <p className="mb-4 leading-relaxed">Read a chapter out loud for one minute. Then tap the last word you read. Read the same chapter on another day and try to beat <b>your own</b> best!</p>
          <div className="grid gap-2">
            {book.chapters.map(c => {
              const h = progress.practice[book.bookId]?.[c.id] || [];
              const b = h.reduce((m, r) => Math.max(m, r.wcpm), 0);
              return (
                <Btn key={c.id} kind={c.id === chapterId ? "solid" : "soft"} className="text-left flex justify-between" onClick={() => { setChapterId(c.id); setStage("ready"); }}>
                  <span>{c.title}</span>{b > 0 && <span className="text-sm opacity-80">best {b}</span>}
                </Btn>
              );
            })}
          </div>
        </div>
      )}

      {stage !== "pick" && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="font-bold">{chapter.title}</div>
            {(stage === "ready" || stage === "reading") && <TimerRing left={left} />}
          </div>

          {stage === "ready" && (
            <div className="flex gap-3 flex-wrap mb-3">
              <Btn kind="solid" className="text-lg px-6" onClick={start}>Start</Btn>
              <Btn onClick={() => setStage("pick")}>Pick another chapter</Btn>
              {best > 0 && <span className="self-center text-sm" style={{ color: "var(--muted)" }}>Your best here: <b>{best}</b> words a minute</span>}
            </div>
          )}
          {stage === "reading" && <div className="mb-3"><Btn kind="solid" onClick={done}>I'm done</Btn></div>}
          {stage === "mark" && (
            <div className="mb-3 rounded-2xl px-4 py-3 font-semibold" style={{ background: "var(--story)", color: "#1f1f1f" }}>
              {lastWord < 0 ? "Tap the last word you read." : `You read ${lastWord + 1} words. Tap a different word to fix it.`}
            </div>
          )}

          {stage !== "result" && (
            <div className={cls("rounded-2xl p-4 max-h-[48vh] overflow-y-auto", stage === "ready" && "blur-[3px] select-none")} style={{ border: "2px solid var(--line)" }} aria-hidden={stage === "ready"}>
              <ReadingText paragraphs={paragraphs} circle={book.circle} activeWord={stage === "mark" ? lastWord : -1} readThrough={stage === "mark" ? lastWord : -1}
                onWordIndex={stage === "mark" ? (i) => setLastWord(i) : (stage === "reading" ? () => {} : undefined)} />
            </div>
          )}

          {stage === "mark" && lastWord >= 0 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm" style={{ color: "var(--muted)" }}>Grown-up listening? Missed words:</span>
              <Btn onClick={() => setMissed(m => Math.max(0, m - 1))} aria-label="One fewer missed word">−</Btn>
              <span className="text-xl font-bold w-8 text-center">{missed}</span>
              <Btn onClick={() => setMissed(m => Math.min(lastWord + 1, m + 1))} aria-label="One more missed word">+</Btn>
              <Btn kind="solid" className="ml-auto" onClick={save}>Save my read</Btn>
            </div>
          )}

          {stage === "result" && result && (
            <div className="text-center py-4">
              <div className="text-6xl font-extrabold" style={{ color: "var(--accent)" }}>{result.wcpm}</div>
              <div className="text-lg">words a minute{result.missed > 0 ? " (words correct)" : ""}</div>
              <div className="mt-4 text-xl font-bold">
                {result.first ? "Your first Practice Read of this chapter! Try it again another day." : result.isBest ? "🏅 A new personal best!" : "Nice practice! Every read makes it smoother."}
              </div>
              {result.earlier.length > 0 && (
                <div className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
                  Earlier reads: {result.earlier.slice(-5).join(" → ")} → <b>{result.wcpm}</b>
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3 flex-wrap">
                <Btn kind="solid" onClick={reset}>Read it again</Btn>
                <Btn onClick={() => { reset(); setStage("pick"); }}>Another chapter</Btn>
                <Btn onClick={onClose}>Back to the book</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function TimerRing({ left }) {
  const r = 22, c = 2 * Math.PI * r, frac = left / 60;
  return (
    <div className="flex items-center gap-2" aria-label={`${left} seconds left`}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset .25s linear" }} />
        <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{left}</text>
      </svg>
    </div>
  );
}

/* ============================================================
   Quiz — docs/READER_APP.md §6
   ============================================================ */
function Quiz({ book, onClose, onDone }) {
  const { progress } = useProgress();
  const rate = progress.settings.voiceRate;
  const qs = book.quiz.questions;
  const [i, setI] = useState(0);
  const [faded, setFaded] = useState([]);
  const [reaction, setReaction] = useState(null);
  const [solved, setSolved] = useState(false);
  const q = qs[i];
  const stopRef = useRef(() => {});
  useEffect(() => { stopRef.current(); stopRef.current = speak(q.prompt, { rate }); return () => stopRef.current(); }, [i]);

  const choose = (ci) => {
    if (solved) return;
    const right = q.type === "think" || ci === q.answerIndex;
    const r = right ? q.reactions.correct : q.reactions.tryAgain;
    setReaction(r);
    stopRef.current(); stopRef.current = speak(r.line.replace(/[“”‘’]/g, ""), { rate });
    if (right) setSolved(true); else setFaded(f => [...f, ci]);
  };
  const next = () => {
    if (i < qs.length - 1) { setI(i + 1); setFaded([]); setReaction(null); setSolved(false); }
    else onDone();
  };

  return (
    <Sheet title={`Quiz · ${i + 1} of ${qs.length}`} onClose={onClose}>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{book.quiz.instructions}</p>
      <div className="flex items-start gap-3 mb-4">
        <Btn onClick={() => { stopRef.current(); stopRef.current = speak(q.prompt, { rate }); }} aria-label="Hear the question">🔊</Btn>
        <div className="text-2xl font-bold" style={{ fontFamily: "var(--read-font)" }}>{q.prompt}</div>
      </div>
      <div className="grid gap-2">
        {q.choices.map((c, ci) => (
          <div key={ci} className="flex gap-2">
            <Btn onClick={() => { stopRef.current(); stopRef.current = speak(c.replace(/[“”‘’]/g, ""), { rate }); }} aria-label={`Hear: ${c}`}>🔊</Btn>
            <button onClick={() => choose(ci)} disabled={faded.includes(ci) || (solved && q.type === "recall" && ci !== q.answerIndex)}
              className="flex-1 text-left min-h-[48px] px-4 rounded-2xl text-xl transition-opacity disabled:opacity-30 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
              style={{ fontFamily: "var(--read-font)", border: "2px solid var(--line)", background: solved && (q.type === "think" || ci === q.answerIndex) ? "var(--story)" : "var(--card)", color: solved && (q.type === "think" || ci === q.answerIndex) ? "#1f1f1f" : "var(--ink)" }}>
              {c}
            </button>
          </div>
        ))}
      </div>
      {reaction && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-2xl wh-pop" style={{ border: "2px solid var(--line)" }}>
          <img src={reaction.character} alt="" className="h-14 w-14 object-contain" />
          <div className="text-lg" style={{ fontFamily: "var(--read-font)" }}>{reaction.line}</div>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Btn kind="solid" disabled={!solved} onClick={next}>{i < qs.length - 1 ? "Next question →" : "All done! ⭐"}</Btn>
      </div>
    </Sheet>
  );
}

/* ============================================================
   Circle Ceremony — docs/CIRCLES_README.md
   ============================================================ */
const CEREMONIES = {
  Acorn: { gift: "a green leaf charm", scene: "The whole Hollow meets under the Great Oak. Tansy drops a pile of extra acorns. Puddle claps off the beat." },
  Leaf: { gift: "a carved twig token", scene: "Everyone throws leaves in the air for the Leaf Toss, while Wren tells the story all wrong." },
  Branch: { gift: "a carved acorn pendant", scene: "The Branch Parade marches by. Pip and Pebble argue about who carries the heavy end." },
  Oak: { gift: "an Oaklight pendant", scene: "Fireflies and candles glow for the Oaklight. Echo gives a very dramatic speech. Puddle sneezes a candle out." },
  Elder: { gift: "a carved staff", scene: "At dawn, the Elders share quiet stories. Moss rolls into the wrong spot." },
};
function CeremonyView({ circle, onDone }) {
  const { manifest } = useData();
  const { update } = useProgress();
  const next = manifest.circles[manifest.circles.indexOf(circle) + 1];
  const c = CEREMONIES[circle];
  useEffect(() => {
    update(p => {
      let n = { ...p, ceremonies: [...new Set([...p.ceremonies, circle])], unlocked: next ? [...new Set([...p.unlocked, next])] : p.unlocked };
      return awardBadge(n, `ceremony-${circle}`, `${circle} Ceremony`, "🌳");
    });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl text-center rounded-3xl p-8 shadow-xl" style={{ background: "var(--card)", border: "2px solid var(--line)" }}>
        <img src={emblemFor(circle)} alt={`${circle} emblem`} className="h-28 mx-auto wh-pop" />
        <h1 className="mt-4 text-3xl font-extrabold">The {circle} Ceremony</h1>
        <p className="mt-4 text-xl leading-relaxed" style={{ fontFamily: "var(--read-font)" }}>{c.scene}</p>
        <p className="mt-4 text-xl font-bold" style={{ fontFamily: "var(--read-font)" }}>You get {c.gift}!{next && ` Welcome to the ${next} Circle.`}</p>
        <div className="mt-6 flex justify-center gap-2 flex-wrap">
          {["brindle", "tansy", "moss", "wren", "puddle", "leo"].map(id => <img key={id} src={masterFor(id)} alt="" className="h-16 w-16 object-contain" />)}
        </div>
        <Btn kind="solid" className="mt-6 text-lg" onClick={onDone}>Back to the Hollow</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   Settings — docs/READER_APP.md §7
   ============================================================ */
function SettingsPanel({ onClose }) {
  const { progress, update } = useProgress();
  const s = progress.settings;
  const set = (k, v) => update(p => ({ ...p, settings: { ...p.settings, [k]: v } }));
  const Row = ({ label, k, options }) => (
    <div className="mb-4">
      <div className="font-semibold mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, text]) => <Btn key={String(v)} kind={s[k] === v ? "solid" : "soft"} onClick={() => set(k, v)}>{text}</Btn>)}
      </div>
    </div>
  );
  return (
    <Sheet title="⚙ Settings" onClose={onClose}>
      <Row label="Reading font" k="font" options={Object.entries(FONTS).map(([k, f]) => [k, f.label])} />
      <Row label="Text size" k="size" options={Object.keys(SIZES).map(k => [k, k])} />
      <Row label="Line spacing" k="spacing" options={[["normal", "Normal"], ["roomy", "Roomy"], ["extra", "Extra roomy"]]} />
      <Row label="Reading ruler" k="ruler" options={[[false, "Off"], [true, "On"]]} />
      <Row label="Colors" k="theme" options={[["paper", "Warm paper"], ["contrast", "High contrast"]]} />
      <Row label="Reduce motion" k="reduceMotion" options={[[null, "Match device"], [true, "On"], [false, "Off"]]} />
      <Row label="Voice speed" k="voiceRate" options={[["slow", "Slow"], ["normal", "Just right"], ["quick", "Quick"]]} />
      <div className="mt-2 rounded-2xl p-4" style={{ border: "2px solid var(--line)" }}>
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Preview</div>
        <ReadingText paragraphs={["Moss rolled into a ball. Tap any word to hear it."]} circle="Acorn" ruler={false} />
      </div>
    </Sheet>
  );
}

/* ============================================================
   Parent Corner — docs/READER_APP.md §8
   ============================================================ */
function ParentCorner({ onClose }) {
  const { manifest } = useData();
  const { progress, update } = useProgress();
  const [books, setBooks] = useState({});
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => { manifest.books.forEach(m => fetch(m.path).then(r => r.json()).then(b => setBooks(x => ({ ...x, [m.bookId]: b })))); }, []);

  const exportCode = () => {
    const c = "WH1:" + btoa(unescape(encodeURIComponent(JSON.stringify(progress))));
    setCode(c);
    navigator.clipboard?.writeText(c).then(() => setMsg("Progress code copied. Paste it into the Parent Corner on the other device."), () => setMsg("Select the code below and copy it."));
  };
  const importCode = () => {
    try {
      const raw = code.trim();
      if (!raw.startsWith("WH1:")) throw new Error();
      const p = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
      if (p.version !== 1) throw new Error();
      update(() => ({ ...freshProgress(), ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } }));
      setMsg("Progress loaded on this device.");
    } catch { setMsg("That code didn't work. Copy the whole code, starting with WH1:."); }
  };

  return (
    <Sheet title="For grown-ups" onClose={onClose} wide>
      <section className="mb-6">
        <h3 className="font-bold text-lg mb-2">Reading so far</h3>
        {manifest.books.map(m => {
          const b = books[m.bookId];
          const total = b ? b.chapters.reduce((n, c) => n + c.pages.length, 0) : "…";
          const seen = (progress.visited[m.bookId] || []).length;
          return (
            <div key={m.bookId} className="rounded-2xl p-3 mb-3" style={{ border: "2px solid var(--line)" }}>
              <div className="font-semibold">{m.title} <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>({m.circle})</span></div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Pages visited {seen}/{total} · Quiz {progress.quiz[m.bookId] ? "done" : "not yet"} · {progress.finished[m.bookId] ? `Finished ${progress.finished[m.bookId]}` : "Not finished"}
              </div>
              {b && b.chapters.some(c => progress.practice[m.bookId]?.[c.id]?.length) && (
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-left"><th className="py-1">Practice Reads</th><th>Date</th><th className="text-right">Words</th><th className="text-right">Missed</th><th className="text-right">Per minute</th></tr></thead>
                  <tbody>
                    {b.chapters.flatMap(c => (progress.practice[m.bookId]?.[c.id] || []).map((r, k) => (
                      <tr key={c.id + k} style={{ borderTop: "1px solid var(--line)" }}>
                        <td className="py-1">{c.title.replace(/^Chapter (\d+):.*/, "Ch. $1")}</td><td>{r.date}</td>
                        <td className="text-right">{r.words}</td><td className="text-right">{r.missed}</td><td className="text-right font-bold">{r.wcpm}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </section>

      <section className="mb-6">
        <h3 className="font-bold text-lg mb-2">Starting Circle</h3>
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Books are for independent reading. Choose a Circle where your reader decodes about 98% of words without help. Unlocking a Circle also unlocks the ones before it.</p>
        <div className="flex flex-wrap gap-2">
          {manifest.circles.map((c, i) => (
            <Btn key={c} kind={progress.unlocked.includes(c) ? "solid" : "soft"}
              onClick={() => update(p => ({ ...p, unlocked: manifest.circles.slice(0, i + 1) }))}>{progress.unlocked.includes(c) ? "✓ " : ""}{c}</Btn>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-bold text-lg mb-2">Move progress to another device</h3>
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>Progress is saved in this browser. To read on another tablet, phone or Chromebook, copy the code here and paste it there.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <Btn kind="solid" onClick={exportCode}>Copy progress code</Btn>
          <Btn onClick={importCode} disabled={!code.trim()}>Paste progress code</Btn>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} rows={3} placeholder="Paste a progress code here (starts with WH1:)"
          className="w-full rounded-xl p-2 text-xs font-mono" style={{ border: "2px solid var(--line)", background: "var(--bg)", color: "var(--ink)" }} />
        {msg && <div className="text-sm mt-1" role="status">{msg}</div>}
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2">Reset</h3>
        <Btn onClick={() => { if (confirmReset) { update(() => freshProgress()); setConfirmReset(false); setMsg("Progress reset."); } else setConfirmReset(true); }}>
          {confirmReset ? "Tap again to erase all progress" : "Reset progress"}
        </Btn>
      </section>
    </Sheet>
  );
}

/* ---------- motion ---------- */
const style = document.createElement("style");
style.innerHTML = `
@keyframes wh-wiggle { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-7deg)} 40%{transform:rotate(6deg)} 60%{transform:rotate(-4deg)} 80%{transform:rotate(2deg)} }
@keyframes wh-roll { 0%{transform:translateX(0) rotate(0)} 50%{transform:translateX(18px) rotate(200deg)} 100%{transform:translateX(0) rotate(360deg)} }
@keyframes wh-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
@keyframes wh-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
@keyframes wh-pop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
.wh-anim-wiggle{animation:wh-wiggle .7s ease-in-out}
.wh-anim-roll{animation:wh-roll .9s ease-in-out}
.wh-anim-float{animation:wh-float 1.2s ease-in-out}
.wh-anim-pulse{animation:wh-pulse .8s ease-in-out}
.wh-pop{animation:wh-pop .25s ease-out}
.wh-glow{filter:drop-shadow(0 0 10px rgba(47,125,91,.8))}
.wh-reduce-motion *{animation:none!important;transition:none!important}
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
