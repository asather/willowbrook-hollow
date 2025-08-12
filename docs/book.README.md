# `book.json` — Book-Specific Content (One per Book)
**Audience:** Authors, editors, illustrators, and developers  
**Purpose:** Defines everything needed to render a **single book**: title page, table of contents, chapters/pages, artwork placement, interactivity, and the built‑in quiz.  
**Used by:** Book viewer.

---

## 1) Location & Cardinality
- **Path pattern:** `/books/{circle-lower}-{NNN}/book.json`  
  Example: `/books/leaf-001/book.json`
- **Count:** Exactly **one** per book.

## 2) Canonical Example (fully-populated)
```json
{
  "circle": "Leaf",
  "circleIcon": "images/ui/circles/circle-leaf.png",
  "bookId": "leaf-001",
  "title": "Lorem Leaf Adventures",
  "subtitle": "A totally fake book for testing",
  "cover": {
    "image": "./images/cover.png",
    "alt": "Cover art of characters"
  },
  "toc": [
    { "type": "title",   "label": "Title Page" },
    { "type": "chapter", "label": "Chapter 1: The Squirrel Plan", "anchor": "ch1" },
    { "type": "chapter", "label": "Chapter 2: Ducks & Distractions", "anchor": "ch2" },
    { "type": "chapter", "label": "Chapter 3: A Leafy Finish", "anchor": "ch3" }
  ],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter 1: The Squirrel Plan",
      "pages": [
        {
          "number": 1,
          "layout": "art-left",
          "text": [
            "Tansy unveils a complicated plan with ten steps.",
            "Moss observes quietly; Brindle nods wisely."
          ],
          "media": [
            {
              "type": "image",
              "src": "images/characters/master/tansy_master.png",
              "alt": "Tansy the squirrel",
              "placement": "art-left",
              "animation": { "kind": "float", "trigger": "tap" }
            }
          ],
          "interactivity": [
            {
              "kind": "hotspot",
              "x": 25,
              "y": 50,
              "onTap": { "action": "toggleAnimation", "targetMediaIndex": 0 }
            }
          ]
        }
      ]
    }
  ],
  "quiz": {
    "instructions": "Tap the answer. Characters will react!",
    "questions": [
      {
        "id": "q1",
        "type": "mcq",
        "prompt": "Which friend makes plans with too many steps?",
        "choices": ["Moss", "Tansy", "Brindle"],
        "answerIndex": 1,
        "reactions": {
          "correct":   { "character": "images/characters/master/wren_master.png", "line": "Correct!" },
          "incorrect": { "character": "images/characters/master/echo_master.png", "line": "Not quite." }
        }
      }
    ]
  }
}
```

## 3) Field-by-Field Reference
### Top-level
- **`circle`** *(string, required)* — Circle this book belongs to (e.g., `"Leaf"`).  
- **`circleIcon`** *(string, required)* — Path to the official Circle emblem used in UI.  
- **`bookId`** *(string, required)* — Unique identifier (e.g., `"leaf-001"`).  
- **`title`** *(string, required)* — Book title.  
- **`subtitle`** *(string, optional)* — Secondary line for display.  
- **`cover`** *(object, required)* — Cover art metadata.  
- **`toc`** *(array\<object\>, required)* — Items for the Chapters modal (Table of Contents).  
- **`chapters`** *(array\<object\>, required)* — Chapter definitions.  
- **`quiz`** *(object, required)* — Quiz configuration (multiple choice supported).

### `cover` object
- **`image`** *(string, required)* — Relative path to cover art (usually under the book folder).  
- **`alt`** *(string, required)* — Accessible description for screen readers.

### `toc[]` item
- **`type`** *(string, required)* — `"title"` or `"chapter"`.  
- **`label`** *(string, required)* — Display text in the Chapters modal.  
- **`anchor`** *(string, required iff `type` = `"chapter"`)* — Must equal a `chapters[].id` for navigation.

