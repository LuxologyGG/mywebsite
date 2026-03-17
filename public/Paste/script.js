(function () {
  console.log("[PasteApp] script loaded");

  const BACKEND_ORIGIN =
    window.PASTE_BACKEND_URL ||
    ((location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "http://localhost:3000"
      : location.origin);

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

    const response = await fetch(backendUrl(path), {
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
  }

  function setStatus(text) {
    if (state.els?.status) state.els.status.textContent = text;
  }

  function showCopyFeedback(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    }
  }

  function applyPaste(paste, mode = "view") {
    if (!state.els) return;
    const id = paste?.id || paste?._id || null;
    state.currentId = id;
    state.els.content.value = paste?.content || "";
    state.els.content.readOnly = mode === "view";
    state.els.save.disabled = mode === "view";
    state.els.copy.disabled = !id;
    setStatus(mode === "view" ? `Saved paste · ${formatDate(paste?.createdAt)}` : "Draft");
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
      state.els.content.value = "";
      state.els.content.readOnly = true;
      setStatus(error.message || "Could not load paste");
    }
  }

  async function savePaste() {
    console.log("[PasteApp] savePaste called");
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
      if (!id) {
        throw new Error("Backend did not return a paste ID.");
      }

      console.log("[PasteApp] saved with id:", id);
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
      showCopyFeedback("Paste link copied");
    } catch {
      setStatus("Could not copy link");
    }
  }

  async function ensureTemplate() {
    if (!state.root) return;

    // If DOM was cleared (navigated away and back), re-init
    if (state.initialized && state.root.querySelector("[data-paste-content]")) {
      return;
    }

    console.log("[PasteApp] loading template...");
    const response = await fetch("/paste/index.html", { cache: "no-store" });
    state.root.innerHTML = await response.text();

    state.els = {
      content: state.root.querySelector("[data-paste-content]"),
      save: state.root.querySelector("[data-paste-save]"),
      copy: state.root.querySelector("[data-paste-copy]"),
      status: state.root.querySelector("[data-paste-status]"),
    };

    if (!state.els.content || !state.els.save || !state.els.copy) {
      console.error("[PasteApp] template missing elements", state.els);
      return;
    }

    state.els.save.addEventListener("click", savePaste);
    state.els.copy.addEventListener("click", copyLink);

    state.initialized = true;
    console.log("[PasteApp] template mounted");
  }

  async function open(path, push = false) {
    console.log("[PasteApp] open:", path);
    await ensureTemplate();
    if (!state.els) return;

    if (push) {
      history.pushState({}, "", path);
    }

    const pasteId = routeToPasteId(path);
    if (pasteId) {
      await loadPaste(pasteId);
      return;
    }

    resetEditor();
  }

  window.PasteApp = {
    async init(root) {
      console.log("[PasteApp] init called");
      state.root = root;
      await ensureTemplate();
    },
    async open(path, push = false) {
      console.log("[PasteApp] open called:", path);
      await open(path, push);
    },
  };
})();
