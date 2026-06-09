# EverDraft Homepage Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the beta-oriented EverDraft homepage with a polished, responsive platform homepage that uses the new artwork and previews real Library stories.

**Architecture:** Keep the existing shared header, footer, account routes, and Library data service. Replace homepage markup and add isolated `home-*` styles, while a small `home.js` module imports `getLibraryStories()` and renders up to four recent story cards with resilient empty and error states.

**Tech Stack:** Semantic HTML, existing CSS design system, vanilla JavaScript ES modules, Node's built-in test runner, in-app browser verification.

---

### Task 1: Add Homepage Acceptance Tests

**Files:**
- Create: `everdraft-site/tests/homepage.test.mjs`

- [ ] **Step 1: Write failing structural tests**

Create tests that read `index.html` and assert the new title, six section hooks,
new asset paths, signup and Library CTA routes, `home.js` module, and absence of
the old beta/progress copy.

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test tests/homepage.test.mjs`

Expected: failures for the new heading and homepage sections because the old
beta homepage is still present.

- [ ] **Step 3: Keep the test focused on user-visible requirements**

The test must not assert incidental whitespace or full HTML snapshots. It
should verify required content and routing while allowing markup to evolve.

### Task 2: Replace Homepage Structure

**Files:**
- Modify: `everdraft-site/index.html`

- [ ] **Step 1: Update page metadata**

Change the title and description to present EverDraft as a live writing
platform, with no beta or testing language.

- [ ] **Step 2: Build the hero**

Add the supplied heading, body, signup and Library actions, and three detail
chips. Preserve the existing header and navigation links.

- [ ] **Step 3: Add the Library preview mount point**

Add the section heading/body, an `aria-live` story grid with a loading state,
an error/status element, and the Library action.

- [ ] **Step 4: Add the four platform feature cards**

Use all four `/assets/home/` icon paths and supplied copy.

- [ ] **Step 5: Refresh Write / Grow / Connect**

Retain the existing icon paths and replace card copy with the supplied text.

- [ ] **Step 6: Add reader invitation and final CTA**

Use the supplied copy, `/library/` reader links, and `/signup/` account links.

- [ ] **Step 7: Load the homepage module**

Add `<script type="module" src="/home.js"></script>` before `</body>`.

- [ ] **Step 8: Run the structural tests**

Run: `node --test tests/homepage.test.mjs`

Expected: all structural tests pass.

### Task 3: Implement Live Library Preview Test-First

**Files:**
- Modify: `everdraft-site/tests/homepage.test.mjs`
- Create: `everdraft-site/home.js`

- [ ] **Step 1: Add failing behavior tests**

Add source-level assertions that `home.js` imports `getLibraryStories`, limits
the result to four stories, renders cover fallbacks, and catches loading errors.

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test tests/homepage.test.mjs`

Expected: failure because `home.js` does not exist.

- [ ] **Step 3: Implement the homepage Library renderer**

Create `home.js` with HTML escaping, status formatting, cover fallback,
four-story rendering, empty state, and non-blocking error handling. Link titles,
authors when usernames exist, and story actions to existing public routes.

- [ ] **Step 4: Run tests and syntax validation**

Run:

```bash
node --test tests/homepage.test.mjs
node --check home.js
```

Expected: all tests pass and syntax validation exits successfully.

### Task 4: Add Responsive Homepage Styling

**Files:**
- Modify: `everdraft-site/styles.css`
- Modify: `everdraft-site/tests/homepage.test.mjs`

- [ ] **Step 1: Add failing style contract tests**

Assert that the stylesheet references the new hero image and includes desktop
four-column and tablet two-column rules for homepage grids.

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test tests/homepage.test.mjs`

Expected: style contract failures because the old forest hero remains.

- [ ] **Step 3: Implement isolated homepage styles**

Add styles for section spacing, headings, hero overlay and positioning, detail
chips, Library preview cards, four-card feature grid, reader panel, final CTA,
asset fallback containers, and responsive one/two/four-column layouts.

- [ ] **Step 4: Preserve shared styles**

Avoid changing Library, account, story, authentication, or shared card
selectors except where a homepage-specific descendant selector is used.

- [ ] **Step 5: Run automated checks**

Run:

```bash
node --test tests/homepage.test.mjs
node --check home.js
git diff --check
```

Expected: all tests pass, JavaScript parses, and no whitespace errors appear.

### Task 5: Browser Verification And Final Review

**Files:**
- Verify: `everdraft-site/index.html`
- Verify: `everdraft-site/styles.css`
- Verify: `everdraft-site/home.js`

- [ ] **Step 1: Start a local static server**

Serve `everdraft-site` on an available localhost port.

- [ ] **Step 2: Inspect desktop layout**

Verify the hero copy sits left of the desk artwork, Library and feature cards
form wide grids, text remains readable, and navigation links still work.

- [ ] **Step 3: Inspect tablet and mobile layouts**

Verify cards become two columns on tablet and one column on mobile, actions
stack cleanly, and no horizontal overflow appears.

- [ ] **Step 4: Inspect Library loading failure behavior**

Confirm a missing local API does not break the homepage and produces a friendly
preview message while preserving the Library action.

- [ ] **Step 5: Run final verification**

Run:

```bash
node --test tests/homepage.test.mjs
node --check home.js
git diff --check
git status --short
```

Expected: all automated checks pass and only intended homepage files, the test,
the plan, and supplied assets appear as changes.
