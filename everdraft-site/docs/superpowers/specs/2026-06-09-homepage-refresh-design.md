# EverDraft Homepage Refresh Design

## Goal

Refresh the EverDraft homepage so it presents the site as an active, welcoming
platform for writers and readers. Remove beta and testing language from the
homepage while preserving the existing navigation, account flows, Library
links, footer links, and JavaScript behavior elsewhere on the site.

The copy must remain warm, clear, story-focused, and inviting. It must not use
overly soft wording such as "quiet," "quietly," "calm," or "gently."

## Page Structure

The homepage will contain these sections in order:

1. Hero
2. From the Library
3. Made for works in progress
4. Write / Grow / Connect
5. Reader invitation
6. Final call to action

The existing site header and footer remain in place. Beta-specific homepage
sections, including the beta note and progress indicators, will be removed.

## Hero

The hero will use `/assets/home/hero-writing-desk.png` as a full-width visual.
Copy will sit on the darker left side, with layered violet gradients preserving
readability and allowing the desk artwork to remain visible on the right.

Content:

- Heading: "A home for stories still being written."
- Body: supplied homepage copy
- Primary action: "Create your free account" linking to `/signup/`
- Secondary action: "Browse the Library" linking to `/library/`
- Detail chips: "For writers and readers," "Free to join," and "Stories at every stage"

On narrow screens, the background position and overlay will prioritize text
contrast. Actions will stack and fill the available width.

## Library Preview

A "From the Library" section will load real data with the existing
`getLibraryStories()` function. A new homepage module will:

- Request the current public Library stories.
- Select the four most recently updated stories.
- Render cover art with the same initial-based fallback used by the Library.
- Show status, title, author or pen name, genre, and published chapter count.
- Link each card to its public story page.
- Show a polished empty state when no stories are available.
- Show a non-blocking fallback message if the service cannot be reached.

The current Library query does not return Spark or follower totals. The
homepage preview will omit those totals rather than make multiple per-card
requests or show inaccurate values. Existing interactive Spark and follow
controls will remain exclusive to the full Library page.

The section includes a "Browse the Library" action linking to `/library/`.

## Platform Feature Cards

The "Made for works in progress." section will contain four cards:

- Sparks using `/assets/home/icon-sparks.png`
- Private Notes using `/assets/home/icon-private-notes.png`
- Pinboard using `/assets/home/icon-pinboard.png`
- Story Follows using `/assets/home/icon-story-follows.png`

Each card uses the supplied copy. Icons will have stable containers and
decorative fallback styling so a failed image does not break card layout.

## Write / Grow / Connect

The existing `/assets/icons/write.png`, `/assets/icons/grow.png`, and
`/assets/icons/connect.png` artwork will be retained in a refreshed section.
The three cards use the supplied Write, Grow, and Connect copy.

## Reader Invitation

A distinct reader-focused panel will make clear that non-writers belong on the
platform. It will use the supplied heading and body, with "Start reading"
linking to `/library/`.

## Final Call To Action

The final panel will use:

- Heading: "Start with one chapter."
- Supplied supporting copy
- "Create your account" linking to `/signup/`
- "Explore the Library" linking to `/library/`

Acquisition actions use `/signup/` because `/account/` is the existing member
dashboard and may redirect signed-out visitors. Existing navigation retains its
current `/account/` link for returning members.

## Styling And Responsiveness

Homepage-specific classes will be added to the existing stylesheet without
changing shared Library, account, story, or authentication layouts.

- Desktop: split visual hero, four-column Library and feature grids, and a
  three-column Write / Grow / Connect grid.
- Tablet: two-column Library and feature grids.
- Mobile: single-column cards, stacked sections, and full-width or neatly
  stacked actions.

The visual language will retain EverDraft's dark violet, near-black, and gold
palette. Panels will use readable contrast, restrained glow, subtle gradients,
and literary typography. Focus states and semantic heading order will remain
accessible.

## Files And Boundaries

Expected implementation files:

- `everdraft-site/index.html`
- `everdraft-site/styles.css`
- `everdraft-site/home.js` (new)

The homepage module will import from `stories.js`; no backend or schema changes
are required. Existing Library rendering and controls will not be refactored in
this pass, keeping the change focused and reducing regression risk.

## Error Handling

The hero and static marketing sections require no JavaScript. If Library data
loading fails, the rest of the homepage remains fully usable and the preview
shows a friendly message plus the Library link. Missing covers and homepage
icons retain styled visual fallbacks.

## Verification

Verification will cover:

- JavaScript syntax for the new homepage module.
- Homepage links, semantic structure, and absence of beta/testing language.
- Live Library rendering and empty/error states through code inspection and
  browser testing where the local environment permits.
- Desktop, tablet, and mobile visual behavior in the in-app browser.
- Confirmation that existing navigation, account, signup, and Library URLs are
  unchanged outside the intended homepage acquisition links.
