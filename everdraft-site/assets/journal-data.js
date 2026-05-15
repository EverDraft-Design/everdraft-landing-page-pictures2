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
    title: 'Write, Grow, Connect',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for the guiding pillars of EverDraft.',
    url: '/journal/write-grow-connect'
  },
  {
    category: "THE WRITER'S LANTERN",
    title: 'Where Can I Find Support as a Writer?',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for writer support article.',
    url: '/journal/writer-support'
  },
  {
    category: "THE WRITER'S LANTERN",
    title: 'Where Can I Share My Unfinished Story?',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for SEO writer guidance article.',
    url: '/journal/share-unfinished-story'
  },
  {
    category: 'EVERDRAFT NOTES',
    title: 'The First Draft of EverDraft',
    date: 'May 3, 2026',
    excerpt: 'Placeholder excerpt for founder/background article.',
    url: '/journal/first-draft-of-everdraft'
  },
  {
    category: "THE WRITER'S LANTERN",
    title: 'How Do I Get Feedback on My Writing?',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for feedback guidance article.',
    url: '/journal/get-feedback-on-writing'
  },
  {
    category: "THE WRITER'S LANTERN",
    title: 'What to Do With a Story Sitting in Google Docs',
    date: 'Month Day, Year',
    excerpt: 'Placeholder excerpt for writer encouragement article.',
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

if (typeof document !== 'undefined') {
  renderFeaturedArticle();
  renderJournalGrid();
}
