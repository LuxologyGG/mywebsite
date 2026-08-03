/* explore.js — Explore tab: search index, IP tools, Last.fm card, recent interests. */

const SEARCH_PAGES = [
  {
    title: 'Overview',
    path: '/overview',
    desc: 'Quick summary of who I am, what I do, and how to reach me',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    action: () => navigateTo('/overview')
  },
  {
    title: 'Resume',
    path: '/photos/Resume.pdf',
    desc: 'One-page resume (PDF)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    action: () => window.open('/photos/Resume.pdf', '_blank', 'noopener')
  },
  {
    title: 'CV',
    path: '/photos/CV.pdf',
    desc: 'Full academic CV — experience, publications, awards (PDF)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="16" y2="7"/><line x1="9" y1="11" x2="16" y2="11"/></svg>',
    action: () => window.open('/photos/CV.pdf', '_blank', 'noopener')
  },
  {
    title: 'Contact Me',
    path: '/contact',
    desc: 'Get in touch — phone, email, or schedule a chat',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    action: () => navigateTo('/contact')
  },
  {
    title: 'Blog',
    path: '/blog',
    desc: 'Read my thoughts on tech, projects, and life',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    action: () => navigateTo('/blog', true)
  },
  {
    title: 'Paste',
    path: '/paste',
    desc: 'Share code snippets and text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    action: () => navigateTo('/paste', true)
  },
  {
    title: 'Upload',
    path: '/upload',
    desc: 'Temporary Image Hosting',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    action: () => navigateTo('/upload', true)
  },
  {
    title: 'About',
    path: '#about',
    desc: 'Learn more about me and what I do',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    action: () => setActiveWorkTab('#work-about')
  },
  {
    title: 'Experience',
    path: '#experience',
    desc: 'My work history and coding skills',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    action: () => setActiveWorkTab('#work-experience')
  },
  {
    title: 'Projects',
    path: '/projects',
    desc: 'GitHub repos, research, and things I\'ve built',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    action: () => navigateTo('/projects', true)
  },
  {
    title: 'Light Mode',
    path: '#theme',
    desc: 'Switch to light theme',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    action: () => setTheme('light')
  },
  {
    title: 'Dark Mode',
    path: '#theme',
    desc: 'Switch to dark theme',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    action: () => setTheme('dark')
  },
  {
    title: "What's My IP",
    path: '#ip',
    desc: 'Show your public IP address and location info',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    action: () => showIpInfo()
  },
  {
    title: 'IP Lookup',
    path: '#ip-lookup',
    desc: 'Look up info about any IP address',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><circle cx="11" cy="11" r="3"/></svg>',
    action: () => showIpLookup()
  }
];

function abuseScoreColor(score) {
  if (score <= 10) return '#22c55e';
  if (score <= 40) return '#eab308';
  if (score <= 70) return '#f97316';
  return '#ef4444';
}

function abuseScoreLabel(score) {
  if (score <= 10) return 'Clean';
  if (score <= 40) return 'Low Risk';
  if (score <= 70) return 'Moderate Risk';
  return 'High Risk';
}

function renderAbuseSection(abuse) {
  if (!abuse) return '';
  const score = abuse.abuseConfidenceScore ?? 0;
  const color = abuseScoreColor(score);
  const label = abuseScoreLabel(score);
  return `
    <div class="ip-abuse-section">
      <div class="ip-info-row" style="border-bottom:none;padding-bottom:0">
        <span class="ip-label">Safety Score</span>
        <span class="ip-abuse-badge" style="--abuse-color:${color}">
          <span class="ip-abuse-dot" style="background:${color}"></span>
          ${label} (${score}% abuse confidence)
        </span>
      </div>
      <div class="ip-abuse-bar-track">
        <div class="ip-abuse-bar-fill" style="width:${score}%;background:${color}"></div>
      </div>
      ${abuse.totalReports ? `<div class="ip-info-row"><span class="ip-label">Reports</span><span class="ip-value">${abuse.totalReports} report${abuse.totalReports !== 1 ? 's' : ''}</span></div>` : ''}
      ${abuse.isTor ? `<div class="ip-info-row"><span class="ip-label">Tor Exit Node</span><span class="ip-value" style="color:#f97316">Yes</span></div>` : ''}
      ${abuse.usageType ? `<div class="ip-info-row"><span class="ip-label">Usage</span><span class="ip-value">${abuse.usageType}</span></div>` : ''}
      ${abuse.isp ? `<div class="ip-info-row"><span class="ip-label">ISP</span><span class="ip-value">${abuse.isp}</span></div>` : ''}
      ${abuse.domain ? `<div class="ip-info-row"><span class="ip-label">Domain</span><span class="ip-value">${abuse.domain}</span></div>` : ''}
      ${abuse.lastReportedAt ? `<div class="ip-info-row"><span class="ip-label">Last Reported</span><span class="ip-value">${new Date(abuse.lastReportedAt).toLocaleDateString()}</span></div>` : ''}
    </div>
  `;
}

