/* router.js — View switching, client-side routing, and theme toggling. */

async function ensurePasteView() {
  if (!pasteSection || !window.PasteApp) return;
  await window.PasteApp.init(pasteSection);
}

function ensureUploadView() {
  if (!uploadSection || !window.UploadApp) return;
  window.UploadApp.init(uploadSection);
}

function setActiveView(name = 'home') {
  if (homeView) homeView.classList.toggle('active', name === 'home');
  if (blogView) blogView.classList.toggle('active', name === 'blog');
  const nfView = document.getElementById('not-found-view');
  if (nfView) nfView.classList.toggle('active', name === 'not-found');
}

async function navigateTo(path, push = true) {
  const isBlog = path === '/blog' || (typeof path === 'string' && path.startsWith('/blog/'));
  const isPaste = path === '/paste' || (typeof path === 'string' && path.startsWith('/paste/'));
  const isUpload = path === '/upload';
  const isProjects = path === '/projects';
  const isContact = path === '/contact';
  const isOverview = path === '/overview';
  if (push) history.pushState({}, '', path);

  if (isOverview) {
    morphCard(() => {
      setActiveView('home');
      exitOverlay(true);
      document.body.classList.add('overview-mode');
      showOverview();
    });
  } else if (isContact) {
    morphCard(() => {
      setActiveView('home');
      exitOverlay(true);
      document.body.classList.add('contact-mode');
      showContact();
    });
  } else if (isProjects) {
    morphCard(() => {
      setActiveView('home');
      document.body.classList.remove('blog-mode', 'experience-active', 'paste-active', 'upload-active');
      document.body.classList.add('work-mode', 'search-active');
      setActiveWorkTab('#work-search');
      showProjects();
      if (window._graphPaperSetMode) window._graphPaperSetMode('topomap');
    });
  } else if (isBlog) {
    setActiveView('home');
    if (typeof enterBlogMode === 'function') enterBlogMode();
  } else if (isPaste) {
    setActiveView('home');
    document.body.classList.remove('blog-mode', 'experience-active', 'upload-active');
    document.body.classList.add('work-mode', 'paste-active');
    setActiveWorkTab('#work-paste');
    try {
      await ensurePasteView();
      if (window.PasteApp) await window.PasteApp.open(path);
    } catch (err) {
      console.error('Paste load error:', err);
    }
  } else if (isUpload) {
    setActiveView('home');
    document.body.classList.remove('blog-mode', 'experience-active', 'paste-active');
    document.body.classList.add('work-mode', 'upload-active');
    setActiveWorkTab('#work-upload');
    try {
      ensureUploadView();
      if (window.UploadApp) window.UploadApp.open();
    } catch (err) {
      console.error('Upload load error:', err);
    }
  } else if (path !== '/' && path !== '') {
    // Clear whatever overlay was open first, otherwise the previous view stays
    // layered underneath the 404 panel.
    if (typeof exitOverlay === 'function') exitOverlay(true);
    setActiveView('not-found');
    document.body.classList.add('not-found-mode');
    if (typeof show404 === 'function') show404();
  } else {
    morphCard(() => {
      setActiveView('home');
      if (typeof exitOverlay === 'function') exitOverlay();
      enterWorkMode({ initial: false });
    });
    setTimeout(runHeroIntroEffects, 100);
  }
}

function initNavigation() {
  window.addEventListener('popstate', () => {
    navigateTo(location.pathname, false);
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (a.target === '_blank' || href.match(/\.\w+$/)) return;
    e.preventDefault();
    navigateTo(href, true);
  });
}

function updatePalette(mode = 'dark') {
  if (window._graphPaperSetTheme) window._graphPaperSetTheme(mode);
}

function setTheme(mode) {
  const isLight = mode === 'light';
  document.body.classList.toggle('light-mode', isLight);
  document.documentElement.classList.toggle('dark', !isLight);
  updatePalette(isLight ? 'light' : 'dark');
  if (themeToggleInput) {
    themeToggleInput.checked = !isLight;
  }
}

function initThemeToggle() {
  if (!themeToggleInput) return;

  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialMode = saved === 'light' || saved === 'dark'
    ? saved
    : (document.body.classList.contains('light-mode') ? 'light' : (prefersDark ? 'dark' : 'dark'));

  setTheme(initialMode);

  themeToggleInput.addEventListener('input', () => {
    const nextMode = themeToggleInput.checked ? 'dark' : 'light';
    localStorage.setItem('theme', nextMode);

    const toggleEl = themeToggleInput.closest('.toggle');
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (toggleEl) {
      const rect = toggleEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);

    if (!document.startViewTransition) {
      setTheme(nextMode);
      return;
    }

    document.startViewTransition(() => {
      setTheme(nextMode);
    });
  });
}
