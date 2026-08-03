/* app.js — Utilities, bootstrap, work-card interactions, and blog loading. */

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function isoDay() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchUniqueCount() {
  const page = location.pathname && location.pathname.startsWith('/') ? location.pathname : '/';
  const day = isoDay();
  const key = `unique_view_sent_${day}_${page}`;
  const usePost = !sessionStorage.getItem(key);
  const url = `${uniqueApi}?page=${encodeURIComponent(page)}`;
  const method = usePost ? 'POST' : 'GET';
  try {
    const res = await fetch(url, { method });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (data && Number.isFinite(data.uniqueAllTime)) {
      if (usePost) sessionStorage.setItem(key, '1');
      return `This website has been viewed ${data.uniqueAllTime} unique times.`;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function initDaysSince() {
  const el = document.getElementById('days-since-current-role');
  if (!el) return;
  const start = Date.UTC(2026, 0, 1); // Jan 1, 2026 — Homa founded (months 0-indexed)
  const now = Date.now();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  el.textContent = days >= 0 ? days : 0;
}

function runHeroIntroEffects() {
  if (waveEmojiEl) {
    waveEmojiEl.classList.add('is-waving');
    setTimeout(() => waveEmojiEl.classList.remove('is-waving'), 1200);
  }

  if (!aboutTypewriterEl || aboutTypewriterRan) return;
  const message = aboutTypewriterEl.dataset.text || 'I like science, skiing, and cooking.';
  aboutTypewriterEl.textContent = '';

  let i = 0;
  const tick = () => {
    if (i <= message.length) {
      aboutTypewriterEl.textContent = message.slice(0, i);
      i += 1;
      setTimeout(tick, 30);
      return;
    }
  };

  aboutTypewriterRan = true;
  tick();
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initThemeToggle();
  initWorkCard();
  initDaysSince();
  initExperienceDetails();
  if (
    location.pathname === '/blog' ||
    location.pathname.startsWith('/blog/') ||
    location.pathname === '/paste' ||
    location.pathname.startsWith('/paste/') ||
    location.pathname === '/upload' ||
    location.pathname === '/projects'
  ) {
    await navigateTo(location.pathname, false);
  } else {
    enterWorkMode({ initial: true });
    setTimeout(runHeroIntroEffects, 100);
  }

  // If redirected from /blog entry page, auto-open blog view and push state
  if (sessionStorage.getItem('goto-blog') === '1') {
    sessionStorage.removeItem('goto-blog');
    navigateTo('/blog', true);
  }

  // Hide preloader
  const preloader = document.getElementById('site-preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('is-hidden');
      preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
    }, 400);
  }
});

// ------- Work card toggle -------
function setActiveWorkTab(target) {
  const tabButtons = document.querySelectorAll('.work-tab');
  const sections = document.querySelectorAll('.work-section');
  const isExperience = target === '#work-experience';
  const isSearch = target === '#work-search';
  tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.getAttribute('data-target') === target));
  document.body.classList.toggle('experience-active', isExperience);
  document.body.classList.toggle('search-active', isSearch);
  sections.forEach((section) => section.classList.toggle('is-active', `#${section.id}` === target));
  if (window._graphPaperSetMode) {
    window._graphPaperSetMode(isSearch ? 'map' : isExperience ? 'topo' : 'grid');
  }
  if (isExperience) {
    buildHorizontalTimeline();
  }
  if (isSearch) {
    buildSearchUI();
    if (searchInput) setTimeout(() => searchInput.focus(), 100);
  }
}

function enterWorkMode(opts = {}) {
  exitOverlay();
  if (opts.initial) {
    document.body.classList.add('work-initializing');
  }
  const activeWorkTab = document.querySelector('.work-tab.is-active');
  const target = opts.target || (activeWorkTab ? activeWorkTab.getAttribute('data-target') : '#work-about');
  setActiveWorkTab(target);
  document.body.classList.add('work-mode');
  startDiscordPresence();
  if (opts.initial) {
    requestAnimationFrame(() => {
      document.body.classList.remove('work-initializing');
      document.body.classList.add('work-fade-in');
      setTimeout(() => document.body.classList.remove('work-fade-in'), 320);
    });
  }
}

function enterBlogMode() {
  exitOverlay(true);
  document.body.classList.add('blog-mode');
  loadBlogCards();
  loadBlogDiscordStatus();
  if (window._graphPaperSetMode) window._graphPaperSetMode('wavy');
}

// Smooth card morph between modes
let morphCleanup = null;

