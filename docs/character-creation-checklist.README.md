# Willowbrook Hollow — New Character Creation Checklist

**Goal:** A step‑by‑step, repeatable process for adding a brand‑new character to the Willowbrook Hollow ecosystem (assets, bios, docs, and app).  
**Audience:** Authors, illustrators, and developers.  
**Where to save this file:** `/docs/character-creation-checklist.README.md` in your repo.

---

## 0) Prep & Naming (ID Canon)
- [ ] Choose a **character ID** (lowercase, dashes allowed; ex: `oakley-owl`). Keep it permanent.
- [ ] Choose a **display name** (ex: `Oakley` or `Oakley Owl`).
- [ ] Decide any **permanent accessories** (these must appear in *every* depiction).
- [ ] Draft a one‑line **personality anchor** (the joke/gag that repeats).

**File/Path decisions**
- Master art files will live under:  
  - `images/characters/master/{id}_master.png`  
  - `images/characters/master/{id}_master.svg` *(optional but recommended)*
- Variants (seasonal outfits, props) will live under:  
  - `images/characters/variants/{id}/...`

> Tip: Permanent accessories must be documented up‑front so they never get “forgotten” later.

---

## 1) Character Bible Entry (Visual & Personality Canon)
- [ ] Add a **new section** to the Character Bible with species, colors, proportions, personality, speech style, quirks, example behaviors, and master asset paths.
- [ ] Explicitly list **permanent accessories** and **must‑keep proportions**.
- [ ] Add 1–2 **example behaviors** that artists/writers can reuse as running gags.
- [ ] Confirm the **master asset file paths** you decided in Step 0.
- [ ] Cross‑check names/traits against existing characters to avoid contradictions.

**Why:** The Character Bible is the single source of truth for visual + personality consistency. Artists and authors must reference it before creating art or text.

---

## 2) Create Master Image Assets (PNG / SVG)
- [ ] Produce a **clean master PNG** at export size appropriate for UI and printable media (suggest 2048–4096 px longest side).
- [ ] (Optional) Produce a **vector SVG** master for scale‑safe usage.
- [ ] Name files exactly: `{id}_master.png` and `{id}_master.svg`.
- [ ] Verify **color palette** and **proportion** match the Character Bible.
- [ ] Ensure the **permanent accessory** is present and correct.
- [ ] Export with transparent background when appropriate.
- [ ] Save to: `images/characters/master/`

**Recommended prompt notes (if using AI to draft art first):**
- Reference this exact phrase: “Use Willowbrook’s Character Bible for **{Display Name}**.”
- Include: species, color notes, silhouette/proportions, and permanent accessories.
- Keep lighting soft daylight; maintain consistent line weight; avoid style drift.
- Explicitly request **no changes** to canon colors/proportions/accessories.

---

## 3) Characters & Relationships Doc
- [ ] Add the character to **Characters & Relationship Mapping** with: short personality blurb, quirks, key dynamics with core cast, and both master asset paths (PNG/SVG).
- [ ] Note any **pair dynamics** (e.g., mischief buddy, mentor/mentee) used by storylines.
- [ ] Keep tone consistent with the Character Bible.

**Why:** Writers use this to keep relationship beats and cast pairings consistent across books.

---

## 4) Levelled Biographies (`/docs/character-bios.json`)
- [ ] Add a new entry keyed by `{id}` with:  
  - `name`: display name  
  - `levels`: `acorn`, `leaf`, `branch`, `oak`, `elder` *(required)*

**Grouped characters:** Use a single `{id}` (e.g., `parrot-family`) and a single bio entry; do **not** add extra JSON fields like `members` or `grouped` here.

- [ ] **Escalate complexity and length** by level:  
  - *Acorn:* very short, simple sentences.  
  - *Leaf/Branch:* more detail, cause/effect, some descriptive words.  
  - *Oak:* richer description; gentle figurative language.  
  - *Elder:* comprehensive; may be multi‑paragraph.
- [ ] Keep descriptions **canon‑true** to the Character Bible (traits, accessories).
- [ ] Validate the JSON against `/docs/character-bios.schema.json` (if present).

