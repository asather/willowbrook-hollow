# Instructions for AI assistants working on Willowbrook Hollow

This file is loaded automatically by Claude, and any AI assistant working in this repo should read it first. It says what the owner (Andrew) expects an assistant to do **without being asked**.

## The standing expectation: finish the job, all the way to the live site
When Andrew asks for a change (a new story, a character, an app feature, a fix), the assistant carries it through every step below itself, then reports back with the live link. He should never have to ask for the next step.

1. **Do the work** following the right playbook:
   - New story → [`docs/story-creation-checklist.README.md`](docs/story-creation-checklist.README.md)
   - New character → [`docs/character-creation-checklist.README.md`](docs/character-creation-checklist.README.md)
   - Reader app behavior → [`docs/READER_APP.md`](docs/READER_APP.md)
   - Reading levels and word rules → [`docs/CIRCLES_README.md`](docs/CIRCLES_README.md)
2. **Rebuild web images** whenever any master art or Circle emblem is added or changed: `python3 tools/make-web-images.py` (needs `git lfs pull` first). Commit the updated `images/web/` files.
3. **Run the checker until it passes:** `node tools/check-book.mjs --all`. Fix the content, never loosen the rules to make it pass (unless Andrew asks for a rule change, and then update the docs too).
4. **Test in a browser:** serve the repo (`python3 -m http.server 8000`) and walk through what changed. Check that there are no broken images and no console errors.
5. **Keep the docs true.** If behavior, structure or rules change, update every doc that mentions them so they read as if this was always the plan. Remove anything contradictory or vague. The docs are the instructions the next assistant will follow.
6. **Commit to `master` and push.** GitHub Pages publishes `master` to **https://asather.github.io/willowbrook-hollow/**, which Zoe uses on her tablet. Don't leave finished work on a side branch or in an unmerged pull request unless Andrew asks for a review first. Write clear commit messages.
7. **Verify the live site** a couple of minutes after pushing. Load it in a browser and confirm the change is there and that every image loads. Pages lets browsers cache files for up to 10 minutes; if you see the old version, refresh the cache (e.g. `fetch(url, {cache: "reload"})` for the changed files, then reload) before deciding something is broken.
8. **Report back briefly:** what changed, the live link, and anything Andrew needs to know or do.

## Things that have bitten before
- **Git LFS and GitHub Pages:** master PNGs are stored in Git LFS, and Pages serves LFS files as pointer text, so the website can't show them. The app must only reference servable files: the WebP copies in `images/web/`, and WebP covers and scene art in `books/{bookId}/images/`. The checker fails any LFS pointer or missing image.
- **LFS uploads may be refused** from cloud sessions (the push fails with a 403 from the LFS storage host). Web images and covers are WebP, which isn't tracked by LFS, so they push normally. If a new *master* PNG can't upload, tell Andrew rather than working around it.
- **No `gh` CLI** may be available. Merging to `master` locally and pushing is the normal path anyway.
- **Speech:** Read to Me uses the device's voice. Headless browsers have no voices, so mock `speechSynthesis` in tests (define it with `Object.defineProperty`; plain assignment doesn't take).

## Privacy: this repo is public
Never put the reader's personal information in the repo: school or assessment data, reading scores, IEP details, teacher names, health information. Stories may feature Zoe as the in-story human helper, as the Character Bible describes her, but nothing about her schooling.

The reader's actual reading profile (assessment results and what they mean for the books) lives in the **private Willow Hollow project** in Claude, not here. When choosing a Circle, story words or difficulty for a new book, read that profile if you have access to it, and apply what it says through the general rules in this repo.

## Writing for this series
- Written for an 8–10-year-old, decodable at the Circle's level. Humor and plots never talk down; the *words* are what get easier.
- Reword before adding exceptions (*night* → *dusk*), and use story words on purpose.
- Every page has art. Until scene art exists, use the web copies of the characters on that page.
- Read the whole book aloud (mentally) before calling it done. Every page should have a laugh, a feeling or a turn.
