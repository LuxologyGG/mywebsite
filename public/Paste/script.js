(function () {
  console.log("[PasteApp] script loaded");

const BACKEND_ORIGIN =
  window.PASTE_BACKEND_URL ||
  (location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://camron-paste-api.onrender.com");

  console.log("[PasteApp] backend origin:", BACKEND_ORIGIN);

  const state = {
    root: null,
    currentId: null,
    initialized: false,
    els: null,
  };

  function routeToPasteId(path) {
    const match = /^\/paste\/([A-Fa-f0-9_-]+)$/.exec(path || "");
    return match ? match[1] : null;
  }

  function backendUrl(path) {
    return `${String(BACKEND_ORIGIN).replace(/\/$/, "")}${path}`;
  }

  function formatDate(value) {
    if (!value) return "Not saved yet";
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
  console.log("[PasteApp] api call:", options.method || "GET", path);

  const url = backendUrl(path);

  for (let i = 0; i < 2; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        ...options,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Request failed");
      }

      return data;
    } catch (err) {
      if (i === 1) throw err;

      console.log("[PasteApp] retrying...");
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

  function setStatus(text) {
    if (state.els?.status) state.els.status.textContent = text;
  }

  function applyPaste(paste, mode = "view") {
    if (!state.els) return;
    const id = paste?.id || paste?._id || null;
    state.currentId = id;

    state.els.content.value = paste?.content || "";
    state.els.content.readOnly = mode === "view";
    state.els.save.disabled = mode === "view";
    state.els.copy.disabled = !id;

    setStatus(
      mode === "view"
        ? `Saved paste · ${formatDate(paste?.createdAt)}`
        : "Draft"
    );
  }

  function resetEditor() {
    if (!state.els) return;

    state.currentId = null;
    state.els.content.value = "";
    state.els.content.readOnly = false;
    state.els.save.disabled = false;
    state.els.copy.disabled = true;

    setStatus("Draft");
  }

  async function loadPaste(id) {
    console.log("[PasteApp] loadPaste:", id);
    setStatus("Loading...");

    try {
      const data = await api(`/paste/${id}`, { method: "GET" });
      applyPaste(data, "view");
    } catch (error) {
      console.error("[PasteApp] loadPaste error:", error);
      resetEditor();
      setStatus(error.message || "Could not load paste");
    }
  }

  async function savePaste() {
    if (!state.els) return;

    const content = state.els.content.value;
    if (!content.trim()) {
      setStatus("Add some text first");
      state.els.content.focus();
      return;
    }

    setStatus("Saving...");

    try {
      const data = await api("/paste", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      const id = data?.id;
      if (!id) throw new Error("No ID returned");

      history.replaceState({}, "", `/paste/${id}`);
      await loadPaste(id);

      setStatus("Saved");
    } catch (error) {
      console.error("[PasteApp] savePaste error:", error);
      setStatus(error.message || "Could not save paste");
    }
  }

  async function copyLink() {
    if (!state.currentId) return;

    const url = `${location.origin}/paste/${state.currentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch {
      setStatus("Copy failed");
    }
  }

  function ensureTemplate() {
    if (!state.root) return;

    state.els = {
      content: state.root.querySelector("[data-paste-content]"),
      save: state.root.querySelector("[data-paste-save]"),
      copy: state.root.querySelector("[data-paste-copy]"),
      status: state.root.querySelector("[data-paste-status]"),
    };

    if (!state.els.content || !state.els.save || !state.els.copy) {
      console.error("[PasteApp] missing elements", state.els);
      return;
    }

    if (!state.initialized) {
      state.els.save.addEventListener("click", savePaste);
      state.els.copy.addEventListener("click", copyLink);
      state.initialized = true;
    }
  }

  async function open(path) {
    ensureTemplate();
    if (!state.els) return;

    const pasteId = routeToPasteId(path);

    if (pasteId) {
      await loadPaste(pasteId);
    } else {
      resetEditor();
    }
  }

  window.PasteApp = {
    async init(root) {
      state.root = root;
      ensureTemplate();
    },
    async open(path) {
      await open(path);
    },
  };
})();

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("#paste-root");
  if (!root) return;

  await window.PasteApp.init(root);
  await window.PasteApp.open(location.pathname); // THIS LINE
});

window.addEventListener("popstate", () => {
  if (window.PasteApp) {
    window.PasteApp.open(location.pathname);
  }
});