**Minimal example** (replace `oakley-owl` and text):
```json
{
  "oakley-owl": {
    "name": "Oakley Owl",
    "levels": {
      "acorn": "Oakley is an owl. He notices everything and blinks slowly.",
      "leaf": "Oakley watches from a branch and gives gentle hints others can follow.",
      "branch": "Quiet and steady, Oakley marks small changes—a bent reed, a new track—and shares them at the right moment.",
      "oak": "Oakley’s patience turns careful watching into guidance. He offers calm, specific advice that keeps the Hollow from rushing past clues.",
      "elder": "From dusk to dawn, Oakley studies patterns and listens for the softest sounds. He speaks when words can help most, saving stories for when they can teach. Friends lean toward Oakley because his quiet care makes hard choices clearer."
    }
  }
}
```

**Validation tip:** Run your JSON schema validator in pre‑commit/CI to ensure all five levels exist and are non‑empty.

---

## 5) App Integration (UI Hooks)
- [ ] **Splash grid / home cards**: add the new character’s **splash icon** asset to the grid and wire its click/tap to open the Biography view for `{id}`.
- [ ] **Biography screen**: ensure the level switcher (Acorn→Elder) renders the new entry from `character-bios.json` and handles multi‑paragraph Elder text.
- [ ] **Alt text**: provide concise accessibility text for splash/icon and master art.
- [ ] **Caching/CDN**: bump asset versions if your build uses hashed filenames.

> Note: You do **not** need to change `manifest.json` unless you are adding a new book. The manifest controls library circles & books, not characters.

---

## 6) Optional: Book & UI Assets
- [ ] If the new character appears in an existing/new book, update that book’s `book.json` (cast list, scenes/art references as needed).
- [ ] Create **variant art** (seasonal outfit, props) under `images/characters/variants/{id}/` and document any constraints (variants must not alter base proportions or colors).

---

## 7) QA & Consistency Checks
- [ ] Open a page that uses the **master PNG** alongside an established character to verify **scale** and **palette** harmony.
- [ ] Verify **speech style** and **voice** in bios match Character Bible notes.
- [ ] Confirm **permanent accessories** appear in all art and are named consistently in docs.
- [ ] Check that **Elder** bio is comprehensive but still on‑voice and kind in tone.
- [ ] Test biography rendering across **all five levels** in the app (including long Elder text wrapping).

---

## 8) Versioning & Changelog
- [ ] Commit all changed/added files with a single PR titled `feat(characters): add {Display Name} ({id})`.
- [ ] In the PR description, list: Character Bible section added, master asset paths, `character-bios.json` key added, UI hooks touched.
- [ ] Add a CHANGELOG entry under **Added**: “New character: {Display Name} ({id}).”

---

## 9) Deliverables Summary (must‑have files)
- [ ] `docs/character-creation-checklist.README.md` (this file)
- [ ] `docs/CHARACTER_BIBLE.md` (updated with new section)
- [ ] `docs/CHARACTERS_README.md` (updated relationships + asset paths)
- [ ] `docs/character-bios.json` (new leveled bios)
- [ ] `images/characters/master/{id}_master.png` (+ optional `{id}_master.svg`)
- [ ] `images/characters/variants/{id}/...` *(optional)*
- [ ] (If applicable) `books/**/book.json` updates where the character appears

---

## 10) Quick Copy Templates

**Character Bible (section skeleton):**
```
## {Display Name} — {Short Tagline}

- **Species:** {e.g., Barn Owl}
- **Fur/Feathers:** {key colors}; **Markings:** {notable markings}
- **Build/Silhouette:** {proportions, pose notes}
- **Eyes:** {color; expression notes}
- **Accessories:** {permanent items in **bold**}; {optional items}
- **Personality:** {1–2 sentences, on‑voice}
- **Speech:** {style cues; pacing; typical phrases}
- **Example Behaviors:** {3 bullet examples that recur for humor/teaching}
- **Master Assets:**
  - PNG: `images/characters/master/{id}_master.png`
  - SVG: `images/characters/master/{id}_master.svg`
```

**Characters & Relationships (entry skeleton):**
```
**{Display Name} — {Short role}**
- **Personality:** {1–2 lines; on‑voice}
- **Quirks:** {recurring gag or tell}
- **Dynamics:** {key pairings; mentorships}
- **Master Assets:**
  - PNG: `images/characters/master/{id}_master.png`
  - SVG: `images/characters/master/{id}_master.svg`
```

---

## 11) Final Pre‑Merge Gate
Before merge, confirm all boxes in sections 1–7 are checked and that the app loads the new character’s bio at each level without console errors. Keep this checklist in PR description for reviewer sign‑off.

# Assistant Interview & Production Playbook (New Character)

