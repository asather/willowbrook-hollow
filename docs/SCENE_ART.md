# Willowbrook Hollow — Scene Art

**Goal:** every book ships with its own illustrated cover and a scene on every page, made by whoever writes the book (human or assistant) as part of the same job.
**Tool:** `python3 tools/compose-scenes.py books/{bookId}` (needs Pillow).
**Source:** `books/{bookId}/scenes.json`. **Output:** `books/{bookId}/images/{scene}.webp` (1600×900, 16:9 WebP).

---

## 1) How a scene is made
A scene is drawn in layers, back to front:

1. **Backdrop**, painted by the tool: sky (morning, day or dusk), rolling hills, trees in fall colors, the stream, rocks, the barn, the inside of the barn, logs and so on.
2. **Props** the page talks about, also painted by the tool: Tansy's map, the raft, acorns, the viola and its case, music notes, a fish, a moth.
3. **Characters**, always the canon art from `images/web/characters/`, scaled, placed, flipped or tilted to act out the page. Art with a plain background is cut out automatically. Figures that share one picture (Pip and Pebble) are cut apart, as listed in `SHEET_FIGURES` in the tool.
4. **The Circle emblem**, small and faint in the background (carved on a stump, on a trunk, on the barn). The tool refuses to render a scene without one. It is never called out in the text.

Because characters come from their web copies, they always match the Character Bible (colors, proportions, permanent accessories). Never redraw a character in a scene.

## 2) What each page's scene should show
- The **main beat of the page**: who is there, where they are, and the one action or joke the text is about (the dirt landing on Moss, the fish jumping, the acorns bonking).
- **Only characters who are on that page**, in the right place and facing the right way, at believable sizes (mice smallest, Zoe tallest).
- The page's alt text describes the scene in one sentence.
- Keep the busiest part of the picture away from the edges; the app may crop slightly on narrow screens.

## 3) `scenes.json` format
```json
{
  "size": [1600, 900],
  "scenes": {
    "cover":   { "elements": [ … ] },
    "page-01": { "elements": [
      { "type": "sky", "time": "morning", "sun": [1380, 150] },
      { "type": "hills", "y": 610 },
      { "type": "tansy_tree", "x": 1240, "y": 700 },
      { "type": "character", "id": "tansy", "x": 820, "y": 840, "h": 320 },
      { "type": "character", "id": "moss", "x": 1060, "y": 870, "h": 270, "flip": true },
      { "type": "emblem", "x": 520, "y": 735 }
    ] }
  }
}
```
- Scene names are file names: `cover` and `page-01`, `page-02`… Each page's `media` in `book.json` points to `books/{bookId}/images/page-NN.webp`, and the book's `cover.image` to `books/{bookId}/images/cover.webp`.
- Positions are in the 1600×900 picture. For a character, `x` is the centre and `y` is where its feet touch the ground; `h` is its height.
- Elements are drawn in list order, so list the backdrop first and the characters last.
- Build one scene while you adjust it: `python3 tools/compose-scenes.py books/{bookId} --only page-07`.

### Elements
| Type | Fields | Draws |
|---|---|---|
| `sky` | `time` (`morning`, `day`, `dusk`), `sun` [x, y] | Sky gradient and sun |
| `hills` | `y`, `seed` | Two rolling hills with grass tufts |
| `tree` | `x`, `y` (ground), `h`, `w`, `seed` | A fall tree |
| `tansy_tree` | `x`, `y`, `h`, `w` | Tansy's big home tree, with its hole and bump |
| `stump`, `gate`, `bush`, `rock` | `x`, `y`, `w` or `r` | Hollow landmarks |
| `stream` | `y`, `w`, `tilt`, `rocks` [x…], `ripples` | The stream across the picture |
| `frog_rock` | `x`, `y`, `w` | The rock that looks like a frog |
| `log` | `x`, `y`, `w`, `h`, `sunspot` | A hollow log, open end facing us |
| `log_inside` | — | Looking down the inside of the log toward the sun |
| `barn` | `x`, `y`, `w`, `door` (`shut`, `open`, `ajar`) | The sanctuary barn |
| `barn_inside` | `dim`, `hay` [x…], `window` | Inside the barn |
| `map` | `x`, `y`, `w`, `rot`, `upside`, `arrow` | Tansy's bark map |
| `raft`, `case`, `viola` | `x`, `y`, `w` or `s`, `rot`, (`open`) | Props |
| `acorns` | `x`, `y`, `n`, `spread`, `ys`, `r` | A scatter or shower of acorns |
| `moss_ball` | `x`, `y`, `r`, `peek`, `acorns`, `motion` | Moss rolled up (peeking, covered in acorns, rolling) |
| `fish`, `splash`, `moth`, `dirt`, `hole` | `x`, `y`, size | Small story details |
| `prints` | `x`, `y`, `dx`, `dy`, `n`, `s` | A trail of paw prints |
| `reeds`, `stick` | `x`, `y`, `h` / `x1`, `y1`, `x2`, `y2` | Reeds at the water, a poking stick |
| `notes`, `glow`, `zzz`, `stars`, `falling_leaves` | see the tool | Music, Leo's wish-ball glow, sleeping, night sky, leaves |
| `motion` | `x`, `y`, `s`, `kind` (`hop`, `bonk`, `huff`, `spin`) | Cartoon action lines |
| `character` | `id`, `x`, `y`, `h`, `flip`, `rot`, `dim`, `noShadow` | A character from `images/web/characters/` (`pip` and `pebble` separately) |
| `emblem` | `x`, `y`, `s`, `opacity` | The book's Circle symbol (required) |

A story that needs a new place or prop gets a new element: add an `el_{type}` function to `tools/compose-scenes.py` and a row to this table.

## 4) Painted illustrations
If an illustrator (or an image model) paints a scene, save it as WebP at the same path (for example `books/{bookId}/images/page-07.webp`) and remove that scene from `scenes.json` so the tool doesn't overwrite it. The `acorn-001` cover is made this way. The same rules apply: canon-true characters, the Circle emblem in the background, 16:9 WebP, stored as a regular Git file (never LFS).

## 5) Checks
`node tools/check-book.mjs --all` fails a book whose cover or any page isn't using the book's own art in `books/{bookId}/images/`, whose `scenes.json` is missing, or whose images are missing or LFS pointers. Then look at every scene yourself, at full size, before publishing: right characters, right action, nothing covering a face, and the emblem present but quiet.
