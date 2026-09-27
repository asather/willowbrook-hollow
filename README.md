# Willowbrook Hollow – Project Repository

## Summary
**Willowbrook Hollow** is a series of funny, warm stories about a hidden community of animals behind the Willowbrook Animal Sanctuary. It is written for readers whose ideas are ahead of their decoding: the stories are pitched at 8–10-year-olds, and the words follow strict decoding rules.

The series is organized into **Circles** (Acorn, Leaf, Branch, Oak, Elder). A Circle is a rank in the Hollow and a reading level for the reader. Each Circle sets the syllable length, spelling patterns, sentence length and book length its stories may use. Finishing a Circle's books earns a **Circle Ceremony** and unlocks the next one.

Books are read in a web app built for fluency practice. It has Read to Me with word highlighting, tap-any-word syllable splitting, one-minute Practice Reads against the reader's own best, gentle read-aloud quizzes, reading comfort settings (dyslexia-friendly fonts, spacing, reading ruler), badges and a Parent Corner.

---

## Documentation
All planning and reference files live in [`/docs`](docs):

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) – Goals, story premise, characters, style and technical approach.
- [`CIRCLES_README.md`](docs/CIRCLES_README.md) – The Circle system: leveling principle, word rules per Circle, exceptions, Ceremonies.
- [`READER_APP.md`](docs/READER_APP.md) – What the reader app does: Read to Me, tap-a-word, Practice Read, quizzes, settings, progress.
- [`story-creation-checklist.README.md`](docs/story-creation-checklist.README.md) – How to write and release a new book.
- [`book.README.md`](docs/book.README.md), [`words.README.md`](docs/words.README.md), [`manifest.README.md`](docs/manifest.README.md) – Data file references (schemas alongside).
- [`CHARACTER_BIBLE.md`](docs/CHARACTER_BIBLE.md), [`CHARACTERS_README.md`](docs/CHARACTERS_README.md), [`character-bios.README.md`](docs/character-bios.README.md), [`character-creation-checklist.README.md`](docs/character-creation-checklist.README.md) – Characters.

---

## Repository Structure

```
index.html                  # Reader app entry point
js/app.jsx                  # Reader app (React 18, compiled in the browser)
js/syllables.js             # Syllable splitter shared by the app and the checker
manifest.json               # Circles and the list of books
books/{bookId}/book.json    # One folder per book (e.g. acorn-001), with its art in images/
circles/{circle}/words.json # Each Circle's word rules, heart words and story words
circles/names.json          # Character and place names (exempt from word rules)
images/characters/master/   # Official character master art
images/characters/variants/ # Approved seasonal or scene-specific variations
images/ui/circles/          # Official Circle emblems
docs/                       # Documentation, JSON schemas, character bios, About text
tools/check-book.mjs        # Validates JSON and checks books against their Circle's rules
```

---

## Working on the project

**Run the reader locally:** from the repo root, run `python3 -m http.server 8000` and open `http://localhost:8000`.

**Check everything before committing:** `node tools/check-book.mjs --all` (Node 18+, no dependencies). It validates every data file against its schema and checks each book's words, sentences and lengths against its Circle's rules. A book ships only when it passes.

**Asset rules:**
- All **character masters** and **Circle symbols** come from the official files in `images/characters/master/` and `images/ui/circles/`.
- No unapproved changes to proportions, colors or permanent accessories.
- Variants go in `images/characters/variants/` and must be approved before use.
- PNG and JPG files are stored with Git LFS; book covers are WebP.
