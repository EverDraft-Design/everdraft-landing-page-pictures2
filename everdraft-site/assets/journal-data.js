// EDIT THE FEATURED JOURNAL ARTICLE HERE.
// Change only the text between the quote marks unless you are comfortable editing JavaScript.
export const featuredArticle = {
  category: "FEATURED NOTE",
  title: "Featured Article Title",
  date: "Month Day, Year",
  excerpt: "Featured article excerpt placeholder.",
  url: "/journal/featured-article"
};

// ADD NEW JOURNAL ARTICLES BELOW THIS LINE
// Copy one full article block, paste it underneath, then change the category/title/date/excerpt/url.
// Keep the commas between article blocks. Keep categorySlug as either "everdraft-notes" or "writers-lantern".
export const journalArticles = [
  {
    category: "EVERDRAFT NOTES",
    categorySlug: "everdraft-notes",
    title: "Write, Grow, Connect",
    date: "Month Day, Year",
    excerpt: "Placeholder excerpt for the guiding pillars of EverDraft.",
    url: "/journal/write-grow-connect"
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: "writers-lantern",
    title: "What to Do With a Story Sitting in Google Docs",
    date: "May 20, 2026",
    excerpt: "For the story you keep opening, editing, closing, and hiding again",
    url: "/journal/story-sitting-in-google-docs"
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: "writers-lantern",
    title: "Where Can I Find Support as a Writer?",
    date: "Month Day, Year",
    excerpt: "Placeholder excerpt for writer support article.",
    url: "/journal/writer-support"
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: "writers-lantern",
    title: "Where Can I Share My Unfinished Story?",
    date: "Month Day, Year",
    excerpt: "Placeholder excerpt for SEO writer guidance article.",
    url: "/journal/share-unfinished-story"
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: "writers-lantern",
    title: "How Do I Get Feedback on My Writing?",
    date: "Month Day, Year",
    excerpt: "Placeholder excerpt for feedback guidance article.",
    url: "/journal/get-feedback-on-writing"
  },
  {
    category: "EVERDRAFT NOTES",
    categorySlug: "everdraft-notes",
    title: "The First Draft of EverDraft",
    date: "May 3, 2026",
    excerpt: "Why EverDraft? Why not?",
    url: "/journal/first-draft-of-everdraft"
  }
];

// Page rendering code lives below. You usually should not need to edit this section.
const VALID_CATEGORY_SLUGS = new Set(["everdraft-notes", "writers-lantern"]);

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setHref(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.href = value;
}

function isValidArticle(article) {
  return Boolean(
    article &&
      VALID_CATEGORY_SLUGS.has(article.categorySlug) &&
      article.category &&
      article.title &&
      article.date &&
      article.excerpt &&
      article.url
  );
}

function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'journal-card';
  card.dataset.category = article.categorySlug;

  const category = document.createElement('p');
  category.className = 'journal-category';
  category.textContent = article.category;

  const title = document.createElement('h3');
  title.textContent = article.title;

  const date = document.createElement('p');
  date.className = 'journal-date';
  date.textContent = article.date;

  const excerpt = document.createElement('p');
  excerpt.textContent = article.excerpt;

  const link = document.createElement('a');
  link.className = 'journal-read-link';
  link.href = article.url;
  link.textContent = 'Read more';

  card.append(category, title, date, excerpt, link);
  return card;
}

function renderFeaturedArticle() {
  setText('[data-featured-category]', featuredArticle.category);
  setText('[data-featured-title]', featuredArticle.title);
  setText('[data-featured-date]', featuredArticle.date);
  setText('[data-featured-excerpt]', featuredArticle.excerpt);
  setHref('[data-featured-link]', featuredArticle.url);
}

function renderJournalGrid() {
  const grid = document.getElementById('journal-grid');
  if (!grid) return;

  const validArticles = journalArticles.filter(isValidArticle);
  grid.innerHTML = '';
  for (const article of validArticles) {
    grid.append(createArticleCard(article));
  }
}

function filterJournalCards(selectedFilter) {
  const cards = document.querySelectorAll('.journal-card');

  for (const card of cards) {
    card.hidden = selectedFilter !== 'all' && card.dataset.category !== selectedFilter;
  }
}

function updateFilterButtonState(filterButton, isSelected) {
  filterButton.classList.toggle('is-active', isSelected);
  filterButton.classList.toggle('active', isSelected);
  filterButton.setAttribute('aria-pressed', String(isSelected));
}

function setupJournalFilters() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  if (!filterButtons.length) return;

  for (const filterButton of filterButtons) {
    filterButton.addEventListener('click', () => {
      const selectedFilter = filterButton.dataset.filter;

      // The active classes keep the selected button gold-filled.
      for (const button of filterButtons) {
        const isSelected = button === filterButton;
        updateFilterButtonState(button, isSelected);
      }

      filterJournalCards(selectedFilter);
    });
  }
}

if (typeof document !== 'undefined') {
  renderFeaturedArticle();
  renderJournalGrid();
  setupJournalFilters();
}
