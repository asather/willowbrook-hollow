# Willowbrook Hollow – Project Overview

## Project Goal
Willowbrook Hollow is a series of **funny, warm stories that a growing reader can actually read on their own**. It is written for readers whose ideas and humor are ahead of their decoding: an 8–10-year-old who laughs at a 4th-grade joke but is still building reading fluency.

Three commitments shape every book:
1. **Written for the reader's age, decodable at the reader's level.** Plots, jokes and stakes are pitched at 8–10-year-olds; the words follow the Circle's decoding rules.
2. **Fluency through repeated, supported reading.** The reader app reads pages aloud with word highlighting, splits any word into syllables on tap, and makes re-reading a chapter a game against the reader's own best.
3. **Progress that feels like belonging.** The Circles are both the Hollow's ranks and the reader's levels. Finishing books earns badges and Circle Ceremonies, and every reward is for effort and finishing, never for speed or scores.

---

## Story Premise
**Willowbrook Hollow** is a hidden community of animals living in the woods, meadows and streams behind the Willowbrook Animal Sanctuary. Landmarks include the big oak, the stream and the frog rock, the parrots' gold tree and, at the far end of the Hollow, the old willow, whose long branches hang down like a curtain around a hushed, secret room. They can speak to one another across species, but humans cannot understand them.

When something new or strange happens at the sanctuary (a new animal arrives, a mysterious sound starts, a human brings something the animals have never seen), the Hollow's residents investigate, help each other, and usually make it funnier on the way.

The series blends:
- **Humor**: running gags, physical comedy and misunderstandings (especially of human things).
- **Heart**: empathy, friendship, courage and the value of practice.
- **Adventure**: from tiny mishaps to challenges that need the whole Hollow.

The human world, represented by **Zoe** the young helper, is ever-present but seen only through the animals' eyes. To them she is "the giant."

---

## Reading Circles
Each Circle is an in-story rank and a reading level. Full rules are in [`CIRCLES_README.md`](CIRCLES_README.md).

| Circle | In-story role | Words the reader decodes | Book length | Ceremony gift |
|---|---|---|---|---|
| **Acorn** | Newcomers to the Hollow | Up to 2 syllables; closed, open, magic-e, vowel team and r-controlled syllables | 1,000–2,000 words | Green leaf charm |
| **Leaf** | Helpers | Up to 3 syllables; adds consonant-le, soft c/g, igh, silent letters, -tion | 2,000–4,000 | Carved twig token |
| **Branch** | Junior Rescuers | Up to 4 syllables; adds ough/augh, Latin suffixes | 4,000–7,000 | Carved acorn pendant |
| **Oak** | Hollow Mentors | Up to 5 syllables; roots, mild figurative language | 7,000–12,000 | Oaklight ceremony with carved pendant |
| **Elder** | Rare / Respected | No limit; multi-book arcs | 12,000–20,000 | Carved staff or cane |

**Symbols**: each Circle has an official emblem (acorn, leaf, branch, oak, elder tree) that appears playfully in the illustrations for that Circle's books.

---

## Core Characters

- **Moss** – Bashful Hedgehog
  Shy but brave; rolls into a ball when startled (often at the wrong moment).
- **Tansy** – Overexcited Squirrel
  Chaotic "idea expert" with overly complicated plans; distractible.
- **Brindle** – Kindly Old Dog
  Calm, wise mentor; patient and respected; may doze mid-story.
- **Wren** – Gossiping Songbird
  Chatty; repeats overheard human phrases out of context.
- **Echo** – Mischievous Fox
  Clever trickster; secretly helpful; carries a **forest-green satchel**.
- **Puddle** – Distracted Duck
  Accidentally solves problems while wandering.
- **Pip & Pebble** – Argumentative Mouse Twins
  Bicker constantly; resourceful when they cooperate.
- **Leo** – Playful, Kind-Hearted Vegetarian Lion
  Gold fur, fluffy mane; eats grass. Carries a wish ball that glows blue when wishes are about to come true.
- **Parrot Family** – News-bringers who live in a secret gold tree with a shrinking door
  Kind and adventurous; they speak in rhymes and repeat each other's sentences. June (mom) is gently overprotective of baby Juneafur, who carries a bubble-blower and sometimes says funny mixed-up words. Johnafur (dad) travels and gathers stories from beyond the Hollow.
- **Zoe** – Human Helper (minor recurring)
  Caring; slightly mismatched but stylish outfits; **always wears pants under dresses**; learning to play the viola. Observed more than interacted with.

Full details: [`CHARACTER_BIBLE.md`](CHARACTER_BIBLE.md) and [`CHARACTERS_README.md`](CHARACTERS_README.md).

---

## Humor & Style

**Running gags:**
- Moss rolling into a ball, and sometimes rolling away, at inconvenient times.
- Tansy's over-complicated plans (she forgets the middle steps).
- Wren's misheard and misquoted "news."
- Puddle solving things by accident.
- Echo helping in secret, then denying it.
- Leo's rock joke, which he never stops telling.

**Style rules at every Circle:**
- Humor is light-hearted and never mean-spirited. Solutions often create bigger problems before they work out.
- Short, punchy lines carry the jokes. Sound words (SKREEE! SNAP!) and ALL-CAPS emphasis are welcome; they are fun to read aloud.
- Dialogue does most of the storytelling, which makes pages good for reading aloud and re-reading.
- Every page has art. Acorn and Leaf give art about half the page; Branch about a third; Oak and Elder about a quarter.

---

## Technical Approach
- **One reader app, many books.** `index.html` loads `js/app.jsx`. The library comes from `manifest.json`, and each book is a `books/{bookId}/book.json` file. See [`book.README.md`](book.README.md).
- **Circle word files.** `circles/{circle}/words.json` holds each Circle's rules, heart words and story words. See [`words.README.md`](words.README.md).
- **Checker.** `node tools/check-book.mjs --all` validates every JSON file against the schemas in `/docs`, checks every book against its Circle's rules, and checks that every page has the book's own scene art. A book ships only when it passes.
- **Scene art.** `python3 tools/compose-scenes.py books/{bookId}` builds a book's cover and page scenes from its `scenes.json`. See [`SCENE_ART.md`](SCENE_ART.md).
- **Reader features.** Read to Me with word highlighting, tap-a-word syllables, Practice Read, gentle quizzes, reading comfort settings, badges, Ceremonies and a Parent Corner. See [`READER_APP.md`](READER_APP.md).

---

## Asset Rules

**Master character images:**
- Stored in `images/characters/master/` as `{id}_master.png` (the `{id}` uses underscores, e.g. `pip_pebble_master.png`), full size, in Git LFS.
- The app shows web-sized copies, `images/web/characters/{id}.webp`, built by `python3 tools/make-web-images.py`. Rebuild and commit them whenever a master changes.
- Must match the **Character Bible** exactly. No unapproved changes to proportions, colors or permanent accessories.
- Variants (seasonal outfits, props) go in `images/characters/variants/` and must be approved before use.

**Page art:** every book has its own cover and a scene for every page in `books/{bookId}/images/` as WebP. Whoever writes the book makes them, composing each scene from painted backdrops, props and the canon character art with `tools/compose-scenes.py` and `books/{bookId}/scenes.json`. See [`SCENE_ART.md`](SCENE_ART.md).

**Circle symbols:**
- Stored in `images/ui/circles/` as `circle-{name}.png` (source); the app shows `images/web/circles/circle-{name}.webp`.
- Always use the official files; never regenerate variants.
