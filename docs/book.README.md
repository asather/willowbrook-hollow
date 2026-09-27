# `book.json` — One Book
**Audience:** authors, editors, illustrators and developers
**Purpose:** everything the reader app needs to show one book: title page, cast, chapters and pages, art, and the quiz.
**Schema:** [`book.schema.json`](book.schema.json). `node tools/check-book.mjs` validates it and checks the text against the book's Circle rules.

---

## 1) Location
- **Path pattern:** `books/{circle-lower}-{NNN}/book.json`, e.g. `books/acorn-001/book.json`.
- The book's own art lives beside it in `books/{bookId}/images/`.
- **All asset paths are relative to the site root**, e.g. `books/acorn-001/images/cover.webp` or `images/web/characters/moss.webp`. Always use forward slashes.

## 2) Example (trimmed from `acorn-001`)
```json
{
  "circle": "Acorn",
  "circleIcon": "images/web/circles/circle-acorn.webp",
  "bookId": "acorn-001",
  "title": "The Monster in the Barn",
  "subtitle": "A Willowbrook Hollow story",
  "cover": {
    "image": "books/acorn-001/images/cover.webp",
    "alt": "Moss, Wren, Tansy and Leo peek at Zoe, the giant, in front of the barn"
  },
  "cast": [
    "moss",
    "brindle",
    "wren",
    "tansy",
    "pip-pebble",
    "zoe",
    "leo",
    "echo",
    "puddle"
  ],
  "toc": [
    {
      "type": "title",
      "label": "Title Page"
    },
    {
      "type": "chapter",
      "label": "Chapter 1: The Sound",
      "anchor": "ch1"
    }
  ],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter 1: The Sound",
      "pages": [
        {
          "number": 1,
          "layout": "art-left",
          "text": [
            "The sun was going down on Willowbrook Hollow. The sky was pink and gold.",
            "Moss the hedgehog sat by the stream. He was having a snack of bugs. It was calm and still.",
            "Then a sound came from the barn.",
            "SKREEE-AWK!",
            "Moss dropped his bug. His spines stood up. He rolled into a ball."
          ],
          "media": [
            {
              "type": "image",
              "src": "images/web/characters/moss.webp",
              "alt": "Moss the hedgehog",
              "animation": {
                "kind": "roll",
                "trigger": "tap"
              }
            }
          ]
        }
      ]
    }
  ],
  "quiz": {
    "instructions": "Tap an answer. Tap the speaker to hear the question. You can try as many times as you like!",
    "questions": [
      {
        "id": "q1",
        "type": "recall",
        "prompt": "What did Wren think was in the box?",
        "choices": [
          "A lion",
          "A bug",
          "A goat"
        ],
        "answerIndex": 0,
        "reactions": {
          "correct": {
            "character": "images/web/characters/wren.webp",
            "line": "Yes! A vi-o-LION! I was a little bit off."
          },
          "tryAgain": {
            "character": "images/web/characters/leo.webp",
            "line": "Hmm. Think back to Wren’s big news. Try again!"
          }
        }
      },
      {
        "id": "q4",
        "type": "think",
        "prompt": "What do you think Moss will be brave about next?",
        "choices": [
          "Swimming in the stream",
          "Singing a song",
          "Going into the barn first"
        ],
        "reactions": {
          "correct": {
            "character": "images/web/characters/moss.webp",
            "line": "Maybe! One small step at a time."
          },
          "tryAgain": {
            "character": "images/web/characters/moss.webp",
            "line": "Maybe! One small step at a time."
          }
        }
      }
    ]
  }
}
```

## 3) Field reference

### Top level
| Field | Required | Meaning |
|---|---|---|
| `circle` | yes | The book's Circle; must be one of `manifest.json` `circles`. Its rules come from `circles/{circle}/words.json`. |
| `circleIcon` | yes | Web copy of the official emblem, `images/web/circles/circle-{circle}.webp`. |
| `bookId` | yes | `{circle-lower}-{NNN}`, permanent (progress is saved under it). |
| `title`, `subtitle` | title yes | Shown on the title page and in the Library. |
| `cover` | yes | `image` (16:9; WebP keeps it small, e.g. `books/{bookId}/images/cover.webp`) and `alt`. |
| `cast` | yes | Character ids (keys of `docs/character-bios.json`) in order of appearance; shown as the cast strip on the title page. |
| `toc` | yes | `{ "type": "title" }` first, then one `{ "type": "chapter", "label", "anchor" }` per chapter; `anchor` equals a `chapters[].id`. |
| `chapters` | yes | `id`, `title` ("Chapter N: Name"), `pages`. Practice Read works chapter by chapter. |
| `quiz` | yes | `instructions` and 3–5 `questions`. |

### `pages[]`
| Field | Required | Meaning |
|---|---|---|
| `number` | yes | 1, 2, 3… across the whole book, no gaps or repeats. |
| `layout` | yes | `art-left`, `art-right` or `art-full` (art above the text). |
| `text` | yes | Paragraphs. Use curly quotes (“ ” ‘ ’) and an ellipsis (…). Story words are highlighted automatically. |
| `media` | yes | At least one image: `type` "image", `src`, `alt`, optional `animation` `{ kind: pulse \| float \| wiggle \| roll, trigger: tap \| auto }`. Several images show side by side (use one per character on the page when there's no scene art). |

### `quiz.questions[]`
| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within the book (`q1`, `q2`…). |
| `type` | yes | `recall` (one right answer) or `think` (prediction or opinion; every answer is accepted). |
| `prompt`, `choices` | yes | 2–4 choices. Follow the Circle's word rules. |
| `answerIndex` | recall only | Index of the right choice. |
| `reactions` | yes | `correct` and `tryAgain`, each `{ character: web image path (images/web/characters/{id}.webp), line }`. For think questions both are shown for any answer, so they can be the same. |

## 4) Rules the checker enforces
- The file matches the schema; `toc` anchors match chapter ids.
- Every page has art.
- Page, chapter and book word counts sit in the Circle's ranges; no sentence exceeds the Circle's maximum; the average sentence length is in range.
- Every word is a name, a heart word, a story word, or within the Circle's syllable limit and spelling patterns.
- No more story words than the Circle's per-book limit.

## 5) Common pitfalls
- A word the device voice mispronounces: add `pronounce` to its story-word entry instead of respelling it in the text.
- Straight quotes (`"`) in text: they work, but curly quotes read better and keep sentence detection accurate.
- Renaming a `bookId` after release loses readers' saved progress for that book.
- Pointing `media` at `images/characters/master/…png`: those are full-size LFS files the website can't serve. Use `images/web/characters/{id}.webp`; the checker flags this.
