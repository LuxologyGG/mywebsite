/* presence.js — Discord presence: live socket, polling fallback, and rendering. */

function formatDurationMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clearDiscordProgress() {
  if (discordProgressTimer) {
    clearInterval(discordProgressTimer);
    discordProgressTimer = null;
  }
  if (discordPresenceCard) {
    discordPresenceCard.classList.remove('is-music-expanded');
  }
  if (discordProgressWrap) {
    discordProgressWrap.hidden = true;
  }
  if (discordProgressBar) {
    discordProgressBar.style.width = '0%';
  }
  if (discordProgressCurrent) {
    discordProgressCurrent.textContent = '0:00';
  }
  if (discordProgressTotal) {
    discordProgressTotal.textContent = '0:00';
  }
  if (discordVinylMeta) {
    discordVinylMeta.hidden = true;
  }
  if (discordVinylSong) {
    discordVinylSong.textContent = '';
  }
  if (discordVinylArtist) {
    discordVinylArtist.textContent = '';
  }
}

function renderDiscordMusicProgress(primary, isMusic) {
  clearDiscordProgress();
  if (!primary || !isMusic || !primary.timestamps?.start || !primary.timestamps?.end) return;

  const startMs = new Date(primary.timestamps.start).getTime();
  const endMs = new Date(primary.timestamps.end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;

  const totalMs = endMs - startMs;
  if (discordPresenceCard) {
    discordPresenceCard.classList.add('is-music-expanded');
  }
  if (discordProgressWrap) {
    discordProgressWrap.hidden = false;
  }

  const tick = () => {
    const now = Date.now();
    const elapsedMs = Math.min(Math.max(now - startMs, 0), totalMs);
    const progressPct = (elapsedMs / totalMs) * 100;
    if (discordProgressBar) {
      discordProgressBar.style.width = `${progressPct}%`;
    }
    if (discordProgressCurrent) {
      discordProgressCurrent.textContent = formatDurationMs(elapsedMs);
    }
    if (discordProgressTotal) {
      discordProgressTotal.textContent = formatDurationMs(totalMs);
    }
    if (elapsedMs >= totalMs && discordProgressTimer) {
      clearInterval(discordProgressTimer);
      discordProgressTimer = null;
    }
  };

  tick();
  discordProgressTimer = setInterval(tick, 1000);
}

function setDiscordFallback(message) {
  clearDiscordProgress();
  if (discordRow) discordRow.classList.remove('is-visible');
}

function renderDiscordPresence(data) {
  lastDiscordPresenceData = data;
  if (typeof updateDiscordInterestCard === 'function') updateDiscordInterestCard();

  if (!data) {
    setDiscordFallback('No Discord presence data available.');
    return;
  }

  const status = data.status || 'offline';
  if (discordStatusDot) {
    discordStatusDot.className = `presence-dot status-${status}`;
  }
  if (discordStatusText) {
    discordStatusText.textContent = discordStatusLabel[status] || status;
  }

  const custom = data.customStatus?.name;
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const primary = activities[0] || null;

  if (primary) {
    if (discordRow) discordRow.classList.add('is-visible');
    const title = primary.title || primary.name || 'Activity';
    const detail = [primary.details, primary.state].filter(Boolean).join(' · ');
    const art = primary.assets?.largeImage || primary.assets?.smallImage || null;
    const songName = primary.details || primary.name || title;
    const artistName = primary.state || '';
    const albumName = primary.assets?.largeText || '';
    const isMusic = primary.type === '2'
      || (primary.title || '').toLowerCase().startsWith('listening to')
      || (primary.name || '').toLowerCase() === 'spotify';
    if (isMusic) {
      if (discordMain) discordMain.textContent = songName;
      if (discordSub) discordSub.textContent = [artistName, albumName].filter(Boolean).join('\n');
    } else {
      if (discordMain) discordMain.textContent = title;
      if (discordSub) discordSub.textContent = detail || (custom ? `Custom: ${custom}` : '');
    }
    if (discordArtWrap) {
      discordArtWrap.hidden = false;
      discordArtWrap.classList.toggle('is-vinyl', Boolean(isMusic && art));
    }
    if (discordArt) {
      if (art) {
        discordArt.src = art;
        if (discordVinylArt) discordVinylArt.src = art;
      } else {
        discordArt.src = discordIdleArt;
        if (discordVinylArt) discordVinylArt.src = discordIdleArt;
      }
    }
    if (isMusic) {
      if (discordVinylSong) {
        discordVinylSong.textContent = primary.details || primary.name || '';
      }
      if (discordVinylArtist) {
        discordVinylArtist.textContent = primary.state || '';
      }
      if (discordVinylMeta) {
        discordVinylMeta.hidden = false;
      }
    }
    renderDiscordMusicProgress(primary, isMusic);
    return;
  }

  clearDiscordProgress();
  if (discordRow) discordRow.classList.remove('is-visible');
}

function scheduleDiscordReconnect() {
  if (!discordPresenceEnabled) return;
  clearTimeout(discordReconnectTimer);
  discordReconnectTimer = setTimeout(connectDiscordPresence, 3000);
}

async function fetchDiscordPresence() {
  const endpoint = discordPresenceApiEndpoints[discordApiIdx] || discordPresenceApiEndpoints[0];
  if (!endpoint) return false;
  try {
    const res = await fetch(endpoint, { method: 'GET' });
    if (!res.ok) throw new Error('bad status');
    const payload = await res.json();
    renderDiscordPresence(payload);
    return true;
  } catch (_) {
    discordApiIdx = (discordApiIdx + 1) % discordPresenceApiEndpoints.length;
    return false;
  }
}

function startDiscordPolling() {
  if (!discordPresenceEnabled || discordPollTimer) return;
  discordPollTimer = setInterval(async () => {
    if (!discordPresenceEnabled) return;
    const ok = await fetchDiscordPresence();
    if (!ok && !discordHadMessage) {
      setDiscordFallback('Could not connect to Discord presence service.');
    }
  }, 5000);
}

function stopDiscordPolling() {
  if (discordPollTimer) {
    clearInterval(discordPollTimer);
    discordPollTimer = null;
  }
}

function connectDiscordPresence() {
  if (!discordPresenceEnabled) return;
  const endpoint = discordPresenceEndpoints[discordEndpointIdx] || discordPresenceEndpoints[0];
  if (!endpoint) return;

  if (discordSocket && (discordSocket.readyState === WebSocket.OPEN || discordSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    discordSocket = new WebSocket(endpoint);
  } catch (_) {
    discordEndpointIdx = (discordEndpointIdx + 1) % discordPresenceEndpoints.length;
    scheduleDiscordReconnect();
    return;
  }

  discordSocket.addEventListener('open', () => {
    discordEndpointIdx = 0;
    fetchDiscordPresence();
    startDiscordPolling();
  });

  discordSocket.addEventListener('message', (evt) => {
    try {
      const payload = JSON.parse(evt.data);
      discordHadMessage = true;
      renderDiscordPresence(payload);
    } catch (_) {
      setDiscordFallback('Presence response could not be parsed.');
    }
  });

  discordSocket.addEventListener('close', () => {
    discordSocket = null;
    discordEndpointIdx = (discordEndpointIdx + 1) % discordPresenceEndpoints.length;
    scheduleDiscordReconnect();
  });

  discordSocket.addEventListener('error', () => {
    if (discordSocket) {
      discordSocket.close();
    }
  });
}

function startDiscordPresence() {
  discordPresenceEnabled = true;
  discordHadMessage = false;
  setDiscordFallback('Connecting to Discord presence...');
  fetchDiscordPresence();
  startDiscordPolling();
  connectDiscordPresence();
}

function stopDiscordPresence() {
  discordPresenceEnabled = false;
  clearTimeout(discordReconnectTimer);
  discordReconnectTimer = null;
  stopDiscordPolling();
  clearDiscordProgress();
  if (discordSocket) {
    discordSocket.close();
    discordSocket = null;
  }
}
