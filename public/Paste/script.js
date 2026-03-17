(function () {
  const API_ROOT = "/api/pastes";
  const state = {
    root: null,
    currentId: null,
    currentExpiry: "1w",
    initialized: false,
    els: null,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function routeToPasteId(path) {
    const match = /^\/paste\/([A-Za-z0-9_-]+)$/.exec(path || "");
    return match ? match[1] : null;
  }

  function formatDate(value) {
    if (!value) return "Never";
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "Unknown";
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || "Request failed");
    }
    return data;
  }

  async function ensureTemplate() {
    if (!state.root || state.initialized) return;
    const response = await fetch("/Paste/index.html", { cache: "no-store" });
    state.root.innerHTML = await response.text();
    state.els = {
      title: state.root.querySelector("[data-paste-title]"),
      content: state.root.querySelector("[data-paste-content]"),
      expiry: state.root.querySelector("[data-paste-expiry]"),
      save: state.root.querySelector("[data-paste-save]"),
      copy: state.root.querySelector("[data-paste-copy]"),
      fresh: state.root.querySelector("[data-paste-new]"),
      status: state.root.querySelector("[data-paste-status]"),
      link: state.root.querySelector("[data-paste-link]"),
      updated: state.root.querySelector("[data-paste-updated]"),
      expires: state.root.querySelector("[data-paste-expires]"),
      ownedList: state.root.querySelector("[data-paste-owned-list]"),
    };

    state.els.save.addEventListener("click", savePaste);
    state.els.copy.addEventListener("click", copyLink);
    state.els.fresh.addEventListener("click", () => open("/paste", true));
    state.els.expiry.addEventListener("change", () => {
      state.currentExpiry = state.els.expiry.value;
    });

    state.initialized = true;
  }

  function setStatus(text) {
    if (state.els?.status) state.els.status.textContent = text;
  }

  function setLink(url) {
    if (!state.els) return;
    state.els.link.textContent = url || "Not saved yet";
    state.els.copy.disabled = !url;
  }

  function applyPaste(paste, editable) {
    if (!state.els) return;
    state.currentId = paste?.id || null;
    state.currentExpiry = paste?.expiryOption || "1w";
    state.els.title.value = paste?.title || "";
    state.els.content.value = paste?.content || "";
    state.els.expiry.value = state.currentExpiry;
    state.els.content.readOnly = editable === false;
    state.els.title.readOnly = editable === false;
    state.els.expiry.disabled = editable === false;
    state.els.save.disabled = editable === false;
    setStatus(editable === false ? "Read only" : (state.currentId ? "Saved" : "Draft"));
    setLink(state.currentId ? `${location.origin}/paste/${state.currentId}` : "");
    state.els.updated.textContent = paste?.updatedAt ? formatDate(paste.updatedAt) : "Not saved yet";
    state.els.expires.textContent = paste?.expiresAt ? formatDate(paste.expiresAt) : "Never";
  }

  function newDraft() {
    state.currentId = null;
    state.currentExpiry = "1w";
    if (!state.els) return;
    state.els.title.value = "";
    state.els.content.value = "";
    state.els.expiry.value = state.currentExpiry;
    state.els.content.readOnly = false;
    state.els.title.readOnly = false;
    state.els.expiry.disabled = false;
    state.els.save.disabled = false;
    setStatus("Draft");
    setLink("");
    state.els.updated.textContent = "Not saved yet";
    state.els.expires.textContent = "Not saved yet";
  }

  async function loadOwnedPastes() {
    if (!state.els?.ownedList) return;
    try {
      const data = await api(`${API_ROOT}/mine`, { method: "GET" });
      const items = Array.isArray(data?.pastes) ? data.pastes : [];
      if (!items.length) {
        state.els.ownedList.innerHTML = '<div class="paste-owned-empty">No saved pastes yet.</div>';
        return;
      }

      state.els.ownedList.innerHTML = items.map((item) => `
        <div class="paste-owned-item">
          <a class="paste-owned-link" href="/paste/${escapeHtml(item.id)}">
            <span class="paste-owned-title">${escapeHtml(item.title || "Untitled paste")}</span>
            <span class="paste-owned-meta">Updated ${escapeHtml(formatDate(item.updatedAt))}${item.expiresAt ? ` · Expires ${escapeHtml(formatDate(item.expiresAt))}` : " · Never expires"}</span>
          </a>
          <button class="paste-button paste-owned-open" type="button" data-paste-open="${escapeHtml(item.id)}">Open</button>
        </div>
      `).join("");

      state.els.ownedList.querySelectorAll("[data-paste-open]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-paste-open");
          if (!id) return;
          open(`/paste/${id}`, true);
        });
      });
    } catch {
      state.els.ownedList.innerHTML = '<div class="paste-owned-empty">Could not load your pastes.</div>';
    }
  }

  async function loadPaste(id) {
    setStatus("Loading...");
    const data = await api(`${API_ROOT}/${id}`, { method: "GET" });
    applyPaste(data.paste, data.editable);
  }

  async function savePaste() {
    if (!state.els) return;
    const payload = {
      title: state.els.title.value.trim(),
      content: state.els.content.value,
      expiresIn: state.els.expiry.value,
    };

    if (!payload.content.trim()) {
      setStatus("Add some text first");
      state.els.content.focus();
      return;
    }

    setStatus("Saving...");
    try {
      const data = await api(
        state.currentId ? `${API_ROOT}/${state.currentId}` : API_ROOT,
        {
          method: state.currentId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      applyPaste(data.paste, true);
      state.currentExpiry = payload.expiresIn;
      history.replaceState({}, "", `/paste/${data.paste.id}`);
      await loadOwnedPastes();
    } catch (error) {
      setStatus(error.message || "Could not save");
    }
  }

  async function copyLink() {
    if (!state.currentId) return;
    const url = `${location.origin}/paste/${state.currentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch {
      setStatus("Could not copy");
    }
  }

  async function open(path, push = false) {
    await ensureTemplate();
    if (!state.els) return;

    if (push) {
      history.pushState({}, "", path);
    }

    const pasteId = routeToPasteId(path);
    if (pasteId) {
      await loadPaste(pasteId);
    } else {
      newDraft();
    }
    await loadOwnedPastes();
  }

  window.PasteApp = {
    async init(root) {
      state.root = root;
      await ensureTemplate();
    },
    async open(path, push = false) {
      await open(path, push);
    },
  };
})();
