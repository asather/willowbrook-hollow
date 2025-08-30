# Willowbrook Hollow — New Story Creation Checklist

**Goal:** End-to-end process for introducing a new Willowbrook Hollow book.  
**Audience:** Authors, illustrators, and developers.  
**Where to save this file:** `/docs/story-creation-checklist.README.md`

---

## 0) Prep
- [ ] Decide **Circle** (Acorn → Elder).
- [ ] Draft **premise, conflict, resolution, humor beats**.
- [ ] List cast of characters.

---

## 1) Files to Create / Update

### a) `manifest.json`
- [ ] Add new `books[]` entry with:
  - `circle` → must match chosen Circle.
  - `bookId` → unique ID (e.g., `leaf-002`).
  - `title` / `subtitle`.
  - `path` → `/books/{circle-lower}-{NNN}/book.json`.
  - `circleIcon` → official Circle emblem under `/images/ui/circles/`.

### b) `books/{circle-lower}-{NNN}/book.json`
- [ ] Fill in metadata, TOC, chapters, pages, and quiz.
- [ ] Write story text appropriate to Circle level.
- [ ] Insert illustrations per page (`media` array).
- [ ] Confirm schema validation.

### c) Vocabulary (`circles/{circle}/words.json`)
- [ ] **Assistant task:** After draft text is complete, **scan story text** and **identify candidate vocabulary words** appropriate for this Circle.
  - Criteria: advanced/new words for readers at this level.
  - These words are **highlighted in running text**; when tapped, audio plays and a definition can display.
- [ ] Add new words with `word`, `audio`, `definition`.
- [ ] **If audio doesn’t exist yet:** generate pronunciation audio and save to `circles/{circle}/audio/`.

### d) `character-bios.json`
- [ ] If a **new character** debuts, add five leveled bios.
- [ ] Confirm existing bios are canon-consistent.

### e) `CHARACTER_BIBLE.md` / `CHARACTERS_README.md`
- [ ] Update if a **new character** appears.

### f) Art Assets
- [ ] **Assistant task:** Generate **art for every page** based on page text + layout.
- [ ] Request **user to re-upload master PNG/SVG files** for each character featured.
- [ ] Export cover image.
- [ ] Place art under `/books/{bookId}/images/`.

---

## 2) QA
- [ ] Validate all JSON against schemas (`manifest.schema.json`, `book.schema.json`, `words.schema.json`, `character-bios.schema.json`).
- [ ] Confirm all characters match master assets (proportions, colors, accessories).
- [ ] Confirm vocabulary highlights trigger **audio playback + optional definitions**.
- [ ] Confirm **every page has art** (no missing `media`).
- [ ] Test Circle advancement ceremony if story is final book in Circle.

---

# Assistant Interview Instructions (New Story)

When interviewing for a new story, the **first question must be**:  
**“Which Circle will this story fall into?”**

---

## A. Interview Script

### 1) Circle & Scope
- Which Circle is this story for (Acorn, Leaf, Branch, Oak, Elder)?
- Will this be the **final book** of the Circle (triggering a Ceremony)?

### 2) Story Content
- Title / subtitle.
- Premise, conflict, resolution.
- Humor beats / gags.

### 3) Characters
- Which characters appear?
- Please **re-upload master PNG/SVG files** for each character (to guarantee latest canon assets).
- Any new characters? → follow full character-creation checklist.

### 4) Vocabulary
- Do you want to **pre-select** any words for highlighting?
- Otherwise, I will **scan the story** and suggest candidate vocabulary.
- Any special instructions for definitions or pronunciations?

### 5) Art & Media
- What cover art should appear?
- Any specific illustration scenes to include?
- Should interactivity (hotspots, animations) be included?
- Confirm: every page will need at least one art piece.

### 6) Quiz
- What skill should the quiz test (plot, teamwork, vocab)?
- Draft questions, choices, and character reactions.

### 7) Audio
- Do existing **audio pronunciations** cover the highlighted words?
- For missing ones, I will **generate new audio files** (short MP3s).

### 8) Integration
- Add to `manifest.json` now?
- Any Circle Ceremony needed?

---

## B. Intake JSON (assistant fills during interview)

```json
{
  "circle": "",
  "bookId": "",
  "title": "",
  "subtitle": "",
  "premise": "",
  "conflict": "",
  "resolution": "",
  "characters": [],
  "newCharacters": [],
  "vocabulary": [],
  "art": {
    "cover": "",
    "illustrations": [],
    "circleSymbolUsage": ""
  },
  "quiz": {
    "skill": "",
    "questions": []
  },
  "audio": {
    "generateMissing": true
  },
  "integration": {
    "manifest": true,
    "finalCircleBook": false
  }
}
```

---

## C. Definition of Done
- `manifest.json` updated with new book entry.
- `book.json` written and schema-valid.
- Vocabulary words identified, added, and audio generated if missing.
- New characters documented (bios + Character Bible/README).
- Art created for every page and cover.
- Circle advancement ceremony confirmed if final book.
- QA passes in local server with no missing assets.
