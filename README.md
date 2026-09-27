# Willowbrook Hollow – Project Repository

## Summary
**Willowbrook Hollow** is a series of funny, warm stories about a hidden community of animals behind the Willowbrook Animal Sanctuary. It is written for readers whose ideas are ahead of their decoding: the stories are pitched at 8–10-year-olds, and the words follow strict decoding rules.

The series is organized into **Circles** (Acorn, Leaf, Branch, Oak, Elder). A Circle is a rank in the Hollow and a reading level for the reader. Each Circle sets the syllable length, spelling patterns, sentence length and book length its stories may use. Finishing a Circle's books earns a **Circle Ceremony** and unlocks the next one.

Books are read in a web app built for fluency practice. It has Read to Me with word highlighting, tap-any-word syllable splitting, one-minute Practice Reads against the reader's own best, gentle read-aloud quizzes, reading comfort settings (dyslexia-friendly fonts, spacing, reading ruler), badges and a Parent Corner.

---

## For AI assistants
Read [`CLAUDE.md`](CLAUDE.md) first. In short: finish every request end to end without being asked.
- Rebuild web images when art changes; run the checker until it passes; test in a browser.
- Keep every doc consistent with the change.
- Commit to `master`, push, and confirm it works on the live site, https://asather.github.io/willowbrook-hollow/.
- Never put the reader's personal or school information in this public repo.

## Documentation
All planning and reference files live in [`/docs`](docs):

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) – Goals, story premise, characters, style and technical approach.
- [`CIRCLES_README.md`](docs/CIRCLES_README.md) – The Circle system: leveling principle, word rules per Circle, exceptions, Ceremonies.
- [`READER_APP.md`](docs/READER_APP.md) – What the reader app does: Read to Me, tap-a-word, Practice Read, quizzes, settings, progress.
- [`story-creation-checklist.README.md`](docs/story-creation-checklist.README.md) – How to write and release a new book.
- [`SCENE_ART.md`](docs/SCENE_ART.md) – How each book's cover and page scenes are made.
- [`book.README.md`](docs/book.README.md), [`words.README.md`](docs/words.README.md), [`manifest.README.md`](docs/manifest.README.md) – Data file references (schemas alongside).
- [`CHARACTER_BIBLE.md`](docs/CHARACTER_BIBLE.md), [`CHARACTERS_README.md`](docs/CHARACTERS_README.md), [`character-bios.README.md`](docs/character-bios.README.md), [`character-creation-checklist.README.md`](docs/character-creation-checklist.README.md) – Characters.

---

## Repository Structure

```
index.html                  # Reader app entry point
js/app.jsx                  # Reader app (React 18, compiled in the browser)
js/syllables.js             # Syllable splitter shared by the app and the checker
manifest.json               # Circles and the list of books
books/{bookId}/book.json    # One folder per book (e.g. acorn-001)
books/{bookId}/scenes.json  # The book's scene layouts; tools/compose-scenes.py turns them into images/
books/{bookId}/images/      # The book's cover and page scenes (WebP)
circles/{circle}/words.json # Each Circle's word rules, heart words and story words
circles/names.json          # Character and place names (exempt from word rules)
images/characters/master/   # Official character master art (full-size PNG, Git LFS; canon source)
images/characters/variants/ # Approved seasonal or scene-specific variations
images/ui/circles/          # Official Circle emblems (PNG, Git LFS; canon source)
images/web/                 # Web-sized WebP copies the app shows (built by tools/make-web-images.py)
docs/                       # Documentation, JSON schemas, character bios, About text
tools/check-book.mjs        # Validates JSON, checks books against their Circle's rules, checks every image is servable
tools/make-web-images.py    # Rebuilds images/web/ from the master art
tools/compose-scenes.py     # Builds a book's cover and page scenes (docs/SCENE_ART.md)
```

---

## Working on the project

**Run the reader locally:** from the repo root, run `python3 -m http.server 8000` and open `http://localhost:8000`.

**Check everything before committing:** `node tools/check-book.mjs --all` (Node 18+, no dependencies). It validates every data file against its schema and checks each book's words, sentences and lengths against its Circle's rules. A book ships only when it passes.

**Asset rules:**
- All **character masters** and **Circle symbols** come from the official files in `images/characters/master/` and `images/ui/circles/`.
- No unapproved changes to proportions, colors or permanent accessories.
- Variants go in `images/characters/variants/` and must be approved before use.
- **Masters are the source; the app shows web copies.** Master PNGs are full-size and stored with Git LFS. GitHub Pages can't serve LFS files, and full-size art is too heavy for a tablet, so the app loads the small WebP copies in `images/web/`. After adding or changing master art, run `python3 tools/make-web-images.py` (needs Pillow and `git lfs pull`) and commit `images/web/`.
- **Every book comes with its pictures.** Whoever writes a book also makes its cover and a scene for every page with `python3 tools/compose-scenes.py books/{bookId}` (see [`docs/SCENE_ART.md`](docs/SCENE_ART.md)).
- Everything the app loads (web copies, book covers, scene art) is WebP stored as regular Git files. The checker fails any image path that is missing or is an LFS pointer.
