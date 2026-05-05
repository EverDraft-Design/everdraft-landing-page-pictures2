# EverDraft Schema Plan

This is the first database plan for EverDraft's future story-sharing platform. It is intentionally behind the scenes: the public site remains a landing and waitlist website until the product is ready for visible reader and writer features.

## Core Model

EverDraft starts with seven core tables:

- `profiles` stores the public writing or reading identity connected to a Supabase Auth user.
- `stories` stores story-level metadata such as title, slug, blurb, genre, cover art, publication status, and publication mode.
- `chapters` stores chapter-level content and chapter publication state.
- `story_follows` tracks readers following a specific story.
- `writer_follows` tracks readers following a writer as a person.
- `comments` stores chapter feedback.
- `ratings` stores story-level ratings and reviews.

## Why Stories And Chapters Are Separate

Stories and chapters need different lifecycles. A story can have a title, cover, blurb, genre, and public landing page before every chapter is ready. Chapters can be drafted, hidden, published, or archived one at a time.

Keeping chapters separate makes it possible to:

- Publish fiction chapter by chapter.
- Hide or archive individual chapters without deleting the story page.
- Preserve story metadata while changing content availability.
- Add future chapter-level features such as inline feedback, reading progress, and scheduled releases.

## Publication Mode

`stories.publication_mode` records whether a story is tied to an external publishing path:

- `none` means no external publication mode is active.
- `kdp` means the story is available through Kindle Direct Publishing or a similar Amazon path.
- `kdp_select` represents Kindle Unlimited / KDP Select.
- `other` leaves room for other publishing or exclusivity arrangements.

Publication Mode does not delete story metadata. A story can still have a public landing page, cover, blurb, genre, author, and external book link even if readable chapter content is hidden.

## Kindle Unlimited / KDP Select Handling

KDP Select can require digital exclusivity for readable book content. EverDraft models this with `stories.is_readable`.

When `publication_mode = 'kdp_select'`, the app can set `is_readable = false`. Public story metadata remains visible, but published chapter content is not publicly readable through the chapter read policy. This supports a public story landing page that can point readers to an external book page while respecting content exclusivity.

The database does not automatically force all KDP Select stories to hide chapters. That choice is kept explicit through `is_readable` because publishing rules, story excerpts, and author workflows may vary.

## Following Writers vs Following Stories

`story_follows` and `writer_follows` are separate because they mean different things:

- Following a story means the reader wants updates for that specific work, such as new chapters or completion notices.
- Following a writer means the reader wants updates across that writer's body of work, including future stories, essays, launches, or Writer's Nook activity.

Keeping these tables separate avoids mixing notification preferences and makes future feeds easier to build.

## Ratings For Completed Stories

Ratings are planned for completed stories only. A work-in-progress changes over time, and early ratings can become misleading as chapters are revised or the ending changes.

The migration includes a database trigger that blocks ratings unless the related story has `status = 'complete'`. This keeps the rule close to the data and prevents accidental bypass through future clients.

## Future Expansion Notes

- Badges can be added later for writer milestones, reader contributions, constructive feedback, beta participation, and launch achievements.
- Writer's Nook can build on `profiles`, `stories`, `writer_follows`, and future post or announcement tables without changing the public waitlist site yet.
- Paid launch announcements can later use story and writer follow data to notify opted-in readers about releases or external book links.
- Email consent should be modeled explicitly before sending product, story, or launch emails. The waitlist database and future Supabase profile data should not be treated as blanket consent for every type of message.
- Moderation, blocking, reporting, content warnings, and notification preferences should be designed before opening public story submission.

