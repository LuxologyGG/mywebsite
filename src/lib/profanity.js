/**
 * Shared profanity screening.
 *
 * Everything user-visible that comes from an outside music/presence feed runs
 * through here: Last.fm top tracks, live Discord activity, and the "last seen"
 * activity we persist to KV. The site is read by admissions officers and
 * research supervisors, so a crude song title should never surface.
 */

// Roots with a low false-positive risk are matched with a trailing \w* so
// conjugations (fucking, shitty, bitches, faggots...) are caught too.
const STEMS = [
  "fuck", "motherfucker", "shit", "bitch", "cunt", "asshole", "pussy", "whore",
  "slut", "nigger", "nigga", "faggot", "retard", "twat", "wank", "bastard", "goddamn",
];

// Roots that double as prefixes of everyday words (Dickinson, Cocktail,
// Cockpit...) are matched as whole words only, to avoid false positives.
const WHOLE_WORDS = ["dick", "cock"];

const WORD_REGEX = new RegExp(
  `\\b(?:(?:${STEMS.join("|")})\\w*|(?:${WHOLE_WORDS.join("|")})s?\\b)`,
  "i"
);

// A deliberately small subset used for the "separators stripped" pass below.
// These have no innocent substring collisions worth worrying about, unlike
// e.g. "shit" (Shiitake) or "cunt" (Scunthorpe).
// "cunt" is deliberately absent — stripped of separators it hides inside real
// place names (Scunthorpe). The word-boundary pass still catches it.
const UNAMBIGUOUS = ["fuck", "motherfuck", "bitch", "nigger", "nigga", "faggot"];
const STRIPPED_REGEX = new RegExp(UNAMBIGUOUS.join("|"), "i");

// Common leetspeak / self-censoring substitutions, so "sh1t", "b!tch" and
// "f*ck" are caught alongside the plain spellings.
const LEET = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  "@": "a", "$": "s", "!": "i", "|": "i", "+": "t",
};

function deLeet(text) {
  return text.replace(/[013457@$!|+]/g, (c) => LEET[c] ?? c);
}

/**
 * Collapse a string to bare letters so spaced-out or punctuated spellings
 * ("f u c k", "f.u.c.k", "f*ck") line up with a plain stem.
 *
 * The asterisk is mapped to a vowel-ish filler rather than dropped, since
 * "f*ck" is a censored vowel, not a missing letter.
 */
function stripSeparators(text) {
  return deLeet(text.toLowerCase())
    .replace(/\*/g, "u")
    .replace(/[^a-z]/g, "");
}

export function containsProfanity(text) {
  if (!text) return false;
  const raw = String(text);
  if (WORD_REGEX.test(raw)) return true;
  if (WORD_REGEX.test(deLeet(raw.toLowerCase()))) return true;
  return STRIPPED_REGEX.test(stripSeparators(raw));
}

/** True when a Last.fm track's title and artist are both clean. */
export function isCleanTrack(track) {
  if (!track?.name) return false;
  const artist = track.artist?.name || track.artist?.["#text"] || "";
  return !containsProfanity(track.name) && !containsProfanity(artist);
}

/**
 * True when every visible field of a Discord activity is clean.
 *
 * For a Spotify activity these are the song (details), artist (state) and
 * album (assets.largeText) — exactly the fields the presence card and the
 * "Last Activity" card render.
 */
export function isCleanActivity(activity) {
  if (!activity) return false;
  const fields = [
    activity.name,
    activity.details,
    activity.state,
    activity.title,
    activity.assets?.largeText,
    activity.assets?.smallText,
  ];
  return !fields.some((f) => containsProfanity(f));
}
