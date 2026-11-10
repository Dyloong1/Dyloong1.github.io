/* ============================
   Main JavaScript
   ============================ */

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initNav();
  initBackToTop();
  loadNews();
  loadPublications();
});

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Reveal on scroll ---
   Elements with .fade-in start transparent (only when JS runs, see the
   inline script in <head>) and fade in once they enter the viewport.
   Content rendered later from JSON is registered right after it is built,
   so slow networks can never leave cards stuck invisible. */
let revealObserver = null;

function initReveal() {
  if (!('IntersectionObserver' in window)) {
    revealObserver = null;
  } else {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
  }
  observeReveal(document);
}

function observeReveal(root) {
  root.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('visible');
  });
}

/* --- Navigation --- */
function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const nav = document.getElementById('nav');
  const navLinks = [...links.querySelectorAll('a')];
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  // Mobile menu
  const setMenu = (open) => {
    toggle.classList.toggle('active', open);
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !nav.contains(e.target)) setMenu(false);
  });

  // Scroll state: nav shadow + active section, batched into one frame
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('nav--scrolled', y > 10);

    // The active section is the last one whose top has passed a line a
    // third of the way down the viewport; at the very bottom of the page the
    // last section wins even if it is too short to reach that line.
    const line = window.innerHeight * 0.33;
    let current = sections[0];
    sections.forEach(s => {
      if (s.getBoundingClientRect().top <= line) current = s;
    });
    const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 2;
    if (atBottom) current = sections[sections.length - 1];

    navLinks.forEach(link => {
      const on = current && link.getAttribute('href') === '#' + current.id;
      link.classList.toggle('active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

/* --- Back to top --- */
function initBackToTop() {
  const btn = document.getElementById('to-top');
  if (!btn) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.2);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    document.querySelector('.nav__logo')?.focus({ preventScroll: true });
  });
  update();
}

/* --- Last updated ---
   Uses the newest Last-Modified among the page and its data files, so the
   footer stays current without hand edits. Falls back to the static text. */
const lastModifiedDates = [];

function noteLastModified(res) {
  const h = res.headers.get('last-modified');
  if (h) {
    const d = new Date(h);
    if (!isNaN(d)) lastModifiedDates.push(d);
  }
  renderLastUpdated();
}

function renderLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  const dates = [...lastModifiedDates];
  const doc = new Date(document.lastModified);
  // Without a Last-Modified header, document.lastModified is "now"; skip it then.
  if (!isNaN(doc) && Math.abs(Date.now() - doc) > 60 * 1000) dates.push(doc);
  if (!dates.length) return;
  const newest = new Date(Math.max(...dates));
  el.textContent = newest.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  el.setAttribute('datetime', newest.toISOString().slice(0, 10));
}

/* --- News --- */
const NEWS_ICONS = {
  accepted:  '🥂',
  preprint:  '📄',
  phd_start: '🎓',
  graduated: '🧑‍🎓'
};