function renderIpDetails(data) {
  return `
    <div class="ip-info-details">
      ${data.city || data.region ? `<div class="ip-info-row"><span class="ip-label">Location</span><span class="ip-value">${[data.city, data.region, data.country].filter(Boolean).join(', ')}</span></div>` : ''}
      ${data.org ? `<div class="ip-info-row"><span class="ip-label">ISP</span><span class="ip-value">${data.org}</span></div>` : ''}
      ${data.timezone ? `<div class="ip-info-row"><span class="ip-label">Timezone</span><span class="ip-value">${data.timezone}</span></div>` : ''}
      ${data.loc ? `<div class="ip-info-row"><span class="ip-label">Coordinates</span><span class="ip-value">${data.loc}</span></div>` : ''}
      ${renderAbuseSection(data.abuse)}
    </div>
  `;
}

function showIpInfo() {
  exploreSubView = 'ip';
  if (typeof destroyIpGlobe === 'function') destroyIpGlobe();
  searchResultsEl.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'ip-info-card glassy';
  card.innerHTML = '<div class="ip-loading">Fetching your IP info...</div>';
  searchResultsEl.appendChild(card);

  fetch(`${location.origin}/api/ip`)
    .then(r => r.json())
    .then(data => {
      card.innerHTML = `
        <div class="ip-info-header">Your Public IP</div>
        <div class="ip-info-address">${data.ip}</div>
        ${data.loc ? '<canvas class="ip-globe" width="400" height="400" aria-hidden="true"></canvas>' : ''}
        ${renderIpDetails(data)}
        <button class="ip-copy-btn glassy" onclick="navigator.clipboard.writeText('${data.ip}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy IP',1500)">Copy IP</button>
      `;
      // Purely decorative, and loaded on demand — never block the card on it.
      if (data.loc && typeof mountIpGlobe === 'function') {
        mountIpGlobe(card.querySelector('.ip-globe'), data.loc);
      }
    })
    .catch(() => {
      card.innerHTML = '<div class="ip-loading">Could not fetch IP info</div>';
    });
}

