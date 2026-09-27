# `character-bios.json` — Levelled Character Biographies

**Purpose**  
Holds each character’s biography at five reading levels (Acorn → Elder).  
The app loads this file once and shows the selected level in the Biography view.

**Location**  
`/docs/character-bios.json` (exactly **one** file per site/repo)

---

## Data shape (field reference)

- Top-level: an **object** keyed by **character IDs**  
  (e.g., `moss`, `tansy`, `brindle`, `wren`, `echo`, `puddle`, `pip-pebble`, `zoe`).

- Each character entry:
  - `name` *(string, required)* — Display name.
  - `levels` *(object, required)* — Must contain:
    - `acorn` *(string)*
    - `leaf` *(string)*
    - `branch` *(string)*
    - `oak` *(string)*
    - `elder` *(string)*

**Notes**
- Text should **grow in length and sophistication** by level.  
- Elder can be comprehensive and multi-paragraph (use blank lines between paragraphs).

---

## Minimal example

<details><summary>Show JSON</summary>

```json
{
  "moss": {
    "name": "Moss",
    "levels": {
      "acorn": "Moss is a hedgehog. He is shy but brave.",
      "leaf": "Moss watches closely and notices small clues.",
      "branch": "Observant and steady, Moss often spots what others miss.",
      "oak": "Moss has learned to turn quiet into strength.",
      "elder": "Moss’s small, careful choices add up to real leadership."
    }
  }
}
```
</details>

---

## Style & canon guidelines

- Keep character traits/accessories consistent with the Character Bible.  
  (e.g., Brindle’s green bandana; Echo’s forest-green satchel.)
- Each level's text follows that **Circle's word rules** (`circles/{circle}/words.json`): syllable limit, spelling patterns, and maximum sentence length. Names, heart words and story words are always allowed.
  - **Acorn**: shortest and simplest (words up to 2 syllables, sentences of 12 words or fewer).
  - **Leaf / Branch**: add detail, cause and effect, and feeling words.
  - **Oak**: richer description; gentle figurative language.
  - **Elder**: comprehensive; may be multi-paragraph (blank line between paragraphs).
- `node tools/check-book.mjs --all` checks every bio at every level.

**Grouped Characters:** Families/duos still use a single `{id}` and a single `name` + `levels` block. Keep extra metadata (e.g., member names, accessories) in the Character Bible / Characters README, not in this JSON.

---

## Validation

A JSON Schema is provided:

- Path: `/docs/character-bios.schema.json`
- Use any schema validator in pre-commit or CI to ensure:
  - required keys exist,
  - no extra properties,
  - non-empty strings.

<details><summary>Schema (for reference)</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Willowbrook Character Bios",
  "type": "object",
  "additionalProperties": false,
  "patternProperties": {
    "^[a-z0-9-]+$": {
      "type": "object",
      "required": ["name", "levels"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "levels": {
          "type": "object",
          "required": ["acorn","leaf","branch","oak","elder"],
          "additionalProperties": false,
          "properties": {
            "acorn":  { "type": "string", "minLength": 1 },
            "leaf":   { "type": "string", "minLength": 1 },
            "branch": { "type": "string", "minLength": 1 },
            "oak":    { "type": "string", "minLength": 1 },
            "elder":  { "type": "string", "minLength": 1 }
          }
        }
      }
    }
  }
}
```
</details>

---

## Editing tips

- Wrap lines naturally; avoid single very long lines inside code blocks.
- For Elder, separate paragraphs with a blank line:
  ```
  First paragraph.

  Second paragraph.
  ```
- If hosting on a custom docs site, enable code wrapping with CSS:
  ```css
  pre code { white-space: pre-wrap; word-break: break-word; }
  ```
