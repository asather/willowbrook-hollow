# Willowbrook Hollow – Circle System Guide

## What a Circle is
A Circle is two things at once:

- **In the story**, it is a rank the Hollow animals earn: Acorn (newcomers), Leaf (helpers), Branch (junior rescuers), Oak (mentors) and Elder (storytellers).
- **For the reader**, it is a reading level. Every book in a Circle follows that Circle's word rules. Finishing a Circle's books unlocks the next Circle, with a Circle Ceremony.

## The leveling principle: written for the reader's age, decodable at the reader's level
Willowbrook Hollow is written for readers who understand far more than they can yet decode. The humor, plots and stakes suit an 8–10-year-old at every Circle. Circles control how hard the **words** are to read, never how grown-up the **story** is.

The main measure of difficulty is **decodability**: which spelling patterns and how many syllables a reader must decode. Sentence length and book length come second. Reading-level formulas (Flesch–Kincaid, Lexile) only measure sentence and word length, so they are reported for reference only. They never decide a Circle.

## Choosing a reader's starting Circle
Books are for **independent, enjoyable reading and fluency practice**, so start one Circle *below* the level where the reader needs a teacher's help. A reader should decode about 98% of the words on a page without help. If most pages need help, drop a Circle; if pages feel effortless and fast, move up. The Parent Corner in the app can unlock any Circle.

## Word rules by Circle
Each Circle's rules live in `circles/{circle}/words.json` (`rules`), and `tools/check-book.mjs` enforces them. The table below summarizes them.

| Circle | In-story role | Longest word* | Spelling patterns in scope | Sentence length (max / average) | Book length | Chapter length | Page length |
|---|---|---|---|---|---|---|---|
| **Acorn** | Newcomers | 2 syllables | Closed, open, vowel-consonant-e, vowel team and r-controlled syllables; digraphs (sh, ch, th, wh, ck, ng, nk, tch, dge); blends; endings -s, -es, -ed, -ing, -er, -est, -y, -ly, -ful | 12 / 5–9 | 1,000–2,000 | 150–400 | 30–90 |
| **Leaf** | Helpers | 3 syllables | + consonant-le; soft c and g; igh; silent letters (kn, wr, gn, mb); ph; ei / ie; -tion / -sion / -ture | 16 / 7–11 | 2,000–4,000 | 300–600 | 50–130 |
| **Branch** | Junior Rescuers | 4 syllables | + ough / augh / eigh; -ous, -ment, -ible, -able; common Latin prefixes and suffixes | 20 / 9–13 | 4,000–7,000 | 500–900 | 80–180 |
| **Oak** | Hollow Mentors | 5 syllables | + Greek and Latin roots; mild figurative language | 24 / 10–15 | 7,000–12,000 | 800–1,400 | 120–250 |
| **Elder** | Rare / Respected | no limit | All patterns; multi-book arcs | 28 / 11–17 | 12,000–20,000 | 1,000–2,000 | 150–300 |

\* Proper names, heart words and story words are exempt from the syllable limit and the spelling rules.

### Three kinds of allowed exceptions
1. **Names** (`circles/names.json`): character and place names. Readers learn them from the cast page and the character bios, and tapping a name plays it.
2. **Heart words** (`heartWords` in each Circle's file): very common words that break the Circle's spelling rules, such as *said*, *was*, *could*, *friend* and *know*. Readers learn them by sight. Each Circle adds to the heart words of the Circles before it.
3. **Story words** (`words` in each Circle's file): a few rich or tricky words a story really needs, such as *viola* and *sanctuary*. Each is **highlighted** in the text, split into syllables, defined, and spoken when tapped. Each Circle caps how many a single book may use: 8 for Acorn, 10 for Leaf, 12 for Branch, 15 for Oak and 20 for Elder.

### Reading skills each Circle's stories model
| Circle | Story shape | Reader skills the quiz echoes |
|---|---|---|
| Acorn | One plot thread plus a running gag; every page illustrated | Who did what; what happened first and next; one "what do you think?" question |
| Leaf | Main plot and a small gag subplot | Cause and effect; teamwork; predicting |
| Branch | Main plot and a connected subplot; feeling words | Characters' feelings and motives; problem and solution |
| Oak | Parallel threads; planning and mentoring | Comparing viewpoints; figurative meaning |
| Elder | Multi-book arcs; deeper themes | Theme; how a character changes across books |

## How Circles work in the books
1. **Every book belongs to exactly one Circle** and passes `node tools/check-book.mjs` before release.
2. **The last book of a Circle ends with a Ceremony** at the Great Oak. In `manifest.json` that book carries `"ceremony": true`. Finishing it, with its quiz, welcomes the reader into the next Circle:
   - **Acorn → Leaf:** green leaf charm.
   - **Leaf → Branch:** carved twig token.
   - **Branch → Oak:** carved acorn pendant, with speeches (often comical).
   - **Oak → Elder:** rare; storytelling and a carved staff or cane.
3. **Circle symbols appear in the art** (carved, woven, painted), always in the background and never counted or called out in the text.

## Circle symbols (official assets)
Stored as `images/ui/circles/circle-{acorn|leaf|branch|oak|elder}.png`. Always use the official files; never regenerate variants.

## Ceremony notes (tone and gags)
- **Acorn:** cozy welcome; Tansy drops extra acorns; Puddle claps off the beat.
- **Leaf:** playful "Leaf Toss"; Wren narrates and gets the facts wrong.
- **Branch:** "Branch Parade" carried together; Pip & Pebble argue over the heavy end.
- **Oak:** "Oaklight" with fireflies and candles; Echo over-dramatizes; Puddle sneezes a candle out.
- **Elder:** dawn gathering; quiet stories; Moss rolls into the wrong spot.

## Reader experience across Circles
The same reading supports run through every Circle. Read-to-Me, tap-a-word syllables, Practice Reads, reading comfort settings and gentle quizzes are described in [`READER_APP.md`](READER_APP.md). Progress, badges and Ceremonies reward finishing books, not speed or scores.