async function loadNews() {
  const list = document.getElementById('news-list');
  const toggleBtn = document.getElementById('news-toggle');
  const SHOW_COUNT = 5;
  try {
    const res = await fetch('data/news.json');
    if (!res.ok) throw new Error(res.status);
    noteLastModified(res);
    const news = await res.json();

    let currentYear = null;
    const yearHeaders = {};
    const frag = document.createDocumentFragment();

    news.forEach((item, i) => {
      const year = item.date.split('-')[0];
      if (year !== currentYear) {
        const header = document.createElement('h3');
        header.className = 'news-year';
        header.dataset.year = year;
        header.textContent = year;
        frag.appendChild(header);
        yearHeaders[year] = header;
        currentYear = year;
      }

      const el = document.createElement('div');
      el.className = 'news-item fade-in' + (i >= SHOW_COUNT ? ' hidden' : '');
      el.dataset.year = year;
      const emoji = NEWS_ICONS[item.type] || '';
      const iconHtml = emoji
        ? `<span class="news-icon news-icon--${item.type}" aria-hidden="true">${emoji}</span>`
        : `<span class="news-icon news-icon--empty" aria-hidden="true"></span>`;
      el.innerHTML = `
        ${iconHtml}
        <time class="news-date" datetime="${item.date}">${formatDate(item.date)}</time>
        <span class="news-text">${item.text}</span>
      `;
      frag.appendChild(el);
    });
    list.appendChild(frag);

    const updateYearVisibility = () => {
      Object.entries(yearHeaders).forEach(([year, header]) => {
        const anyVisible = list.querySelector(`.news-item[data-year="${year}"]:not(.hidden)`);
        header.classList.toggle('hidden', !anyVisible);
      });
    };
    updateYearVisibility();
    observeReveal(list);

    if (news.length > SHOW_COUNT) {
      const label = (expanded) => expanded ? 'Show less' : `Show all ${news.length}`;
      toggleBtn.hidden = false;
      toggleBtn.textContent = label(false);
      let expanded = false;
      toggleBtn.addEventListener('click', () => {
        expanded = !expanded;
        list.querySelectorAll('.news-item').forEach((el, i) => {
          if (i >= SHOW_COUNT) el.classList.toggle('hidden', !expanded);
        });
        updateYearVisibility();
        toggleBtn.textContent = label(expanded);
        toggleBtn.setAttribute('aria-expanded', String(expanded));
        if (!expanded) {
          // Collapsing a long list can leave the reader far below it.
          const top = document.getElementById('news').getBoundingClientRect().top;
          if (top < 0) document.getElementById('news').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      });
    }
  } catch (e) {
    console.error('Failed to load news:', e);
    list.innerHTML = '<p class="load-error">News could not be loaded. Please refresh the page.</p>';
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
  const list = document.getElementById('pub-list');
  const filtersContainer = document.getElementById('pub-filters');
  const status = document.getElementById('pub-status');
  try {
    const res = await fetch('data/publications.json');
    if (!res.ok) throw new Error(res.status);
    noteLastModified(res);
    const pubs = await res.json();

    // Collect tags with counts, in first-seen order
    const tagCounts = new Map();
    pubs.forEach(p => p.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));

    const makeFilter = (tag, label, count, active) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pub-filter' + (active ? ' active' : '');
      btn.dataset.tag = tag;
      btn.setAttribute('aria-pressed', String(active));
      btn.innerHTML = `${label}<span class="pub-filter__count">${count}</span>`;
      return btn;
    };
    filtersContainer.appendChild(makeFilter('all', 'All', pubs.length, true));
    tagCounts.forEach((count, tag) => filtersContainer.appendChild(makeFilter(tag, tag, count, false)));

    // Render publication cards
    const frag = document.createDocumentFragment();
    pubs.forEach((pub, i) => {
      const gradientClass = 'pub-thumb--gradient-' + (i % 5);

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
      if (pub.links.dataset) linksHtml += `<a href="${pub.links.dataset}" target="_blank" rel="noopener" class="pub-link">Dataset</a>`;
      if (pub.links.project) linksHtml += `<a href="${pub.links.project}" target="_blank" rel="noopener" class="pub-link">Project</a>`;

      // Venue display
      const venueDisplay = pub.venue
        ? `<span class="pub-venue pub-venue--${pub.venueType}">${pub.venue}</span>`
        : '';

      const card = document.createElement('article');
      card.className = 'pub-card fade-in';
      card.dataset.tags = JSON.stringify(pub.tags);

      // Thumbnail: real image or gradient fallback, linked to the paper.
      // The thumbnail link repeats the title link, so it is hidden from
      // keyboard and screen-reader users to avoid a duplicate stop.
      const mainLink = pub.links.arxiv || pub.links.pdf || pub.links.project || pub.links.code;
      const thumbInner = pub.thumbnail
        ? `<div class="pub-thumb-img"><img src="${pub.thumbnail}" alt="" loading="lazy" decoding="async"></div>`
        : `<div class="pub-thumb ${gradientClass}"><span class="pub-thumb__label">${pub.tags[0] || ''}</span></div>`;
      const thumbHtml = mainLink
        ? `<a class="pub-thumb-link" href="${mainLink}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${thumbInner}</a>`
        : thumbInner;
      const titleHtml = mainLink
        ? `<a href="${mainLink}" target="_blank" rel="noopener">${pub.title}</a>`
        : pub.title;

      card.innerHTML = `
        ${thumbHtml}
        <div class="pub-info">
          ${venueDisplay}
          <h3 class="pub-title">${titleHtml}</h3>
          <p class="pub-authors">${highlightedAuthors}</p>
          <div class="pub-links">
            ${linksHtml}
          </div>
        </div>
      `;

      frag.appendChild(card);
    });
    list.appendChild(frag);
    observeReveal(list);

    // Filter click handler
    filtersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.pub-filter');
      if (!btn) return;
      filtersContainer.querySelectorAll('.pub-filter').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      const tag = btn.dataset.tag;
      let shown = 0;
      list.querySelectorAll('.pub-card').forEach(card => {
        const match = tag === 'all' || JSON.parse(card.dataset.tags).includes(tag);
        card.classList.toggle('hidden', !match);
        if (match) {
          shown++;
          // Cards revealed by a filter appear at once instead of waiting
          // for a scroll-triggered fade.
          card.classList.add('visible');
        }
      });
      if (status) {
        status.textContent = tag === 'all'
          ? `Showing all ${shown} publications`
          : `Showing ${shown} publication${shown === 1 ? '' : 's'} tagged ${tag}`;
      }
    });
  } catch (e) {
    console.error('Failed to load publications:', e);
    list.innerHTML = '<p class="load-error">Publications could not be loaded. Please refresh the page.</p>';
  }
}
