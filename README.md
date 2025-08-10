# Willowbrook Hollow – Project Repository

## Summary
**Willowbrook Hollow** is a story series designed to grow with the reader’s abilities.  
It blends humor, heart, and adventure in a hidden animal community beside the Willowbrook Animal Sanctuary.  
The series uses an in-story ranking tradition, the **Circles**, which also serve as reading milestones in real life.  

Each Circle gradually increases reading complexity while rewarding progress with **Circle Ceremonies** and collectible badges.  
Books are published as static HTML stories, with illustrations, quizzes, and built-in accessibility features.

---

## Documentation
All detailed planning and reference files live in the [`/docs`](docs) folder:

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) – Big-picture summary, story premise, technical approach, and asset rules.
- [`CIRCLES_README.md`](docs/CIRCLES_README.md) – Complete guide to the Circle system, including reading-level metrics and word count ranges.
- [`CHARACTERS_README.md`](docs/CHARACTERS_README.md) – Quick-reference personalities, quirks, relationships, and master asset file paths.
- [`CHARACTER_BIBLE.md`](docs/CHARACTER_BIBLE.md) – Comprehensive character details for writers and illustrators, with visual specifications and official asset references.

---

## Repository Structure

```
/books/                # One folder per book, organized by Circle (e.g., acorn-01, leaf-02)
/css/                  # Shared stylesheets (dyslexia-friendly font, high contrast mode, reduced motion)
/js/                   # Shared scripts for quiz engine, progress tracker, UI interactions
/images/
    /characters/
        /master/       # Official character master PNG and SVG files
        /variants/     # Approved seasonal or scene-specific variations
    /ui/circles/       # Official Circle symbol icons (PNG and SVG)
    /ui/               # General UI assets (buttons, badges, overlays)
    /illustrations/    # Story-specific illustrations and backgrounds
/docs/                 # Project documentation (all README.md files)
/audio/                # Optional narration or sound effect files (future expansion)
/fonts/                # Licensed or approved typefaces for in-story and UI use
/tests/                # Automated tests for quiz logic, progress tracking, and accessibility checks
```

---

## Development Notes

**Technology Stack:**
- Static HTML for each story (`/books`).
- Shared CSS and JavaScript across all books for consistency.
- Quizzes include multiple choice, order-the-story, and image hotspot types.
- Progress tracked in `localStorage` to maintain Circle advancement.

**Accessibility Goals:**
- Touch-friendly interface
- Dyslexia-friendly font option
- High contrast mode
- Reduced motion option for sensitive readers

**Asset Rules:**
- All **character masters** and **Circle symbols** must use official files from `/images/characters/master/` and `/images/ui/circles/`.
- No unapproved alterations to proportions, colors, or permanent accessories.
- Variants must be saved in the `/variants/` subfolder and approved before use.