/**
 * FLIP the glass card between two layouts.
 *
 * The card centres itself with its own CSS transform (translateX(-50%), plus a
 * vertical offset in some modes). A naive FLIP writes over that transform, so
 * the card jumped sideways by half its width for the length of the animation
 * and snapped back at the end. The base translate is therefore read off the
 * computed style and carried through every keyframe, including the final one.
 */
function morphCard(applyNewMode) {
  const card = document.querySelector('.glass-card');
  if (!card) { applyNewMode(); return; }

  // First: where the card is right now, mid-animation included, so interrupting
  // a morph continues from what's on screen instead of snapping.
  const first = card.getBoundingClientRect();

  // Finish any morph still running before measuring the new layout.
  if (morphCleanup) morphCleanup();
  card.style.transition = 'none';
  card.style.transform = '';
  card.style.transformOrigin = '';

  applyNewMode();

  // Last: the settled geometry of the new layout, base transform included.
  const last = card.getBoundingClientRect();

  // The card's own centring transform, in pixels. Scaling about the top-left
  // corner leaves that corner fixed, so the base offset can just ride along as
  // a plain translate rather than composing awkwardly with a percentage.
  const base = new DOMMatrixReadOnly(getComputedStyle(card).transform);
  const tx = base.m41;
  const ty = base.m42;

  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sw = last.width ? first.width / last.width : 1;
  const sh = last.height ? first.height / last.height : 1;

  const settled = `translate(${tx}px, ${ty}px)`;

  // Nothing moved — don't arm a transition that will never fire.
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 &&
      Math.abs(sw - 1) < 0.005 && Math.abs(sh - 1) < 0.005) {
    card.style.transition = '';
    return;
  }

  card.style.transformOrigin = 'top left';
  card.style.transform = `translate(${dx + tx}px, ${dy + ty}px) scale(${sw}, ${sh})`;

  // Flush the inverted state; without this the browser coalesces it with the
  // line below and the card lands on its mark with no animation at all.
  void card.offsetWidth;

  card.style.transition = 'transform 650ms cubic-bezier(0.25, 0.8, 0.25, 1)';
  card.style.transform = settled;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    card.removeEventListener('transitionend', onEnd);
    card.style.transition = '';
    card.style.transform = '';
    card.style.transformOrigin = '';
    morphCleanup = null;
  };
  function onEnd(e) {
    if (e.propertyName !== 'transform') return;
    finish();
  }
  card.addEventListener('transitionend', onEnd);
  // transitionend never fires if the transition is interrupted or dropped, and
  // leaving the inline transition set breaks the next morph.
  const timer = setTimeout(finish, 800);
  morphCleanup = finish;
}

// Every body-level mode class the views toggle. Kept in one place so leaving an
// overlay always clears all of them — 'not-found-mode' used to be missed, which
// left the 404 panel stacked over the home view after navigating back.
const OVERLAY_MODE_CLASSES = [
  'work-mode', 'blog-mode', 'paste-active', 'upload-active', 'experience-active',
  'search-active', 'contact-mode', 'overview-mode', 'not-found-mode',
];

function exitOverlay(skipBgReset) {
  document.body.classList.remove(...OVERLAY_MODE_CLASSES);
  if (typeof destroyIpGlobe === 'function') destroyIpGlobe();
  if (overviewScene) overviewScene.stop();
  stopDiscordPresence();
  if (!skipBgReset && window._graphPaperSetMode) window._graphPaperSetMode('grid');
}

function initWorkCard() {
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.body.classList.contains('paste-active') || document.body.classList.contains('upload-active') || document.body.classList.contains('blog-mode') || document.body.classList.contains('contact-mode') || document.body.classList.contains('overview-mode') || document.body.classList.contains('not-found-mode')) {
        navigateTo('/', true);
        return;
      }
      // If in an explore sub-view (IP, projects, etc.), go back to explore list
      if (document.body.classList.contains('search-active') && exploreSubView) {
        const wasProjects = exploreSubView === 'projects';
        if (location.pathname === '/projects') {
          history.pushState({}, '', '/');
        }
        buildSearchUI();
        if (wasProjects && window._graphPaperSetMode) window._graphPaperSetMode('map');
        if (searchInput) setTimeout(() => searchInput.focus(), 100);
        return;
      }
      if (document.body.classList.contains('experience-active') || document.body.classList.contains('search-active')) {
        setActiveWorkTab('#work-about');
        return;
      }
      exitOverlay();
    });
  }

  const tabButtons = document.querySelectorAll('.work-tab');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;
      setActiveWorkTab(target);
    });
  });

  // Hide tabs when user scrolls content down, show when near top
  const workSectionsEl = document.querySelector('.work-sections');
  const workTabsEl = document.querySelector('.work-tabs');
  if (workSectionsEl && workTabsEl) {
    let tabsHidden = false;
    workSectionsEl.addEventListener('scroll', () => {
      const scrolled = workSectionsEl.scrollTop > 40;
      if (scrolled && !tabsHidden) {
        tabsHidden = true;
        workTabsEl.classList.add('is-hidden');
      } else if (!scrolled && tabsHidden) {
        tabsHidden = false;
        workTabsEl.classList.remove('is-hidden');
      }
    });
  }

  if (emailChip && navigator.clipboard) {
    emailChip.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('camron@camr.one');
        showToast();
      } catch (err) {
        showToast('Unable to copy');
      }
    });
  }
}