> **Purpose**: These are internal instructions for the assistant (me) to **interview the user**, collect every required detail, then **create all digital assets and documentation** for a brand‑new Willowbrook Hollow character—end to end.
>
> **Use when**: A new character is proposed or an existing one needs a major refresh (visual canon or leveled bios).

---

## A. Interview Objectives (what I must capture)
1) **Identity & Canon**: permanent ID, display name, personality anchor, accessories, growth arc.  
2) **Visual Spec**: species, palette, proportions/silhouette, eyes/expressions, permanent accessories, scale vs. core cast.  
3) **Voice**: speech style, phrases, tone boundaries.  
4) **Relationships**: dynamics with Moss, Tansy, Brindle, Wren, Echo, Puddle, Pip & Pebble, Zoe (and others).  
5) **Leveled Bios**: Acorn→Elder content, increasing length/complexity, on‑voice.  
6) **Assets**: master PNG/SVG, splash icon needs, variant art, alt text, file locations.  
7) **App Integration**: where it appears, hooks to biography view, book appearances.  
8) **Accessibility & Localization**: alt text, dyslexia-friendly constraints, future translation notes.  
9) **Legal & Licensing**: originality, third‑party references, stock or commissioned art.  
10) **Delivery & Approval**: deadlines, reviewers, acceptance criteria.

---

## B. Pre‑Interview Checks (assistant)
- Confirm target repo/branch and that I have sufficient info to write to `/docs` and `/images` paths.
- Confirm whether this is a **new** character, a **variant**, or a **major refresh**.
- Open the latest: `docs/CHARACTER_BIBLE.md`, `docs/CHARACTERS_README.md`, `docs/character-bios.json` to avoid collisions and keep tone consistent.

---

## C. Interview Script (ask in order; branch as needed)

### 1) Identity & Role
- What is the **permanent character ID** (lowercase, dashes allowed), e.g., `oakley-owl`?  
- What is the **display name**? (e.g., “Oakley Owl”)  
- Give me a **one‑sentence personality anchor** (recurring gag/quirk).  
- What **story role** does this character serve (mentor, mischief buddy, quiet observer, etc.)?  
- Any **growth arc** or lesson themes (especially for Oak/Elder bios)?  
- List **permanent accessories** that must appear in **every** depiction.

### 2) Visual Canon
- **Species** and notable **markings**?  
- **Color palette** (primary, secondary; hex if known).  
- **Silhouette / proportions** (relative height/width vs. Moss/Tansy).  
- **Eyes** (color, typical expression).  
- **Pose tendencies** (e.g., tip‑toe, curled tail, wings tucked).  
- **Scale reference**: next to Moss or Tansy, this character should look…
- Any **must‑avoid** visuals (no capes, no shoes, etc.)?

### 3) Voice & Personality
- Summarize **personality** in 2–3 sentences.  
- **Speech style** (short/quick, thoughtful/slow, witty/teasing, etc.).  
- Example **phrases** they might use; any **topics to avoid**.

### 4) Relationships
- What are key **pair dynamics** with: Moss, Tansy, Brindle, Wren, Echo, Puddle, Pip & Pebble, Zoe?  
- Any **recurring bit** with another character (e.g., Wren echoing rumors, Echo’s last‑minute save)?

### 5) Leveled Biographies (Acorn → Elder)
- Would you like to **provide** the five bios, or should I **draft** them for approval?  
- List **keywords/scenes** to include (especially for Elder).  
- Any **reading constraints** (max sentence length, words to include/avoid)?

### 6) Assets & Variants
- Do you want a **splash icon** for the home grid now?  
- Required **deliverables**: master PNG; optional master SVG; any **variant art** (seasonal props/outfits)?  
- **Background**: transparent or flat color?  
- **Alt text**: how should a screen reader describe the icon and master art?  
- Any **stock/commissioned** art references or **do‑not‑use** sources?

### 7) App & Books
- Should this character appear on the **home** splash grid at launch?  
- List any **books** (existing or planned) where this character appears.  
- Any **UI constraints** (click areas, priority order on grid)?

### 8) Accessibility, Localization, Legal
- Provide **alt text** for icon/master (or let me draft it).  
- Anticipated **translations/localizations**?  
- Confirm **rights**: All content is original or licensed for our use.

### 9) Logistics & Approval
- **Deadline** and release window?  
- **Approver(s)** to sign off on bios, visuals, and integration?  
- Anything else that would surprise future contributors?

---

## D. Intake Form (JSON I’ll fill during interview)