function showIpLookup() {
  exploreSubView = 'ip-lookup';
  searchResultsEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'ip-info-card glassy';
  wrapper.innerHTML = `
    <div class="ip-info-header">IP Address Lookup</div>
    <div class="ip-lookup-form">
      <input type="text" class="ip-lookup-input glassy" placeholder="Enter an IP address (e.g. 8.8.8.8)" spellcheck="false" autocomplete="off" />
      <button class="ip-lookup-btn glassy">Lookup</button>
    </div>
    <div class="ip-lookup-result"></div>
  `;
  searchResultsEl.appendChild(wrapper);

  const input = wrapper.querySelector('.ip-lookup-input');
  const btn = wrapper.querySelector('.ip-lookup-btn');
  const result = wrapper.querySelector('.ip-lookup-result');

  function doLookup() {
    const ip = input.value.trim();
    if (!ip) return;
    result.innerHTML = '<div class="ip-loading">Looking up...</div>';
    fetch(`${location.origin}/api/ip?ip=${encodeURIComponent(ip)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.city && !data.region && !data.org && !data.abuse) {
          result.innerHTML = '<div class="ip-loading">No info found for this IP</div>';
          return;
        }
        result.innerHTML = `
          <div class="ip-info-address">${data.ip}</div>
          ${renderIpDetails(data)}
        `;
      })
      .catch(() => {
        result.innerHTML = '<div class="ip-loading">Lookup failed</div>';
      });
  }

  btn.addEventListener('click', doLookup);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLookup(); });
  setTimeout(() => input.focus(), 100);
}

function buildSearchUI() {
  if (!searchBuilt) {
    searchBuilt = true;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderSearchResults(searchInput.value.trim().toLowerCase());
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const firstVisible = searchResultsEl.querySelector('.search-result-item:not(.is-hidden)');
          if (firstVisible) firstVisible.click();
        }
      });
    }
  }
  exploreSubView = null;
  renderSearchResults(searchInput ? searchInput.value.trim().toLowerCase() : '');
}

function setLastFmMessage(text) {
  const songEl = document.getElementById('lastfm-song');
  const artistEl = document.getElementById('lastfm-artist');
  const artEl = document.getElementById('lastfm-art');
  const fallbackEl = document.getElementById('lastfm-icon-fallback');
  if (songEl) songEl.textContent = text;
  if (artistEl) artistEl.textContent = '';
  if (artEl) artEl.style.display = 'none';
  if (fallbackEl) fallbackEl.style.display = '';
}

function fetchLastFm() {
  // Show cached data immediately so the card doesn't flash "Loading...",
  // but only if it's still fresh -- otherwise fall through and refetch.
  const isStale = !lastFmData || (Date.now() - lastFmFetchedAt) > LASTFM_REFRESH_MS;
  if (lastFmData) applyLastFmData(lastFmData);
  if (!isStale) return;

  fetch('/api/lastfm')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      lastFmFetchedAt = Date.now();
      if (data.track) {
        lastFmData = data.track;
        applyLastFmData(lastFmData);
        return;
      }
      // The server screens out tracks it won't display. Drop whatever is
      // cached rather than leaving a previously shown track pinned here.
      lastFmData = null;
      setLastFmMessage(data.reason === 'no-clean-track' ? 'Nothing to show' : 'Unavailable');
    })
    .catch(() => {
      if (!lastFmData) setLastFmMessage('Unavailable');
    });

  startLastFmPolling();
}

function startLastFmPolling() {
  if (lastFmPollTimer) return;
  lastFmPollTimer = setInterval(fetchLastFm, LASTFM_REFRESH_MS);
}

function applyLastFmData(track) {
  const songEl = document.getElementById('lastfm-song');
  const artistEl = document.getElementById('lastfm-artist');
  const artEl = document.getElementById('lastfm-art');
  const fallbackEl = document.getElementById('lastfm-icon-fallback');
  const cardEl = document.getElementById('lastfm-card');

  if (songEl && track) {
    if (cardEl && track.url) cardEl.href = track.url;
    songEl.textContent = track.name || 'Unknown Song';
    artistEl.textContent = track.artist?.name || track.artist?.['#text'] || '';

    let cover = null;
    if (Array.isArray(track.image)) {
      // Prefer highest quality image, skip last.fm generic placeholder
      for (const size of ['extralarge', 'large', 'medium', 'small']) {
        const img = track.image.find(i => i.size === size);
        if (img?.['#text'] && !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          cover = img['#text']; break;
        }
      }
    }
    if (cover && artEl) {
      artEl.src = cover;
      artEl.style.display = 'block';
      artEl.style.width = '40px';
      artEl.style.height = '40px';
      artEl.style.borderRadius = '6px';
      artEl.style.objectFit = 'cover';
      if (fallbackEl) fallbackEl.style.display = 'none';
    } else if (artEl) {
      // Otherwise fall back to the note glyph instead of leaving the previous
      // track's cover art in place.
      artEl.style.display = 'none';
      artEl.removeAttribute('src');
      if (fallbackEl) fallbackEl.style.display = '';
    }
  }
}

function updateDiscordInterestCard() {
  const titleEl = document.getElementById('discord-interest-title');
  const subEl = document.getElementById('discord-interest-sub');
  const artEl = document.getElementById('discord-interest-art');
  const labelEl = document.getElementById('discord-interest-label');
  if (!titleEl) return;

  const hasActivities = lastDiscordPresenceData?.activities?.length > 0;

  if (hasActivities) {
    // Currently active — show "Active Now"
    const primary = lastDiscordPresenceData.activities[0];
    const art = primary.assets?.largeImage || primary.assets?.smallImage || discordIdleArt;
    const isMusic = primary.type === '2' || (primary.title || '').toLowerCase().startsWith('listening to') || (primary.name || '').toLowerCase() === 'spotify';

    if (labelEl) labelEl.textContent = 'Active Now';
    if (isMusic) {
      titleEl.textContent = primary.details || primary.name || primary.title || 'Activity';
      subEl.textContent = [primary.state, primary.assets?.largeText].filter(Boolean).join(' · ');
    } else {
      titleEl.textContent = primary.title || primary.name || 'Activity';
      subEl.textContent = [primary.details, primary.state].filter(Boolean).join(' · ') || (lastDiscordPresenceData.customStatus ? lastDiscordPresenceData.customStatus.name : '');
    }
    if (artEl) artEl.src = art;
  } else {
    // Offline / no current activities — show last activity from server
    const lastAct = lastDiscordPresenceData?.lastActivity;
    const lastTime = lastDiscordPresenceData?.lastActivityTime;

    if (lastAct) {
      if (labelEl) labelEl.textContent = 'Last seen ' + (lastTime ? formatLastSeenTime(lastTime) : 'recently');
      titleEl.textContent = lastAct.title || lastAct.name || 'Activity';
      const isMusic = lastAct.type === '2' || (lastAct.title || '').toLowerCase().startsWith('listening to') || (lastAct.name || '').toLowerCase() === 'spotify';
      if (isMusic) {
        titleEl.textContent = lastAct.details || lastAct.name || lastAct.title || 'Activity';
        subEl.textContent = [lastAct.state, lastAct.assets?.largeText].filter(Boolean).join(' · ');
      } else {
        subEl.textContent = [lastAct.details, lastAct.state].filter(Boolean).join(' · ');
      }
      const art = lastAct.assets?.largeImage || lastAct.assets?.smallImage || discordIdleArt;
      if (artEl) artEl.src = art;
    } else {
      if (labelEl) labelEl.textContent = 'Last Activity';
      titleEl.textContent = 'No recent activity';
      subEl.textContent = '';
      if (artEl) artEl.src = discordIdleArt;
    }
  }
}

function renderRecentInterests(container) {
  const section = document.createElement('div');
  section.className = 'recent-interests-section';
  section.innerHTML = `
    <h3 class="recent-interests-title">Recent Interests</h3>
    <div class="recent-interests-grid">
      <a href="https://www.last.fm/user/Camronia" target="_blank" rel="noreferrer" class="interest-card glassy" id="lastfm-card" title="My most-played song on Last.fm">
        <div class="interest-icon">
          <img id="lastfm-art" style="display:none;" alt="Cover" />
          <svg id="lastfm-icon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </div>
        <div class="interest-info">
          <div class="interest-label">Most Played</div>
          <div class="interest-title" id="lastfm-song">Loading...</div>
          <div class="interest-sub" id="lastfm-artist"></div>
        </div>
      </a>
      <div class="interest-card glassy" id="discord-interest-card" title="My last activity">
        <div class="interest-icon">
          <img src="/photos/discord-idle.png" id="discord-interest-art" alt="Activity" />
        </div>
        <div class="interest-info">
          <div class="interest-label" id="discord-interest-label">Last Activity</div>
          <div class="interest-title" id="discord-interest-title">Loading...</div>
          <div class="interest-sub" id="discord-interest-sub"></div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(section);
  fetchLastFm();
  updateDiscordInterestCard();
}

function renderSearchResults(query) {
  searchResultsEl.innerHTML = '';

  if (!query) {
    renderRecentInterests(searchResultsEl);
  }

  const filtered = SEARCH_PAGES.filter(p => {
    if (!query) return true;
    return p.title.toLowerCase().includes(query) ||
           p.path.toLowerCase().includes(query) ||
           p.desc.toLowerCase().includes(query);
  });

  filtered.forEach((page, i) => {
    const item = document.createElement('button');
    item.className = 'search-result-item glassy';
    item.style.animationDelay = (i * 60 + 40) + 'ms';
    item.innerHTML = `
      <div class="search-result-icon">${page.icon}</div>
      <div class="search-result-text">
        <div class="search-result-title">${page.title}</div>
        <div class="search-result-desc">${page.desc}</div>
      </div>
      <span class="search-result-path">${page.path}</span>
      <svg class="search-result-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    item.addEventListener('click', () => page.action());
    searchResultsEl.appendChild(item);
  });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'No results found';
    searchResultsEl.appendChild(empty);
  }
}

// ---- GitHub Activity & Projects (inline expand) ----