// ── "What's this?" map info hover ──
(function initMapWhatsThis() {
  const container = document.getElementById('map-whats-this');
  const areaEl = document.getElementById('map-whats-this-area');
  if (!container || !areaEl) return;
  let populated = false;

  function populateArea() {
    if (populated) return;
    populated = true;
    try {
      const stored = sessionStorage.getItem('map-area');
      if (stored) { areaEl.textContent = stored; return; }
    } catch {}
    fetch('/api/ip')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const area = [d.city, d.region, d.country].filter(Boolean).join(', ');
        areaEl.textContent = area || 'your area';
        try { sessionStorage.setItem('map-area', area); } catch {}
      })
      .catch(() => { areaEl.textContent = 'your area'; });
  }

  container.addEventListener('mouseenter', populateArea);
})();

window.showToast = showToast;
function showToast(message = 'Copied to clipboard') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// Load blog cards into the glass card
async function loadBlogCards() {
  if (blogLoaded) return;

  const publications = [
    {
      title: 'Living Machines: Algae-Based Biohybrid Microrobots',
      href: 'https://www.authorea.com/users/955969/articles/1376990-living-machines-the-potential-of-abbms-for-precision-oncology',
      image: '/photos/Featured-Volbot.webp'
    },
    {
      title: 'BPDCN with Systemic Mastocytosis',
      href: 'https://orcid.org/0009-0007-9651-9681',
      image: '/photos/13000_2023_1301_Fig3_HTML.webp'
    }
  ];

  const articles = [
    {
      title: 'A Heideggerian Reading of Clavicular',
      desc: 'An interpretation revealing the tension between authentic self-creation and conformity to shared aesthetic norms.',
      date: 'Mar 2026'
    },
  ];

  // Render articles
  if (blogGrid) {
    blogGrid.innerHTML = '';
    articles.forEach((a, i) => {
      const card = document.createElement('div');
      card.className = 'article-card glassy';
      card.style.animationDelay = (i * 80) + 'ms';
      card.innerHTML = `
        <div class="article-date">${a.date}</div>
        <div class="article-title">${a.title}</div>
        <div class="article-desc">${a.desc}</div>
      `;
      blogGrid.appendChild(card);
    });
  }

  // Render publications
  if (pubGrid) {
    pubGrid.innerHTML = '';
    publications.forEach((pub) => {
      const card = pub.href
        ? document.createElement('a')
        : document.createElement('div');
      card.className = 'blog-card pub-card' + (pub.href ? '' : ' disabled');
      if (pub.href) {
        card.href = pub.href;
        card.target = '_blank';
        card.rel = 'noreferrer';
      }
      const img = document.createElement('img');
      img.src = pub.image;
      img.alt = pub.title;
      card.appendChild(img);
      const overlay = document.createElement('div');
      overlay.className = 'blog-overlay';
      overlay.textContent = pub.title;
      card.appendChild(overlay);
      pubGrid.appendChild(card);
    });
  }

  blogLoaded = true;
}

async function loadBlogDiscordStatus() {
  const dot = document.getElementById('blog-status-dot');
  const custom = document.getElementById('blog-status-custom');
  if (!dot || !custom) return;

  try {
    const res = await fetch(`${location.origin}/api/presence`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const status = data.status || 'offline';
    dot.className = 'blog-status-dot status-' + status;
    const statusText = data.customStatus?.name
      || (data.activities?.[0]?.title || discordStatusLabel[status] || status);
    custom.textContent = statusText;
  } catch {
    dot.className = 'blog-status-dot status-offline';
    custom.textContent = 'Offline';
  }
}

function initExperienceDetails() {
  // No-op: tech stack logos are now static, no category toggles needed
}
