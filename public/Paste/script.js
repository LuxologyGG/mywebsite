(function () {
  const BACKEND = window.PASTE_BACKEND_URL ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://camron-paste-api.onrender.com');

  let root = null;
  let els = null;
  let currentId = null;
  let bound = false;

  function parseId(path) {
    const m = /^\/paste\/([A-Fa-f0-9]+)$/.exec(path || '');
    return m ? m[1] : null;
  }

  async function apiFetch(path, opts = {}) {
    const url = BACKEND.replace(/\/$/, '') + path;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
          ...opts,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Request failed');
        return data;
      } catch (err) {
        if (attempt === 1) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  function formatDate(v) {
    if (!v) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      }).format(new Date(v));
    } catch { return ''; }
  }

  function status(text) {
    if (els?.status) els.status.textContent = text;
  }

  function showView(paste) {
    if (!els) return;
    currentId = paste?.id || null;
    els.content.value = paste?.content || '';
    els.content.readOnly = true;
    els.save.disabled = true;
    els.copy.disabled = !currentId;
    status(paste?.createdAt ? `Saved · ${formatDate(paste.createdAt)}` : 'Saved');
  }

  function showEditor() {
    if (!els) return;
    currentId = null;
    els.content.value = '';
    els.content.readOnly = false;
    els.save.disabled = false;
    els.copy.disabled = true;
    status('Draft');
  }

  async function load(id) {
    status('Loading...');
    try {
      const data = await apiFetch(`/paste/${id}`);
      showView(data);
    } catch (err) {
      status(err.message || 'Could not load paste');
    }
  }

  async function save() {
    if (!els) return;
    const content = els.content.value;
    if (!content.trim()) { status('Add some text first'); return; }

    status('Saving...');
    try {
      const data = await apiFetch('/paste', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (!data?.id) throw new Error('No ID returned');
      history.replaceState({}, '', `/paste/${data.id}`);
      await load(data.id);
    } catch (err) {
      status(err.message || 'Could not save');
    }
  }

  async function copy() {
    if (!currentId) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/paste/${currentId}`);
      status('Link copied');
      if (typeof window.showToast === 'function') window.showToast('Paste link copied');
    } catch { status('Copy failed'); }
  }

  function bind() {
    if (!root) return;
    els = {
      content: root.querySelector('[data-paste-content]'),
      save: root.querySelector('[data-paste-save]'),
      copy: root.querySelector('[data-paste-copy]'),
      status: root.querySelector('[data-paste-status]'),
    };
    if (!els.content || !els.save) { els = null; return; }
    if (!bound) {
      els.save.addEventListener('click', save);
      els.copy.addEventListener('click', copy);
      bound = true;
    }
  }

  async function open(path) {
    bind();
    if (!els) return;
    const id = parseId(path);
    if (id) { await load(id); } else { showEditor(); }
  }

  window.PasteApp = {
    async init(el) { root = el; bind(); },
    async open(path) { await open(path); },
  };
})();