```json
{
  "id": "",
  "name": "",
  "role": "",
  "personality_anchor": "",
  "growth_arc": "",
  "species": "",
  "palette": { "primary": "", "secondary": "", "notes": "" },
  "silhouette": "",
  "eyes": "",
  "pose_tendencies": "",
  "permanent_accessories": [],
  "must_avoid_visuals": [],
  "relationships": {
    "moss": "",
    "tansy": "",
    "brindle": "",
    "wren": "",
    "echo": "",
    "puddle": "",
    "pip_pebble": "",
    "zoe": "",
    "others": ""
  },
  "bios": {
    "acorn": "",
    "leaf": "",
    "branch": "",
    "oak": "",
    "elder": ""
  },
  "assets": {
    "splash_icon": true,
    "variants": [],
    "background": "transparent"
  },
  "accessibility": {
    "alt_text_icon": "",
    "alt_text_master": ""
  },
  "app_integration": {
    "show_on_home": true,
    "books": []
  },
  "licensing": {
    "status": "original|licensed",
    "notes": ""
  },
  "approvals": {
    "bios": "",
    "visuals": "",
    "integration": ""
  },
  "deadline": ""
}
```

> Save this as `docs/_intake/character-{id}.json` (optional), or embed answers in the PR description.

---

## E. Production Steps (assistant‑only, after interview)

1) **Character Bible**
   - Add a new section to `docs/CHARACTER_BIBLE.md` with species, palette, silhouette, eyes, **permanent accessories**, personality, speech style, example behaviors, and **master asset paths**.
2) **Characters & Relationships**
   - Update `docs/CHARACTERS_README.md` with a concise role blurb, quirks, dynamics, and the master PNG/SVG paths.
3) **Leveled Bios**
   - Create/Update `docs/character-bios.json` with `{id}` → `name` + five `levels` (`acorn`, `leaf`, `branch`, `oak`, `elder`). Ensure length/complexity increases by level. Validate JSON.
4) **Master Images**
   - Generate **{id}_master.png** (2048–4096 px longest side) with transparent background; ensure **permanent accessories** present; optionally generate `{id}_master.svg`.
   - Place in `images/characters/master/`. Create `images/characters/variants/{id}/` if variants were requested.
5) **Alt Text**
   - Add concise alt text for icon and master image (store in the intake JSON and/or PR).
6) **App Integration**
   - Add splash icon to the home grid if requested, and wire click → biography view for `{id}`. Confirm long **Elder** bios render correctly.
7) **QA**
   - Visual compare scale/palette next to Moss/Tansy in UI. Confirm voice consistency in bios. Check JSON loads in all five levels.
8) **Versioning**
   - Open a PR titled: `feat(characters): add {name} ({id})` with a checklist of changed files and screenshots of master art and the five bios.
   - Add a CHANGELOG entry under **Added**: “New character: {name} ({id}).”

---

## F. Asset Generation Prompt (template)

**Goal**: single character master PNG with transparent background, canon‑accurate.

```
Willowbrook Hollow character master art.
Character: {name} ({id}). Species: {species}.
Permanent accessories: {permanent_accessories}. Keep accessories always visible and consistent.
Palette (stay in family): {palette.primary}, {palette.secondary}. Avoid neon or oversaturation.
Silhouette/proportions: {silhouette}. Size relative to Moss/Tansy: {scale_note}.
Eyes: {eyes}. Typical expression: {expression}.
Line weight and lighting consistent with existing Willowbrook masters. Soft daylight. No harsh shadows.
Full figure, centered, no background, transparent background, 4096px longest side.
Absolutely preserve canon colors, proportions, and accessories.
```

**Negative guardrails** (adapt as needed): “no background scene, no humans, no text, no logos, no style drift, no missing accessories, no extreme poses that hide accessories.”

---

## G. Definition of Done (DoD)
- `CHARACTER_BIBLE.md` and `CHARACTERS_README.md` updated and consistent.  
- `character-bios.json` updated with five quality bios (on‑voice, rising complexity).  
- `images/characters/master/{id}_master.png` (and optional SVG) exported, visually checked.  
- Splash icon (if requested) added and biography view wired without console errors.  
- Alt text provided for icon and master art.  
- CI/preview passes; PR has screenshots and intake JSON (or equivalent details).

---

## H. Rapid Re‑Ask (if the user is short on time)
If answers are limited, ask for only: **id, name, species, permanent accessories, one‑line personality**, and **permission to draft the five bios**. I will then propose everything else for approval.
