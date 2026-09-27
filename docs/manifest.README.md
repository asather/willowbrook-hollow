# `manifest.json` — The Library
**Audience:** developers and editors
**Purpose:** the single list of Circles and books. The Library menu, Circle unlocking and the "Keep reading" button all read it.
**Schema:** [`manifest.schema.json`](manifest.schema.json)

---

## 1) Location
Repo root: `manifest.json` (exactly one).

## 2) Example
```json
{
  "circles": ["Acorn", "Leaf", "Branch", "Oak", "Elder"],
  "books": [
    {
      "circle": "Acorn",
      "bookId": "acorn-001",
      "title": "The Monster in the Barn",
      "subtitle": "Something is squeaking in the barn…",
      "path": "./books/acorn-001/book.json",
      "circleIcon": "images/ui/circles/circle-acorn.png"
    }
  ]
}
```

## 3) Field reference
- **`circles`** *(required)*: Circle names in reading order. Each needs a `circles/{name-lower}/words.json`.
- **`books[]`** *(required)*: in reading order within each Circle.
  - `circle`: must match an entry in `circles`.
  - `bookId`: `{circle-lower}-{NNN}`; permanent, because saved progress is keyed by it.
  - `title`, `subtitle`: shown in the Library.
  - `path`: the book's `book.json`.
  - `circleIcon`: the official emblem for the Circle.
  - `ceremony` *(optional)*: `true` on the Circle's last book. Finishing it (all pages plus the quiz) plays the Circle Ceremony and unlocks the next Circle.

## 4) Rules
- Every `books[].circle` matches a `circles` entry exactly.
- Every `path` exists (the checker verifies this).
- At most one `ceremony` book per Circle, and it is that Circle's last book.
