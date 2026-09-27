# `words.json` — A Circle's Word File (one per Circle)
**Audience:** authors and editors
**Purpose:** defines what readers in a Circle are expected to decode, plus the few exceptions a story may use. The checker enforces it; the reader app uses it to highlight and explain story words.
**Schema:** [`words.schema.json`](words.schema.json)

---

## 1) Location
`circles/{circle-lower}/words.json`: exactly one per Circle (`acorn`, `leaf`, `branch`, `oak`, `elder`). Character and place names live separately in `circles/names.json`, since they are shared by every Circle.

## 2) Example (from `circles/acorn/words.json`, trimmed)
```json
{
  "circle": "Acorn",
  "rules": {
    "maxSyllables": 2,
    "maxSentenceWords": 12,
    "avgSentenceWords": [5, 9],
    "bookWords": [1000, 2000],
    "chapterWords": [150, 400],
    "pageWords": [30, 90],
    "maxStoryWordsPerBook": 8,
    "outOfScope": [
      { "pattern": "igh", "label": "igh (Leaf)" },
      { "pattern": "[^aeiou]le$", "label": "consonant-le syllable (Leaf)" }
    ]
  },
  "heartWords": ["said", "was", "could", "friend", "know"],
  "words": [
    {
      "word": "viola",
      "syllables": ["vi", "o", "la"],
      "definition": "A wooden string instrument. It looks like a violin, but it is a bit bigger and sounds deeper.",
      "pronounce": "vee-OH-luh"
    }
  ]
}
```

## 3) Field reference

### `rules`
| Field | Meaning |
|---|---|
| `maxSyllables` | Longest word allowed (syllables counted by `js/syllables.js`). `null` = no limit. |
| `maxSentenceWords` | No sentence may be longer. |
| `avgSentenceWords` | `[min, max]` for the book's average sentence length. |
| `bookWords`, `chapterWords`, `pageWords` | `[min, max]` word counts. |
| `maxStoryWordsPerBook` | How many different story words one book may use. |
| `outOfScope` | Spelling patterns readers at this Circle have not learned yet. Each `pattern` is a regular expression tested against every lowercase word; `label` says which Circle introduces it. Later Circles list fewer patterns. |

### `heartWords`
Very common words that break this Circle's spelling rules but are learned by sight (*said*, *was*, *could*). A book may use any heart word from its Circle **or any earlier Circle**. Add to this list sparingly; rewording is usually better.

### `words` (story words)
| Field | Required | Meaning |
|---|---|---|
| `word` | yes | Lowercase base form. Plurals and simple endings (-s, -es, -ed, -ing) match automatically. |
| `syllables` | yes | How the word splits, as a reader would sound it out. Shown on the tap-a-word card and used by 🐢 Say it slowly. |
| `definition` | yes | One or two short sentences a child can read or hear. It may use the word itself. |
| `pronounce` | no | Respelling for the device voice when it would say the word wrong (*viola* → "vee-OH-luh"). |
| `audio` | no | Path to a recorded pronunciation, which replaces the device voice for this word. |

Story words are **highlighted** wherever they appear in that Circle's books (and in any later Circle's books), and they are exempt from the Circle's syllable and spelling rules.

## 4) `circles/names.json`
```json
{ "names": [ { "name": "Brindle", "syllables": ["Brin", "dle"] } ] }
```
Every character and place name used in any book. Names are exempt from word rules; tapping a name shows these syllables.

## 5) Rules
- The file's `circle` matches its folder.
- No word appears twice (story words and heart words are case-insensitive).
- Syllables joined together spell the word.
