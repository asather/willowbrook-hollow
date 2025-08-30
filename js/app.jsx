const {useState, useEffect, useMemo, useRef} = React;

const cls = (...parts) => parts.filter(Boolean).join(" ");


// put near the other top-level consts in app.jsx
const CHARACTER_IMAGE = {
  moss: "./images/characters/master/moss_master.png",
  tansy: "./images/characters/master/tansy_master.png",
  brindle: "./images/characters/master/brindle_master.png",
  wren: "./images/characters/master/wren_master.png",
  echo: "./images/characters/master/echo_master.png",
  puddle: "./images/characters/master/puddle_master.png",
  "pip-pebble": "./images/characters/master/pip_pebble_master.png",
  zoe: "./images/characters/master/zoe_master.png",
};



function useSwipe(onLeft, onRight) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const threshold = 40;
  function onTouchStart(e){ touchStartX.current = e.changedTouches[0].screenX; }
  function onTouchEnd(e){
    touchEndX.current = e.changedTouches[0].screenX;
    const dx = (touchEndX.current ?? 0) - (touchStartX.current ?? 0);
    if (Math.abs(dx) > threshold) { if (dx < 0) onLeft?.(); else onRight?.(); }
  }
  return { onTouchStart, onTouchEnd };
}

function useCircleWords(circle) {
  const [state, setState] = useState({ map: new Map(), loaded: false });
  useEffect(() => {
    const path = `./circles/${circle.toLowerCase()}/words.json`;
    fetch(path).then(r => r.ok ? r.json() : { words: [] }).then(data => {
      const m = new Map();
      (data.words || []).forEach(w => m.set(String(w.word).toLowerCase(), { audio: w.audio }));
      setState({ map: m, loaded: true });
    }).catch(() => setState({ map: new Map(), loaded: true }));
  }, [circle]);
  return state;
}

