/* config.js — Backend endpoints for the paste and upload tools. */

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

window.PASTE_BACKEND_URL = IS_LOCAL
  ? 'http://localhost:3000'
  : 'https://camron-paste-api.onrender.com';

window.UPLOAD_BACKEND_URL = IS_LOCAL
  ? 'http://localhost:3001'
  : 'https://camrone-image-host.onrender.com';