### `chapters[]` object
- **`id`** *(string, required)* — Anchor target used by `toc.anchor`.  
- **`title`** *(string, required)* — Chapter title displayed above page text.  
- **`pages`** *(array\<object\>, required)* — The pages within this chapter.

### `pages[]` object
- **`number`** *(integer ≥ 0, required)* — Visual page number shown in the footer and used in progress UI. Unique within the book.  
- **`layout`** *(string, required)* — One of: `"art-left"`, `"art-right"`, `"art-full"`. Controls composition of art/text columns.  
- **`text`** *(array\<string\>, required)* — One or more paragraphs. Vocabulary highlights are auto-applied from the Circle’s `words.json`.  
- **`media`** *(array\<object\>, optional)* — Artwork/media items to render.  
- **`interactivity`** *(array\<object\>, optional)* — Interactive hotspots, tied to media by index.

### `media[]` object
- **`type`** *(string, required)* — `"image"` (currently supported). `"audio"` reserved for future use.  
- **`src`** *(string, required)* — Relative path to the asset.  
- **`alt`** *(string, required when `type` = `"image"`)* — Accessibility alt text.  
- **`placement`** *(string, optional)* — `"art-left"`, `"art-right"`, or `"art-full"`. Defaults to page `layout` if omitted.  
- **`animation`** *(object, optional)* — Visual motion configuration.  
  - **`kind`** *(string, required)* — `"pulse"`, `"float"`, or `"spin"`.  
  - **`trigger`** *(string, required)* — `"tap"` or `"auto"`.

### `interactivity[]` object
- **`kind`** *(string, required)* — `"hotspot"`.  
- **`x`** *(number 0–100, required)* — X position in **percent** of the artwork container.  
- **`y`** *(number 0–100, required)* — Y position in **percent** of the artwork container.  
- **`onTap`** *(object, required)* — Action mapping when the hotspot is tapped/clicked.  
  - **`action`** *(string, required)* — `"toggleAnimation"`.  
  - **`targetMediaIndex`** *(integer ≥ 0, required)* — Index into the page’s `media` array.

### `quiz` object
- **`instructions`** *(string, required)* — Helper text shown before the first question.  
- **`questions`** *(array\<object\>, required)* — One or more questions.

### `questions[]` object (MCQ)
- **`id`** *(string, required)* — Unique within the book.  
- **`type`** *(string, required)* — Must be `"mcq"`.  
- **`prompt`** *(string, required)* — The question text.  
- **`choices`** *(array\<string\> ≥ 2, required)* — Answer options.  
- **`answerIndex`** *(integer ≥ 0, required)* — Index into `choices` of the correct answer.  
- **`reactions`** *(object, required)* — Character feedback after selection.  
  - **`correct`** *(object, required)* — Shown when the user is right.  
    - **`character`** *(string, required)* — Path to character image.  
    - **`line`** *(string, required)* — Short reaction text.  
  - **`incorrect`** *(object, required)* — Shown when the user is wrong.  
    - **`character`** *(string, required)* — Path to character image.  
    - **`line`** *(string, required)* — Short reaction text.

## 4) Validation & Rules
- `toc.anchor` values **must** exist as `chapters[].id`.  
- `pages[].number` should increase monotonically across the book (no duplicates).  
- `interactivity[].targetMediaIndex` must be a valid index of `media`.  
- Use alt text for all images for accessibility.  
- Vocabulary pronunciation is **not** defined here; it comes from the Circle’s `words.json`.

## 5) Common Pitfalls
- Asset paths using backslashes (`\`) on Windows: always use `/`.  
- Missing/typoed anchors lead to “Chapters” links that don’t navigate.  
- Hotspot coordinates outside 0–100 will be clipped and may become unclickable.

## 6) Extension Notes (Optional / Future)
- Additional layouts (e.g., `"text-only"`), media types, or question types can be added with corresponding UI work.
