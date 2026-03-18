(function () {
  const BACKEND = window.UPLOAD_BACKEND_URL ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://camrone-image-host.onrender.com');

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  let root = null;
  let els = null;
  let bound = false;
  let lastImageUrl = null;

  function status(text) {
    if (els?.status) els.status.textContent = text;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function reset() {
    lastImageUrl = null;
    if (els.dropzone) els.dropzone.style.display = '';
    if (els.preview) els.preview.classList.remove('has-file');
    if (els.result) els.result.classList.remove('has-result');
    if (els.progress) els.progress.classList.remove('active');
    if (els.copyBtn) { els.copyBtn.disabled = true; els.copyBtn.textContent = 'Copy Link'; }
    if (els.fileInput) els.fileInput.value = '';
    status('Drop an image or click to select');
  }

  function showPreview(file) {
    if (!els.preview || !els.previewImg) return;
    const url = URL.createObjectURL(file);
    els.previewImg.src = url;
    els.previewInfo.textContent = `${file.name} — ${formatSize(file.size)}`;
    els.preview.classList.add('has-file');
    els.dropzone.style.display = 'none';
  }

  async function selectAndUpload(file) {
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      status('Invalid file type. Use PNG, JPG, WEBP, or GIF');
      return;
    }

    if (file.size > MAX_SIZE) {
      status('File too large. Max 10MB');
      return;
    }

    showPreview(file);
    status('Uploading...');
    els.copyBtn.disabled = true;
    els.progress.classList.add('active');
    els.progressFill.style.width = '30%';

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${BACKEND}/files`, {
        method: 'POST',
        body: form,
      });

      els.progressFill.style.width = '90%';

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      els.progressFill.style.width = '100%';
      lastImageUrl = data.imageUrl;

      // Show result
      els.imageUrl.textContent = data.imageUrl;
      els.deleteUrl.textContent = data.deletionUrl;
      els.result.classList.add('has-result');
      els.progress.classList.remove('active');

      // Enable copy button
      els.copyBtn.disabled = false;

      status('Uploaded — expires in 1 hour');

      // Auto-copy
      try {
        await navigator.clipboard.writeText(data.imageUrl);
        status('Uploaded — link copied to clipboard');
        els.copyBtn.textContent = 'Copied!';
        setTimeout(() => { els.copyBtn.textContent = 'Copy Link'; }, 2000);
        if (typeof window.showToast === 'function') window.showToast('Image URL copied');
      } catch {}
    } catch (err) {
      status(err.message || 'Upload failed');
      els.progress.classList.remove('active');
    }
  }

  function copyLink() {
    if (!lastImageUrl) return;
    navigator.clipboard.writeText(lastImageUrl).then(() => {
      els.copyBtn.textContent = 'Copied!';
      setTimeout(() => { els.copyBtn.textContent = 'Copy Link'; }, 2000);
      if (typeof window.showToast === 'function') window.showToast('Image URL copied');
    }).catch(() => {});
  }

  function copyUrl(el) {
    const text = el?.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window.showToast === 'function') window.showToast('Copied to clipboard');
    }).catch(() => {});
  }

  function bind() {
    if (!root) return;
    els = {
      status: root.querySelector('[data-upload-status]'),
      dropzone: root.querySelector('[data-upload-dropzone]'),
      fileInput: root.querySelector('[data-upload-input]'),
      preview: root.querySelector('[data-upload-preview]'),
      previewImg: root.querySelector('[data-upload-preview-img]'),
      previewInfo: root.querySelector('[data-upload-preview-info]'),
      copyBtn: root.querySelector('[data-upload-copylink]'),
      resetBtn: root.querySelector('[data-upload-reset]'),
      result: root.querySelector('[data-upload-result]'),
      imageUrl: root.querySelector('[data-upload-image-url]'),
      deleteUrl: root.querySelector('[data-upload-delete-url]'),
      copyImageBtn: root.querySelector('[data-upload-copy-image]'),
      copyDeleteBtn: root.querySelector('[data-upload-copy-delete]'),
      progress: root.querySelector('[data-upload-progress]'),
      progressFill: root.querySelector('[data-upload-progress-fill]'),
    };

    if (!els.dropzone || !els.copyBtn) { els = null; return; }

    if (!bound) {
      els.dropzone.addEventListener('click', () => els.fileInput.click());

      els.fileInput.addEventListener('change', () => {
        if (els.fileInput.files[0]) selectAndUpload(els.fileInput.files[0]);
      });

      els.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropzone.classList.add('drag-over');
      });
      els.dropzone.addEventListener('dragleave', () => {
        els.dropzone.classList.remove('drag-over');
      });
      els.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) selectAndUpload(e.dataTransfer.files[0]);
      });

      document.addEventListener('paste', (e) => {
        if (!root.closest('.work-section.is-active')) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            selectAndUpload(item.getAsFile());
            break;
          }
        }
      });

      els.copyBtn.addEventListener('click', copyLink);
      els.resetBtn.addEventListener('click', reset);
      els.copyImageBtn.addEventListener('click', () => copyUrl(els.imageUrl));
      els.copyDeleteBtn.addEventListener('click', () => copyUrl(els.deleteUrl));

      bound = true;
    }
  }

  function open() {
    bind();
    if (!els) return;
    reset();
  }

  window.UploadApp = {
    init(el) { root = el; bind(); },
    open() { open(); },
  };
})();
