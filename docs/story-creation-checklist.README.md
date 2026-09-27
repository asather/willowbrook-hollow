# Willowbrook Hollow — New Story Creation Checklist

**Goal:** the end-to-end process for writing and releasing a Willowbrook Hollow book.
**Audience:** authors (human or assistant), illustrators and developers.
**Rule of thumb:** the story is written for an 8–10-year-old; the words are written for the Circle. Read [`CIRCLES_README.md`](CIRCLES_README.md) before drafting.

---

## 0) Plan
- [ ] Choose the **Circle**. The first question in every story interview is: **"Which Circle will this story fall into?"**
- [ ] Decide whether this is the Circle's **final book** (it will carry `"ceremony": true` and end with a Ceremony).
- [ ] Draft the **premise, problem, turning point and resolution**. Something new or strange happens; the Hollow misunderstands it; a running gag makes it worse; a character's quiet strength or an accident fixes it.
- [ ] Choose the **cast** (3–9 characters) and give at least two of them their running gag.
- [ ] Pick **one heart idea** (courage, practice, friendship, patience…). Show it through what the characters do; never state a moral in a lecture.

## 1) Draft to the Circle's word rules
Open `circles/{circle}/words.json` and keep its `rules` in view.
- [ ] Keep every word within the Circle's **syllable limit** and **spelling patterns**, except names, heart words and story words.
- [ ] Choose **story words** on purpose, up to the Circle's per-book limit (Acorn: 8). Good story words are ones the plot truly needs (*viola*), a character's signature (*bandana*), or a delightful word worth learning. Use each one more than once.
- [ ] When a word breaks the rules, **reword before adding exceptions**: *night* → *dusk*, *climb* → *go up*, *everyone* → *the whole Hollow*. Add a heart word only when it is genuinely high-frequency.
- [ ] Keep sentences under the Circle's maximum. Vary length for rhythm: a three-word punchline after a longer setup.
- [ ] Make pages good to **read aloud and re-read**: lots of dialogue, sound words, repetition with a twist ("Tansy went first. Moss went last. Very, very last.").
- [ ] Fit the Circle's **page, chapter and book lengths**. Each page is one beat of the story.

## 2) Build the files

### a) `books/{circle-lower}-{NNN}/book.json`
- [ ] Metadata: `circle`, `circleIcon`, `bookId`, `title`, `subtitle`, `cover`, `cast`.
- [ ] `toc` (title plus one entry per chapter) and `chapters` with `pages`. Every page needs `text` and at least one `media` image with alt text.
- [ ] `quiz`: 3–5 questions. Use at least two **recall** questions (who/what/why, one right answer) and at least one **think** question (prediction or opinion, every answer accepted). Give every question a `correct` and a `tryAgain` reaction from a fitting character. Quiz text follows the Circle's word rules too.
- [ ] Field reference: [`book.README.md`](book.README.md).

### b) `circles/{circle}/words.json`
- [ ] Add each new story word with `word`, `syllables`, `definition` (one or two short sentences a child can read), and `pronounce` if the device voice would say it wrong.
- [ ] Add any new heart words (rarely).
- [ ] New character or place names go in `circles/names.json` with their syllables.
- [ ] Field reference: [`words.README.md`](words.README.md).

### c) `manifest.json`
- [ ] Add the book to `books[]` in reading order, with `"ceremony": true` if it closes its Circle.

### d) Characters
- [ ] A **new character** follows [`character-creation-checklist.README.md`](character-creation-checklist.README.md): master art, bios at all five levels, and entries in the Character Bible and Characters README.
- [ ] Anything new about an existing character (a habit, a possession) is added to the Character Bible.

### e) Art (always part of the job)
The author makes the art along with the words; a book is not finished without it. Follow [`SCENE_ART.md`](SCENE_ART.md).
- [ ] Write `books/{bookId}/scenes.json`: a `cover` and one `page-NN` scene per page, each acting out that page's main beat with only the characters on it.
- [ ] Run `python3 tools/compose-scenes.py books/{bookId}`. It writes `books/{bookId}/images/cover.webp` and `page-NN.webp` (16:9 WebP, regular Git files, never LFS).
- [ ] Point the book's `cover.image` and each page's `media` at those files, with one-sentence alt text describing the scene.
- [ ] Look at every scene at full size and fix anything off: characters match their masters (proportions, colors, permanent accessories), nothing covers a face, the Circle's symbol sits quietly in the background and is never called out in the text.
- [ ] A new place or prop the tool can't draw yet gets a new element in the tool and a row in `SCENE_ART.md`.

## 3) Check
- [ ] `node tools/check-book.mjs books/{bookId}/book.json` passes: schemas valid, every word within the rules, sentence and length targets met, story-word limit respected, cover and every page using the book's own scene art.
- [ ] Read the whole book **aloud**. Does every page have a laugh, a feeling or a turn? Does each running gag land? Would a 9-year-old roll their eyes at anything babyish?
- [ ] In the app (`python3 -m http.server`):
  - [ ] Read to Me reads every page and the highlighting keeps up.
  - [ ] Story words are highlighted, and tapping them shows the right syllables and definition.
  - [ ] Practice Read works on every chapter.
  - [ ] The quiz reads aloud; wrong answers get a try-again line; finishing marks the book finished.
  - [ ] If this is a Ceremony book, the Ceremony plays and the next Circle unlocks.

---

## Assistant interview (new story)
Before interviewing, read [`CLAUDE.md`](../CLAUDE.md). If you can reach the reader's private reading profile (in Andrew's Willow Hollow project, never in this repo), use it to choose the Circle and story words.

Ask one topic at a time, starting with the Circle. If Andrew hands over the choices ("you decide", or he only names a topic), make sensible choices yourself and say what you chose. Don't stall the work on questions.

1. **Circle & scope:** Which Circle? Is it the Circle's final book?
2. **Story:** Title? What new or strange thing happens? What goes wrong? How does it end?
3. **Cast:** Who appears? Any new characters (then run the character checklist)?
4. **Heart idea:** What should the reader feel or notice by the end?
5. **Story words:** Any words the author wants taught? Otherwise the assistant proposes them within the Circle's limit.
6. **Quiz:** Any question the author wants included?
7. **Art:** Any painted illustrations to use? Otherwise the assistant composes every scene itself (the default).

### Intake record (assistant fills during the interview)
```json
{
  "circle": "",
  "bookId": "",
  "ceremony": false,
  "title": "",
  "subtitle": "",
  "premise": "",
  "problem": "",
  "resolution": "",
  "heartIdea": "",
  "cast": [],
  "newCharacters": [],
  "storyWords": [],
  "quizIdeas": [],
  "art": { "cover": "", "paintedScenes": [] }
}
```

## Definition of Done
- `book.json` written; the checker passes with no problems.
- Story words, heart words and names added to their files.
- `manifest.json` updated.
- `scenes.json` written and the cover plus a scene for every page built into `books/{bookId}/images/`, each checked by eye; characters canon-true; `images/web/` rebuilt if any master art changed.
- Read aloud end to end and play-tested in the app, with no broken images or console errors.
- Any doc the change touches is updated so it reads as if this was always the plan.
- **Committed to `master` and pushed.** The live site (https://asather.github.io/willowbrook-hollow/) shows the new book with every image loading, checked by the assistant after the deploy.
- Andrew gets a short report: what's new, the live link, anything he needs to do.
