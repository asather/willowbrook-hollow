# Willowbrook Hollow – Project Overview

## Project Goal
To write **skill-appropriate, engaging books** that grow with the reader and foster a love for reading.  
The series uses an **achievement system called “Circles”**—both an in-story tradition for the animals and a real-world reading milestone system.  
Each Circle is:
- An **in-story rank** for characters in Willowbrook Hollow.
- A **reading level** that gradually increases in complexity without sudden jumps.
- A **reward system** with badges, “Circle Ceremonies,” and unlockable stories.

Our aim: to make reading progress feel **fun, motivating, and meaningful** so the reader wants to keep going.

---

## Story Premise
**Willowbrook Hollow** is a hidden community of animals living in the woods, meadows, and streams behind the Willowbrook Animal Sanctuary.  
They can speak to one another across species—but humans cannot understand them.

When a new animal arrives at the sanctuary, the Hollow’s residents secretly help it adapt, heal, and find where it belongs—whether that’s back in the wild, in a forever home, or within the Hollow itself.  

The series blends:
- **Humor** – running gags, physical comedy, and misunderstandings.
- **Heart** – gentle lessons on empathy, friendship, and teamwork.
- **Adventure** – from tiny mishaps to larger challenges that require the whole Hollow.

The human world, represented by **Zoe** the young helper, is ever-present but seen only through the animals’ eyes.

---

## Reading Circles

Each Circle matches an in-story role with a subtle increase in reading challenge.

| Circle | In-Story Role | Reading Complexity | Ceremony Gift |
|--------|---------------|--------------------|---------------|
| **Acorn** | Newcomers to the Hollow | Short sentences (5–8 words), basic vocabulary, high illustrations | Green leaf charm |
| **Leaf** | Helpers | Slightly longer sentences, richer vocab, main plot + small gag subplot | Carved twig token |
| **Branch** | Junior Rescuers | Adds feeling words, main + subplot that connect, short paragraphs | Carved acorn pendant |
| **Oak** | Hollow Mentors | Mild figurative language, richer descriptions, parallel threads | Oaklight ceremony with carved pendant |
| **Elder** | Rare/Respected | Gradual, ongoing increases; multi-book arcs, deeper themes | Carved staff or cane |

**Symbols** – Each Circle has an official emblem (acorn, leaf, branch, oak, elder tree) that appears playfully in illustrations for that Circle’s books.

---

## Core Characters

- **Moss** – Bashful Hedgehog  
  Shy but brave; rolls into a ball when startled (often at the wrong moment).

- **Tansy** – Overexcited Squirrel  
  Chaotic “idea expert” with overly complicated plans; distractible.

- **Brindle** – Kindly Old Dog  
  Calm, wise mentor; patient and respected.

- **Wren** – Gossiping Songbird  
  Chatty, repeats overheard human phrases out of context.

- **Echo** – Mischievous Fox  
  Clever trickster; secretly helpful; carries a **forest-green satchel**.

- **Puddle** – Distracted Duck  
  Accidentally solves problems while wandering.

- **Pip & Pebble** – Argumentative Mouse Twins  
  Bicker constantly; resourceful when they cooperate.

- **Zoe** – Human Helper (minor recurring)  
  Caring, slightly mismatched but stylish outfits; **always wears pants under dresses**; observed more than interacted with.

---

## Humor & Style

**Running gags:**
- Moss rolling away at inconvenient times.
- Tansy’s over-complicated plans.
- Wren’s misquotes.
- Puddle’s oblivious comments.

**Style progression:**
- **Acorn/Leaf:** High illustration ratio (50–70% page space), short sentences.
- **Branch:** Moderate illustration ratio (30–40%), parallel subplots.
- **Oak/Elder:** Lower illustration ratio (20–30%), richer descriptive passages.

Humor is always light-hearted and never mean-spirited.  
Solutions often create bigger problems before they work out.

---

## Technical Approach

**Format:** Static HTML for each book, paired with a built-in quiz.  
**Architecture:**
```
/books/{circle}-{book#}/index.html   # story + quiz
/css/                                # shared styles
/js/                                 # quiz engine, progress tracker, effects
/images/                             # character masters, Circle icons, UI
```

**Quizzes:**
- Multiple choice (text/image)
- Order-the-story
- Picture hotspot
- Playful feedback from characters
- Badge + “Circle Ceremony” page on success

**Progress tracking:**  
Stored in `localStorage` so the reader’s Circle advancement is remembered.

**Accessibility & UX:**
- Touch-friendly
- Dyslexia-friendly font option
- High-contrast mode
- Reduced-motion support

---

## Asset Rules

**Master Character Images:**  
- Stored in `/images/characters/master/` as `*_master.png` and `*_master.svg`
- Must match the **Character Bible** exactly
- No unapproved changes to proportions, colors, or permanent accessories

**Circle Symbols:**  
- Stored in `/images/ui/circles/` as `circle-{name}.png` and `.svg`
- Always use the official files—never regenerate variants
