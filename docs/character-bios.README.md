# `character-bios.json` — Levelled Character Biographies (One file for all characters)
**Audience:** Editors and developers  
**Purpose:** Stores each character’s biography at five reading levels (Acorn → Elder). The UI shows these in the Biography view when a character tile is tapped on the home screen.

---

## 1) Location & Cardinality
- **Path:** `/docs/character-bios.json`
- **Count:** Exactly **one** per deployment.

## 2) How the app uses it
- The home screen’s **Biography view** loads this file once and renders tabs: Acorn, Leaf, Branch, Oak, Elder.
- Text complexity and length should **increase by level**. Elder bios can be a fuller, multi-sentence (or multi-paragraph) treatment.

## 3) Canonical example
```json
{
  "moss": {
    "name": "Moss",
    "levels": {
      "acorn":  "Moss is a hedgehog. He is shy but brave.",
      "leaf":   "Moss watches closely and notices small clues.",
      "branch": "Observant and steady, Moss often spots what others miss...",
      "oak":    "Moss has learned to turn quiet into strength...",
      "elder":  "Moss’s courage looks small at first glance: a careful question..."
    }
  }
}
