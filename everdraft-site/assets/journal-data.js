// EDIT THE FEATURED JOURNAL ARTICLE HERE.
// Change the title/date/excerpt/url values between the quote marks.
export const featuredArticle = {
  category: 'FEATURED NOTE',
  title: 'Featured Article Title',
  date: 'Month Day, Year',
  excerpt: 'Short featured excerpt placeholder.',
  url: '/journal/featured-article'
};

// ADD NEW JOURNAL ARTICLES BELOW THIS LINE
// Copy one article block, paste it underneath, then change the title/date/excerpt/url.
export const journalArticles = [
  {
    category: 'EVERDRAFT NOTES',
    categorySlug: 'everdraft-notes',
    title: 'Write, Grow, Connect',
    date: 'May, 2026',
    excerpt: 'Why EverDraft?',
    url: '/journal/write-grow-connect'
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: 'writers-lantern',
    title: 'Where Can I Find Support as a Writer?',
    date: 'May 13, 2026',
    excerpt: 'Placeholder excerpt for writer support article.',
    url: '/journal/writer-support'
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: 'writers-lantern',
    title: 'Where Can I Share My Unfinished Story?',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for SEO writer guidance article.',
    url: '/journal/share-unfinished-story'
  },
  {
    category: 'EVERDRAFT NOTES',
    categorySlug: 'everdraft-notes',
    title: 'The First Draft of EverDraft',
    date: 'May 3, 2026',
    excerpt: 'Placeholder excerpt for founder/background article.',
    url: '/journal/first-draft-of-everdraft'
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: 'writers-lantern',
    title: 'How Do I Get Feedback on My Writing?',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for feedback guidance article.',
    url: '/journal/get-feedback-on-writing'
  },
  {
    category: "THE WRITER'S LANTERN",
    categorySlug: 'writers-lantern',
    title: 'What to Do With a Story Sitting in Google Docs',
    date: 'May 15, 2026',
    excerpt: 'If Google Docs isn't enough for you? EverDraft',
    url: '/journal/story-sitting-in-google-docs'
  }
];

// Page rendering code lives below. You usually should not need to edit this section.
function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setHref(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.href = value;
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

  grid.innerHTML = '';
  for (const article of journalArticles) {
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
