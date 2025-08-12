# `words.json` — Circle-Level Vocabulary (One per Circle)
**Audience:** Content editors and audio producers  
**Purpose:** Define advanced vocabulary for a *single Circle*. Matching words in any book from that Circle are highlighted and can be tapped to play audio (and optionally show a definition).  
**Used by:** Page renderer when displaying book text.

---

## 1) Location & Cardinality
- **Path pattern:** `/circles/{circle-lower}/words.json`  
  Examples:
  - `/circles/acorn/words.json`
  - `/circles/leaf/words.json`
- **Count:** Exactly **one** per Circle.

## 2) Canonical Example (fully-populated)
```json
{
  "circle": "Leaf",
  "words": [
    {
      "word": "complicated",
      "audio": "./audio/leaf/complicated.mp3",
      "definition": "Consisting of many interconnecting parts; intricate."
    },
    {
      "word": "ceremony",
      "audio": "./audio/leaf/ceremony.mp3",
      "definition": "A formal event held on an important occasion."
    }
  ]
}
```

## 3) Field-by-Field Reference
### Top-level
- **`circle`** *(string, required)*  
  Human-readable Circle name this list belongs to (e.g., `"Leaf"`).

- **`words`** *(array\<object\>, required)*  
  List of vocabulary entries recognized by the highlighter.

### Each `words[]` object
- **`word`** *(string, required)*  
  The term to match within running text. **Matching is case-insensitive** and uses word boundaries; punctuation is ignored.  
  *Recommendation:* store as lowercase to avoid duplicates.

- **`audio`** *(string, required)*  
  Relative path to a short pronunciation audio file (MP3/WAV/OGG). Keep files trimmed and normalized for consistent volume.

- **`definition`** *(string, optional but recommended)*  
  Reader-friendly definition shown in tooltips/popovers (if enabled by the UI).

## 4) Matching Behavior (Important)
- Tokenization uses word boundaries similar to `/\b/` and strips surrounding punctuation.  
- Hyphenated or multi-word phrases are **not** supported in the current highlighter.
- Apostrophes within words (e.g., “fox’s”) may not match; add both base and possessive variants if needed.

## 5) Validation & Rules
- Do **not** include duplicate entries (case-insensitive). The first match is used.
- Audio paths should remain inside the project for easy hosting and caching.
- Keep entries appropriate to the Circle’s reading level.

## 6) Common Pitfalls
- Mismatching Circle folder and `circle` field (e.g., file placed under `/circles/leaf/` but `"circle": "Acorn"`). Keep them aligned.
- Very long audio or high bitrates increase page load times.

## 7) Extension Notes (Optional / Future)
- Additional fields like `partOfSpeech`, `syllables`, or `example` can be added later with UI support.
