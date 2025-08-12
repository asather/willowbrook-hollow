# `manifest.json` — Global Library Manifest
**Audience:** Developers and content editors new to Willowbrook Hollow  
**Purpose:** The single source of truth for what Circles exist and which books are available.  
**Used by:** Home screen menu (hamburger) and book loader.

---

## 1) Location & Cardinality
- **Path:** Project root: `/manifest.json`
- **Count:** Exactly **one** per deployment.

## 2) What It Controls
- The **ordered list** of Circles shown in the menu.
- The **list of books** for each Circle and where to fetch their `book.json` files.
- Display metadata (title, subtitle) and the Circle emblem path for UI chips.

## 3) Canonical Example (fully-populated)
```json
{
  "circles": ["Acorn", "Leaf", "Branch", "Oak", "Elder"],
  "books": [
    {
      "circle": "Leaf",
      "bookId": "leaf-001",
      "title": "Lorem Leaf Adventures",
      "subtitle": "A totally fake book for testing",
      "path": "./books/leaf-001/book.json",
      "circleIcon": "images/ui/circles/circle-leaf.png"
    }
  ]
}
```

## 4) Field-by-Field Reference
### Top-level
- **`circles`** *(array\<string\>, required)*  
  Ordered names of Circles as they should appear. The app builds the menu using this order.

- **`books`** *(array\<object\>, required)*  
  Each entry tells the app how to display and load a book.

### Each `books[]` object
- **`circle`** *(string, required)*  
  The Circle this book belongs to. **Must match** one of the strings in `circles`.

- **`bookId`** *(string, required)*  
  Unique identifier for this book (recommended pattern: `{circle-lower}-{###}`, e.g., `leaf-001`).

- **`title`** *(string, required)*  
  Display title used in menus and the book header.

- **`subtitle`** *(string, optional)*  
  Short descriptive line shown beneath the title in the menu.

- **`path`** *(string, required)*  
  Relative URL to the book’s `book.json`. Must be resolvable from the site root at runtime.

- **`circleIcon`** *(string, required)*  
  Path to the Circle emblem asset used in UI. Use official assets under `/images/ui/circles/`.

## 5) Validation & Rules
- Every `books[].circle` **must** match a `circles` item exactly (case-sensitive).
- Keep `circles` ordered by intended reading progression.
- Use **forward slashes** in paths (web-safe), even on Windows.
- Prefer stable, lowercase `bookId`s; treat them as permanent.

## 6) Common Pitfalls
- Opening the app with `file://` (local file) breaks `fetch()` for JSON. Serve via `http://localhost`.
- Typos in `path` will fail silently until the network request occurs. Test each link.

## 7) Extension Notes (Optional / Future)
- Additional fields like `author`, `illustrator`, or `order` can be added later but will require UI updates.
```

