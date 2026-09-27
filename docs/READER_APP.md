# Willowbrook Hollow – Reader App

**Audience:** developers, and grown-ups who want to know what each button does.
**Code:** `index.html` + `js/app.jsx` (React 18 via CDN, compiled in the browser) and `js/syllables.js`. Content is plain JSON (`manifest.json`, `books/*/book.json`, `circles/*/words.json`, `circles/names.json`, `docs/character-bios.json`, `docs/about.json`).
**Run locally:** from the repo root, `python3 -m http.server 8000`, then open `http://localhost:8000`. Opening `index.html` as a file does not work, because the app fetches its JSON.

The app is built around one idea: **fluency grows by reading a text you can decode, hearing it read well, and reading it again.** Every feature below supports that loop and keeps it fun.

---

## 1. Library and Circles
- The **home screen** shows the cast (tap a character for their bio), the reader's current Circle, and a **Keep reading** button that reopens the last book at the last page.
- The **Library** (☰) lists every Circle in order. A Circle is **unlocked** when the Circle before it has had its Ceremony, or when a grown-up unlocks it in the Parent Corner. Acorn is always unlocked. Locked Circles show their books greyed out, with a lock.
- Each book shows ✓ once it is **finished**: every page visited and the quiz completed.

## 2. Reading a book
- **Title page:** cover art, title, the Circle emblem, and a **cast strip** with the characters in the book. Tap a character to hear their name.
- **Pages:** art on one side and text on the other (`art-left`, `art-right`), or art above the text (`art-full`). Tap a picture to make it move (a wiggle, a roll, a float); with Reduce Motion on, it only gets a highlight.
- **Turning pages:** Next / Back buttons, swipe, or the arrow keys. **Chapters** jumps to any chapter.
- **Story words** from the Circle's `words.json` are highlighted. Every other word can still be tapped.

## 3. Read to Me (echo reading)
- **🔊 Read to me** reads the current page aloud with the device's voice, highlighting each word as it is spoken, so the reader's eyes follow the voice.
- When it finishes, the page says **"Your turn! Read it out loud."** Hearing a page read well and then reading it back is echo reading, one of the strongest fluency practices.
- The voice speed (Slow, Just right, Quick) is in Settings. Story words with a `pronounce` respelling use it, so *viola* is read "vee-OH-luh".

## 4. Tap a word
Tapping any word opens a small card that:
- **Splits the word into syllables** (story words and names use their listed syllables; other words use `js/syllables.js`, which follows the same division rules readers learn in school);
- **says the word**, then offers **🐢 Say it slowly**, which speaks it one syllable at a time while each syllable lights up;
- shows the **definition** for story words.

## 5. Practice Read (repeated reading)
**⏱ Practice Read** in the book's header opens a timed one-minute read:
1. Pick a chapter. The whole chapter's text appears as one clean, art-free passage.
2. Press **Start** and read out loud. A calm progress ring counts down 60 seconds, with no ticking and no red.
3. When time is up, or the reader taps **I'm done**, tap the **last word read**.
4. A grown-up listening can add **missed words** with − / + buttons. That turns *words per minute* into *words correct per minute*, the number schools track.
5. The result is saved with the date. The app compares only against the reader's **own** earlier reads of that chapter. A new personal best earns a badge, and a lower score just says "Nice practice!"

Reading the same chapter on different days and watching the number climb is the point. There are no national norms or grades in the app.

## 6. Quiz
- Each book ends with 3–5 questions. **Recall** questions have one right answer; **think** questions (predictions and opinions) accept every answer.
- The question is **read aloud automatically**, and every answer choice has its own 🔊 button.
- A wrong recall answer gets a friendly **try again** line from a character, and that choice fades. There is no score and no failing, so the reader always finishes with the right answer.
- Finishing the quiz on a book whose pages have all been visited marks the book finished. If the book is its Circle's Ceremony book, the **Circle Ceremony** screen plays next.

## 7. Settings (⚙, available everywhere)
| Setting | Options | Default |
|---|---|---|
| Reading font | Atkinson Hyperlegible, Lexend, OpenDyslexic, Classic serif | Atkinson Hyperlegible |
| Text size | S, M, L, XL | L |
| Line spacing | Normal, Roomy, Extra roomy | Roomy |
| Reading ruler | On / Off: shades every paragraph except the one being read (tap a paragraph to move it) | Off |
| Colors | Warm paper, High contrast | Warm paper |
| Reduce motion | On / Off (also follows the device setting) | Device setting |
| Voice speed | Slow, Just right, Quick | Just right |

Settings are saved with the reader's progress.

## 8. Progress, badges and the Parent Corner
- Progress is saved in the browser: pages visited, books finished, quiz answers, Practice Read history, badges, unlocked Circles and settings.
- **Badges:** *First Book*, *Book Finished* (one per book), *Personal Best* (Practice Read), *Echo Reader* (used Read to Me and then Practice Read on the same chapter), and one badge for each Circle Ceremony.
- The **Parent Corner** is behind a simple grown-up check, so a quick tap doesn't open it. It shows:
  - books finished and Practice Read history per chapter;
  - **Unlock a Circle**, to set a reader's starting Circle;
  - **Move progress to another device**: *Copy progress code* on one device and *Paste progress code* on the other. Readers who switch between a tablet, a phone and a Chromebook, or between two homes, keep one progress record;
  - **Reset progress**.

## 9. Accessibility
- All art has alt text; all controls are buttons of at least 44 × 44 px and work from the keyboard.
- Text never sits on top of art, and paragraphs are left-aligned (never justified).
- Motion respects Reduce Motion; Read to Me and Say It Slowly work without motion.
