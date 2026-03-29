/* ============================
   Main JavaScript
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  loadNews();
  loadPublications();
  initScrollAnimations();
});

/* --- Navigation --- */
function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const nav = document.getElementById('nav');

  // Hamburger toggle
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });

  // Close menu on link click
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      links.classList.remove('open');
    });
  });

  // Nav shadow on scroll
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 10);
  });

  // Active nav link on scroll
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinks = links.querySelectorAll('a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });
}

/* --- News --- */
async function loadNews() {
  try {
    const res = await fetch('data/news.json');
    const news = await res.json();
    const list = document.getElementById('news-list');
    const toggleBtn = document.getElementById('news-toggle');
    const SHOW_COUNT = 5;

    news.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'news-item fade-in' + (i >= SHOW_COUNT ? ' hidden' : '');
      el.innerHTML = `
        <span class="news-date">${formatDate(item.date)}</span>
        <span class="news-text">${item.text}</span>
      `;
      list.appendChild(el);
    });

    if (news.length > SHOW_COUNT) {
      toggleBtn.style.display = 'inline-block';
      let expanded = false;
      toggleBtn.addEventListener('click', () => {
        expanded = !expanded;
        list.querySelectorAll('.news-item').forEach((el, i) => {
          if (i >= SHOW_COUNT) {
            el.classList.toggle('hidden', !expanded);
          }
        });
        toggleBtn.textContent = expanded ? 'Show less' : 'Show all';
      });
    }
  } catch (e) {
    console.error('Failed to load news:', e);
  }
}

function formatDate(dateStr) {
  const months = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    return months[parts[1]] + ' ' + parts[0];
  }
  return parts[0]; // year only
}

/* --- Publications --- */
async function loadPublications() {
  try {
    const res = await fetch('data/publications.json');
    const pubs = await res.json();
    const list = document.getElementById('pub-list');
    const filtersContainer = document.getElementById('pub-filters');

    // Collect all tags
    const allTags = new Set();
    pubs.forEach(p => p.tags.forEach(t => allTags.add(t)));

    // Render filter buttons
    const filterAll = document.createElement('button');
    filterAll.className = 'pub-filter active';
    filterAll.textContent = 'All';
    filterAll.dataset.tag = 'all';
    filtersContainer.appendChild(filterAll);

    allTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'pub-filter';
      btn.textContent = tag;
      btn.dataset.tag = tag;
      filtersContainer.appendChild(btn);
    });

    // Render publication cards
    pubs.forEach((pub, i) => {
      const gradientClass = 'pub-thumb--gradient-' + (i % 5);
      const tagsData = pub.tags.map(t => `data-tag-${t.toLowerCase().replace(/\s+/g, '-')}="true"`).join(' ');

      // Highlight "Y Dai" in author string
      const highlightedAuthors = pub.authors.replace(
        /Y Dai\*?/g,
        match => `<span class="me">${match}</span>`
      );

      // Build links
      let linksHtml = '';
      if (pub.links.arxiv) linksHtml += `<a href="${pub.links.arxiv}" target="_blank" rel="noopener" class="pub-link">arXiv</a>`;
      if (pub.links.pdf) linksHtml += `<a href="${pub.links.pdf}" target="_blank" rel="noopener" class="pub-link">PDF</a>`;
      if (pub.links.code) linksHtml += `<a href="${pub.links.code}" target="_blank" rel="noopener" class="pub-link">Code</a>`;
      if (pub.links.project) linksHtml += `<a href="${pub.links.project}" target="_blank" rel="noopener" class="pub-link">Project</a>`;

      // Venue display
      const venueDisplay = pub.venue
        ? `<span class="pub-venue pub-venue--${pub.venueType}">${pub.venue}</span>`
        : '';

      const card = document.createElement('div');
      card.className = 'pub-card fade-in';
      card.dataset.tags = JSON.stringify(pub.tags);

      // Thumbnail: real image or gradient fallback
      const thumbHtml = pub.thumbnail
        ? `<div class="pub-thumb-img"><img src="${pub.thumbnail}" alt="${pub.title}" loading="lazy"></div>`
        : `<div class="pub-thumb ${gradientClass}"><span class="pub-thumb__label">${pub.tags[0] || ''}</span></div>`;

      card.innerHTML = `
        ${thumbHtml}
        <div class="pub-info">
          <div class="pub-title">${pub.title}</div>
          <div class="pub-authors">${highlightedAuthors}</div>
          ${venueDisplay}
          <div class="pub-links">
            ${linksHtml}
          </div>
          ${pub.abstract ? `<button class="pub-abstract-toggle expanded" onclick="toggleAbstract(this)">Abstract <span class="arrow">▼</span></button>` : ''}
          ${pub.abstract ? `<div class="pub-abstract expanded">${pub.abstract}</div>` : ''}
        </div>
      `;

      list.appendChild(card);
    });

    // Filter click handler
    filtersContainer.addEventListener('click', (e) => {
      if (!e.target.classList.contains('pub-filter')) return;
      filtersContainer.querySelectorAll('.pub-filter').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const tag = e.target.dataset.tag;
      list.querySelectorAll('.pub-card').forEach(card => {
        const cardTags = JSON.parse(card.dataset.tags);
        if (tag === 'all' || cardTags.includes(tag)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });

    // On mobile: collapse all abstracts by default
    if (window.innerWidth <= 640) {
      list.querySelectorAll('.pub-abstract').forEach(el => el.classList.remove('expanded'));
      list.querySelectorAll('.pub-abstract-toggle').forEach(el => el.classList.remove('expanded'));
    }

  } catch (e) {
    console.error('Failed to load publications:', e);
  }
}

/* --- Abstract toggle --- */
function toggleAbstract(btn) {
  const abstract = btn.closest('.pub-info').querySelector('.pub-abstract');
  abstract.classList.toggle('expanded');
  btn.classList.toggle('expanded');
  const isExpanded = abstract.classList.contains('expanded');
  btn.innerHTML = isExpanded ? 'Abstract <span class="arrow">▼</span>' : 'Abstract <span class="arrow">▼</span>';
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  // Observe all elements with fade-in class (including dynamically added ones)
  const observeElements = () => {
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
      observer.observe(el);
    });
  };

  // Initial observe
  observeElements();

  // Re-observe after dynamic content loads (small delay)
  setTimeout(observeElements, 500);
  setTimeout(observeElements, 1500);
}
