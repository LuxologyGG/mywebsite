import { handlePresence } from '../src/routes/presence.js';
import { handleLastFm } from '../src/routes/lastfm.js';

const cors = {};
const ctx = { waitUntil: (p) => p };
const req = (m = 'GET') => new Request('https://camr.one/api/x', { method: m });

function makeKV(initial = null) {
  let store = initial;
  return {
    get: async () => store,
    put: async (_k, v) => { store = v; },
    delete: async () => { store = null; },
    _peek: () => store,
  };
}

let fail = 0;
const check = (name, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) fail++; };

// ---------- presence: live profane Spotify track ----------
global.fetch = async () => new Response(JSON.stringify({
  success: true,
  data: {
    discord_user: { id: '1', username: 'camronic', discriminator: '0' },
    discord_status: 'online',
    listening_to_spotify: true,
    spotify: { song: 'Fuck Love', artist: 'XXXTENTACION', album: 'A', album_art_url: 'x', timestamps: {} },
    activities: [],
  },
}), { status: 200 });

let kv = makeKV();
let body = await (await handlePresence(req(), { UNIQUE_KV: kv }, ctx, cors)).json();
check('profane live track is not shown', body.activities.length === 0);
check('profane track is not written to KV', kv._peek() === null);

// ---------- presence: clean live track ----------
global.fetch = async () => new Response(JSON.stringify({
  success: true,
  data: {
    discord_user: { id: '1', username: 'camronic', discriminator: '0' },
    discord_status: 'online',
    listening_to_spotify: true,
    spotify: { song: 'ALLES DOPE', artist: 'Cro', album: 'A', album_art_url: 'x', timestamps: {} },
    activities: [],
  },
}), { status: 200 });

kv = makeKV();
body = await (await handlePresence(req(), { UNIQUE_KV: kv }, ctx, cors)).json();
check('clean live track is shown', body.activities[0]?.details === 'ALLES DOPE');
check('clean track is persisted to KV', JSON.parse(kv._peek()).activity.details === 'ALLES DOPE');

// ---------- presence: offline, KV holds a previously-stored profane track ----------
global.fetch = async () => new Response(JSON.stringify({
  success: true,
  data: { discord_user: { id: '1', username: 'camronic', discriminator: '0' }, discord_status: 'offline', activities: [] },
}), { status: 200 });

kv = makeKV(JSON.stringify({ activity: { name: 'Spotify', title: 'Listening to Spotify', details: 'Fuck Love', state: 'XXXTENTACION' }, time: Date.now() }));
body = await (await handlePresence(req(), { UNIQUE_KV: kv }, ctx, cors)).json();
check('stale profane KV entry is not served', body.lastActivity === null);
check('stale profane KV entry is purged', kv._peek() === null);

// ---------- presence: offline, KV holds a clean but very old entry ----------
kv = makeKV(JSON.stringify({ activity: { name: 'Moonlight', title: 'Playing Moonlight' }, time: Date.now() - 30 * 864e5 }));
body = await (await handlePresence(req(), { UNIQUE_KV: kv }, ctx, cors)).json();
check('30-day-old "last seen" is not claimed as recent', body.lastActivity === null);

// ---------- presence: offline, KV holds a clean recent entry ----------
kv = makeKV(JSON.stringify({ activity: { name: 'Moonlight', title: 'Playing Moonlight' }, time: Date.now() - 3600e3 }));
body = await (await handlePresence(req(), { UNIQUE_KV: kv }, ctx, cors)).json();
check('recent clean "last seen" is served', body.lastActivity?.title === 'Playing Moonlight');

// ---------- lastfm: every 7day track profane -> falls through, never serves a profane one ----------
const top = (names) => ({ toptracks: { track: names.map(n => ({ name: n, artist: { name: 'A' } })) } });
global.fetch = async (url) => {
  if (url.includes('period=7day'))   return new Response(JSON.stringify(top(['Fuck Love', 'Bitch Better Have My Money'])), { status: 200 });
  if (url.includes('period=1month')) return new Response(JSON.stringify(top(['Sh1t Happens'])), { status: 200 });
  if (url.includes('period=overall'))return new Response(JSON.stringify(top(['Fuck Love', 'ALLES DOPE'])), { status: 200 });
  return new Response(JSON.stringify({}), { status: 200 });
};
body = await (await handleLastFm(req(), { LASTFM_API_KEY: 'k' }, cors)).json();
check('lastfm skips profane and lands on a clean track', body.track?.name === 'ALLES DOPE');

// ---------- lastfm: nothing clean anywhere -> no track, no profane fallback ----------
global.fetch = async () => new Response(JSON.stringify(top(['Fuck Love'])), { status: 200 });
body = await (await handleLastFm(req(), { LASTFM_API_KEY: 'k' }, cors)).json();
check('lastfm returns null rather than a profane fallback', body.track === null && body.reason === 'no-clean-track');

console.log(fail === 0 ? '\nPASS — all API cases' : `\nFAIL — ${fail} case(s)`);
process.exit(fail ? 1 : 0);
