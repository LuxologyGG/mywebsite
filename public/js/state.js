/* state.js — Shared DOM handles, endpoints, and mutable app state. */

const ownerTimeZone = 'America/Los_Angeles';
const navPreloader = document.getElementById('nav-preloader');
function showNavPreloader() { if (navPreloader) navPreloader.classList.add('is-visible'); }
function hideNavPreloader() { if (navPreloader) navPreloader.classList.remove('is-visible'); }
const homeView = document.getElementById('home-view');
const blogView = document.getElementById('blog-view');
const pasteSection = document.getElementById('work-paste');
const uploadSection = document.getElementById('work-upload');
const blogPanel = document.getElementById('blog-content');
const blogGrid = document.getElementById('blog-grid');
const pubGrid = document.getElementById('pub-grid');
const glassCard = document.querySelector('.glass-card');
const workContent = document.querySelector('.work-content');
const blogContentBlock = document.querySelector('.blog-content-block');
const backButton = document.querySelector('.back-button');
const profileBadge = document.querySelector('.profile-badge');
const emailChip = document.getElementById('social-email');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('search-input');
const searchResultsEl = document.getElementById('search-results');
const themeToggleInput = document.getElementById('theme-toggle-input');
const discordStatusDot = document.getElementById('discord-status-dot');
const discordStatusText = document.getElementById('discord-status-text');
const discordMain = document.getElementById('discord-main');
const discordSub = document.getElementById('discord-sub');
const discordArtWrap = document.getElementById('discord-art-wrap');
const discordArt = document.getElementById('discord-art');
const discordVinylArt = document.getElementById('discord-vinyl-art');
const discordPresenceCard = document.getElementById('discord-presence-card');
const discordProgressWrap = document.getElementById('discord-progress-wrap');
const discordProgressCurrent = document.getElementById('discord-progress-current');
const discordProgressTotal = document.getElementById('discord-progress-total');
const discordProgressBar = document.getElementById('discord-progress-bar');
const discordVinylMeta = document.getElementById('discord-vinyl-meta');
const discordVinylSong = document.getElementById('discord-vinyl-song');
const discordVinylArtist = document.getElementById('discord-vinyl-artist');
const discordRow = document.getElementById('discord-row');
const waveEmojiEl = document.getElementById('wave-emoji');
const aboutTypewriterEl = document.getElementById('about-typewriter');
const discordIdleArt = '/photos/discord-idle.png';
const uniqueApi = `${location.origin}/api/unique`;
const discordPresenceEndpoints = [
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/presence`,
  'ws://localhost:3000/presence'
];
const discordPresenceApiEndpoints = [
  `${location.origin}/api/presence`,
  'http://localhost:3000/api/presence'
];
const discordStatusLabel = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Not Active'
};
let blogLoaded = false;
let blogChatRan = false;
const chatTyping = document.getElementById('chat-typing');
let discordSocket = null;
let discordReconnectTimer = null;
let discordPollTimer = null;
let discordPresenceEnabled = false;
let discordEndpointIdx = 0;
let discordApiIdx = 0;
let discordHadMessage = false;
let htlBuilt = false;
let searchBuilt = false;
let exploreSubView = null; // null = search list, 'projects' | 'ip' | 'ip-lookup'
let aboutTypewriterRan = false;
let discordProgressTimer = null;
let lastDiscordPresenceData = null;
let lastFmData = null;
let lastFmFetchedAt = 0;
let lastFmPollTimer = null;
const LASTFM_REFRESH_MS = 5 * 60 * 1000;

function formatLastSeenTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// —–– Navigation helpers (fix missing functions) —––
// Site renders inside the glass card. Keep /blog in the URL for sharing and back-button support.