function renderInlineWithVocab(text, vocabMap, onSpeak) {
  const tokens = text.split(/(\b)/);
  return tokens.map((tok, i) => {
    const word = tok.replace(/[^A-Za-z']/g, "");
    const has = vocabMap.has(word.toLowerCase());
    if (has && /[A-Za-z]/.test(word)) {
      return (
        <button
          key={i}
          onClick={() => onSpeak(word)}
          className="px-1 rounded-md bg-amber-100 hover:bg-amber-200 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          title="Tap to hear this word"
        >{tok}</button>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function App(){
  const [view, setView] = useState({kind:"home"});
  const [manifest, setManifest] = useState(null);
  const [bios, setBios] = useState(null);

  useEffect(() => { fetch("./manifest.json").then(r=>r.json()).then(setManifest); }, []);
  useEffect(() => { fetch("./docs/character-bios.json").then(r=>r.json()).then(setBios); }, []);

  const openBook = (bookMeta) => {
    fetch(bookMeta.path).then(r=>r.json()).then(book => {
      setView({ kind: "book", book });
    });
  };

  const openBio = (characterId) => {
    setView({ kind: "bio", characterId });
  };

  if(!manifest || !bios){
    return <div className="min-h-screen flex items-center justify-center text-stone-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-stone-900">
      {view.kind === "home" && (
        
        <HomeScreen manifest={manifest} onOpenBook={openBook} onOpenBio={openBio} />
      )}
      {view.kind === "book" && (
        <BookViewer book={view.book} onExit={() => setView({ kind:"home" })} />
      )}
      {view.kind === "bio" && (
        <CharacterBioView
          characterId={view.characterId}
          bio={bios[view.characterId]}
          onExit={() => setView({ kind:"home" })}
        />
      )}
    </div>
  );
}


function HomeScreen({ manifest, onOpenBook, onOpenBio }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const booksByCircle = useMemo(() => {
    const map = new Map();
    manifest.circles.forEach(c => map.set(c, []));
    manifest.books.forEach(b => {
      if (!map.has(b.circle)) map.set(b.circle, []);
      map.get(b.circle).push(b);
    });
    return map;
  }, [manifest]);

  return (
    <div className="relative">
      <button aria-label="Open menu"
        className="fixed top-4 left-4 z-50 rounded-2xl bg-white/90 shadow px-3 py-2 text-sm font-semibold hover:bg-white"
        onClick={() => setMenuOpen(s => !s)}>☰ Menu</button>

      <div className={cls("fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-40 transition-transform duration-300",
        menuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Library</h2>
          <button className="rounded-xl px-2 py-1 bg-emerald-100" onClick={() => setMenuOpen(false)}>Close</button>
        </div>
        <nav className="p-4 space-y-5 overflow-y-auto h-[calc(100%-56px)]">
          {manifest.circles.map(circle => (
            <div key={circle}>
              <div className="text-emerald-700 font-semibold mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />{circle}
              </div>
              <ul className="space-y-2 pl-3">
                {booksByCircle.get(circle)?.map(b => (
                  <li key={b.bookId}>
                    <button className="w-full text-left rounded-xl px-3 py-2 hover:bg-emerald-50"
                      onClick={() => { setMenuOpen(false); onOpenBook(b); }}>
                      <div className="text-sm font-medium">{b.title}</div>
                      {b.subtitle && <div className="text-xs text-stone-500">{b.subtitle}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-emerald-700 font-semibold mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />About
            </div>
            <ul className="space-y-2 pl-3">
              <li className="text-sm text-stone-500">Coming soon…</li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="relative w-full max-w-4xl aspect-[16/9] rounded-3xl shadow-xl bg-gradient-to-br from-emerald-200 via-emerald-100 to-amber-100 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-3 p-6 gap-4 select-none">
            <SplashCard id="moss"        name="Moss" onClick={onOpenBio} />
            <SplashCard id="tansy"       name="Tansy" onClick={onOpenBio}/>
            <SplashCard id="brindle"     name="Brindle" onClick={onOpenBio}/>
            <SplashCard id="wren"        name="Wren" onClick={onOpenBio}/>
            <SplashCard id="echo"        name="Echo" onClick={onOpenBio}/>
            <SplashCard id="puddle"      name="Puddle" onClick={onOpenBio}/>
            <SplashCard id="pip-pebble"  name="Pip & Pebble" onClick={onOpenBio}/>
            <SplashCard id="zoe"         name="Zoe" onClick={onOpenBio}/>
            <div className="rounded-2xl bg-white/60 border border-emerald-200 flex items-center justify-center text-sm">More friends…</div>

          </div>
        </div>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Willowbrook Hollow</h1>
        <p className="mt-2 max-w-2xl text-stone-600">Open the menu to pick a book, or try the demo.</p>
        <button className="mt-6 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700"
          onClick={() => onOpenBook(manifest.books[0])}>Try the Demo Book</button>
      </div>
    </div>
  );
}

function CharacterBioView({ characterId, bio, onExit }){
  const [tab, setTab] = useState("acorn");
  const levels = ["acorn","leaf","branch","oak","elder"];
  const src = CHARACTER_IMAGE[characterId];
  const name = bio?.name ?? characterId;

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b px-4 py-2 flex items-center gap-2">
        <button className="rounded-xl px-3 py-1 bg-emerald-100 hover:bg-emerald-200" onClick={onExit}>← Back</button>
        <div className="flex-1 text-center font-semibold">{name} · Biography</div>
      </header>

      <main className="px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-white shadow overflow-hidden">
          <div className="p-6 grid gap-6 md:grid-cols-[160px,1fr] items-start">
            <div className="w-40 h-40 rounded-2xl bg-emerald-50 border overflow-hidden mx-auto md:mx-0 flex items-center justify-center">
              {src ? <img src={src} alt={name} className="w-full h-full object-contain" /> : <span className="text-xs text-emerald-700">{name}</span>}
            </div>

            <div>
              <div className="flex gap-2 flex-wrap">
                {levels.map(l => (
                  <button key={l}
                    className={cls(
                      "px-3 py-1 rounded-xl border text-sm",
                      tab===l ? "bg-emerald-600 text-white border-emerald-700" : "bg-white hover:bg-emerald-50"
                    )}
                    onClick={() => setTab(l)}
                  >
                    {l[0].toUpperCase()+l.slice(1)}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-stone-800 leading-relaxed">
                {bio?.levels?.[tab] ?? "No biography available for this level yet."}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 text-xs text-stone-500">
            Based on the official Character Bible and asset rules (e.g., Echo’s forest-green satchel; Brindle’s bandana). 
          </div>
        </div>
      </main>
    </div>
  );
}

function SplashCard({ id, name, onClick }){
  const src = CHARACTER_IMAGE[id];
  return (
    <button
      onClick={() => onClick?.(id)}
      className="rounded-2xl bg-white/70 border border-emerald-200 p-3 flex flex-col items-center justify-center hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-100 border overflow-hidden flex items-center justify-center">
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <span className="text-xs text-emerald-700">{name}</span>
        )}
      </div>
      <div className="mt-2 text-xs text-stone-600">{name}</div>
    </button>
  );
}


function BookViewer({ book, onExit }){
  const [pageIndex, setPageIndex] = useState(0);
  const [flatPages, setFlatPages] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [inQuiz, setInQuiz] = useState(false);

  useEffect(() => {
    const pages = [];
    pages.push({ kind: "title", number: 0 });
    book.chapters.forEach(ch => {
      ch.pages.forEach(p => pages.push({ kind: "page", chapterId: ch.id, chapterTitle: ch.title, ...p }));
    });
    setFlatPages(pages);
  }, [book]);

  const current = flatPages[pageIndex] || { kind: "title" };
  const { onTouchStart, onTouchEnd } = useSwipe(() => goNext(), () => goPrev());

  function goPrev(){ setPageIndex(i => Math.max(0, i - 1)); }
  function goNext(){ setPageIndex(i => Math.min(flatPages.length - 1, i + 1)); }
  function gotoAnchor(anchor){
    const idx = flatPages.findIndex(p => p.chapterId === anchor);
    if (idx >= 0) setPageIndex(idx);
    setTocOpen(false);
  }

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b px-4 py-2 flex items-center gap-2">
        <button className="rounded-xl px-3 py-1 bg-emerald-100 hover:bg-emerald-200" onClick={onExit}>← Library</button>
        <div className="flex-1 text-center font-semibold">{book.title}</div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl px-3 py-1 bg-emerald-100 hover:bg-emerald-200" onClick={() => setTocOpen(true)}>Chapters</button>
          <button className="rounded-xl px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setInQuiz(true)}>Quiz</button>
        </div>
      </header>

      <main className="relative overflow-hidden" {...{onTouchStart, onTouchEnd}}>
        <div className="mx-auto max-w-4xl p-4">
          {current.kind === "title" ? (
            <TitlePage book={book} onStart={() => setPageIndex(1)} />
          ) : (
            <PageView page={current} circle={book.circle} />
          )}
        </div>

        {tocOpen && (
          <Modal onClose={() => setTocOpen(false)} title="Table of Contents">
            <div className="space-y-4">
              {book.toc.map((item, idx) => (
                <div key={idx}>
                  {item.type === "title" ? (
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50" onClick={() => { setPageIndex(0); setTocOpen(false); }}>Title Page</button>
                  ) : (
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50" onClick={() => gotoAnchor(item.anchor)}>{item.label}</button>
                  )}
                </div>
              ))}
            </div>
          </Modal>
        )}

        {inQuiz && (
          <Modal onClose={() => setInQuiz(false)} title="Quiz">
            <Quiz quiz={book.quiz} />
          </Modal>
        )}
      </main>

      <footer className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button className="rounded-xl px-4 py-2 bg-emerald-100 hover:bg-emerald-200" onClick={goPrev}>← Prev</button>
          <div className="text-sm text-stone-600">Page {current.number ?? 0} / {flatPages.at(-1)?.number ?? 0}</div>
          <button className="rounded-xl px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={goNext}>Next →</button>
        </div>
      </footer>
    </div>
  );
}

function TitlePage({ book, onStart }){
  return (
    <div className="rounded-3xl border shadow bg-white overflow-hidden">
      <div className="relative aspect-[16/9] bg-emerald-100 flex items-center justify-center">
        <div className="absolute top-4 left-4 w-16 h-16 rounded-xl bg-white/80 border flex items-center justify-center">
          <span className="text-xs">{book.circle}</span>
        </div>
        <div className="text-stone-500">(Cover art placeholder)</div>
      </div>
      <div className="p-6 text-center">
        <h2 className="text-2xl font-extrabold">{book.title}</h2>
        {book.subtitle && <p className="mt-1 text-stone-600">{book.subtitle}</p>}
        <button className="mt-6 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700" onClick={onStart}>Start Reading</button>
      </div>
    </div>
  );
}

function PageView({ page, circle }){
  const [animating, setAnimating] = useState({});
  const [audio, setAudio] = useState(null);
  const vocab = useCircleWords(circle);

  useEffect(() => () => { if (audio) audio.pause(); }, [audio]);

  function toggleAnimation(i){ setAnimating(prev => ({...prev, [i]: !prev[i]})); }
  function speakWord(word){
    const entry = vocab.map.get(word.toLowerCase());
    if(!entry) return;
    const a = new Audio(entry.audio);
    setAudio(a);
    a.play();
  }

  return (
    <div className="rounded-3xl border shadow bg-white overflow-hidden">
      <div className={cls("grid gap-6 p-6", page.layout === "art-full" ? "grid-cols-1" : "md:grid-cols-2")} style={{minHeight:360}}>
        <div className={cls(page.layout === "art-right" ? "md:order-2" : "md:order-1", "relative rounded-2xl bg-emerald-50 border flex items-center justify-center overflow-hidden")}>
          {page.media?.filter(m => m.type === "image").map((m, idx) => (
            <AnimatedImage key={idx} media={m} active={!!animating[idx]} />
          ))}
          {page.interactivity?.filter(i => i.kind === "hotspot").map((h, idx) => (
            <button key={idx} className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-600/70 bg-white/50 hover:bg-white"
              style={{left:`${h.x}%`, top:`${h.y}%`}} aria-label="Interactive hotspot"
              onClick={() => { if(h.onTap?.action === "toggleAnimation"){ toggleAnimation(h.onTap.targetMediaIndex ?? 0); } }} />
          ))}
        </div>

        <div className={cls(page.layout === "art-right" ? "md:order-1" : "md:order-2", "leading-relaxed text-lg")}>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">{page.chapterTitle}</h3>
          <div className="space-y-4">
            {page.text?.map((t, idx) => <p key={idx}>{renderInlineWithVocab(t, vocab.map, speakWord)}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedImage({ media, active }){
  return (
    <div className={cls(
      "w-56 h-56 md:w-72 md:h-72 bg-white/80 border rounded-2xl shadow flex items-center justify-center transition-transform",
      active && media.animation?.kind === "pulse" && "animate-pulse",
      active && media.animation?.kind === "float" && "motion-safe:animate-[float_3s_ease-in-out_infinite]",
      active && media.animation?.kind === "spin" && "motion-safe:animate-spin"
    )}
      style={{ backgroundImage: media.src ? `url(${media.src})` : undefined, backgroundSize:"cover", backgroundPosition:"center" }}
      aria-label={media.alt || "Artwork"}>
      {!media.src && <span className="text-xs text-stone-500">(art placeholder)</span>}
    </div>
  );
}

function Quiz({ quiz }){
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const q = quiz.questions[index];

  function answer(i){
    setSelected(i);
    const correct = i === q.answerIndex;
    setFeedback(correct ? q.reactions.correct : q.reactions.incorrect);
  }
  function next(){ setSelected(null); setFeedback(null); if (index < quiz.questions.length - 1) setIndex(index + 1); }
  const finished = index === quiz.questions.length - 1 && feedback && selected !== null;

  return (
    <div>
      <p className="text-sm text-stone-600 mb-4">{quiz.instructions}</p>
      <div className="rounded-xl border p-4 bg-emerald-50">
        <div className="font-semibold mb-3">Q{index + 1}. {q.prompt}</div>
        <div className="grid gap-2">
          {q.choices.map((c, i) => (
            <button key={i} disabled={selected !== null} onClick={() => answer(i)}
              className="text-left px-3 py-2 rounded-lg border bg-white hover:bg-emerald-100 disabled:opacity-60">{c}</button>
          ))}
        </div>
      </div>
      {feedback && (
        <div className="mt-4 flex items-center gap-3 p-3 border rounded-xl bg-white">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border flex items-center justify-center overflow-hidden">
            <span className="text-[10px] text-emerald-700">Character</span>
          </div>
          <div className="text-sm">{feedback.line}</div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-stone-500">{index + 1} / {quiz.questions.length}</div>
        {!finished ? (
          <button className="rounded-xl px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={next} disabled={selected === null}>Next</button>
        ) : (
          <div className="text-emerald-700 font-semibold">All done! 🎉</div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border shadow-lg p-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="rounded-lg px-3 py-1 bg-emerald-100 hover:bg-emerald-200" onClick={onClose}>Close</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

// Tailwind keyframes for float
const style = document.createElement("style");
style.innerHTML = "@keyframes float { 0%{ transform: translateY(0) } 50%{ transform: translateY(-6px) } 100%{ transform: translateY(0) } }";
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
