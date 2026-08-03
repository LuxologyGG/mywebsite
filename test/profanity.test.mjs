import { containsProfanity, isCleanTrack, isCleanActivity } from '../src/lib/profanity.js';

const dirty = ['Fuck Love', 'FUCK LOVE', 'fuck love', 'Sh1t Happens', 'B!tch Better Have My Money',
               'f*ck love', 'Motherfucker', 'Bitches Broken Hearts', 'F U C K', 'Fuckin Problems'];
const clean = ['ALLES DOPE', 'Scunthorpe', 'Dickinson', 'Cocktail Hour', 'Passenger', 'Classic',
               'Shiitake Dreams', 'Hello', 'Blink-182', 'Cockpit', 'Grass', 'Assassin'];

let fail = 0;
for (const t of dirty) if (!containsProfanity(t)) { console.log('MISS (should flag):', t); fail++; }
for (const t of clean) if (containsProfanity(t))  { console.log('FALSE POSITIVE:', t); fail++; }

// track + activity shapes
if (isCleanTrack({ name: 'Fuck Love', artist: { name: 'XXX' } })) { console.log('track leak'); fail++; }
if (!isCleanTrack({ name: 'ALLES DOPE', artist: { name: 'Cro' } })) { console.log('track over-filter'); fail++; }
if (isCleanActivity({ name: 'Spotify', title: 'Listening to Spotify', details: 'Fuck Love', state: 'XXXTENTACION' })) { console.log('activity leak'); fail++; }
if (!isCleanActivity({ name: 'Spotify', title: 'Listening to Spotify', details: 'ALLES DOPE', state: 'Cro' })) { console.log('activity over-filter'); fail++; }
if (isCleanActivity({ name: 'Moonlight', state: 'Streaming Shit Big Picture' })) { console.log('game activity leak'); fail++; }

console.log(fail === 0 ? `PASS — ${dirty.length + clean.length + 5} cases` : `FAIL — ${fail} problem(s)`);
