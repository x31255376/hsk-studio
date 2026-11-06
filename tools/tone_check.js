// Checks the tone of every generated single-character clip against its pinyin, using the site's own tone analyser.
// Usage: node tools/tone_check.js  (needs ffmpeg). Writes tools/tone_report.md and prints a summary.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
global.toneOf = py => { const m = { 1: /[āēīōūǖ]/, 2: /[áéíóúǘ]/, 3: /[ǎěǐǒǔǚ]/, 4: /[àèìòùǜ]/ }; for (const k in m) if (m[k].test(py)) return +k; return 0; };
const T = require('../public/tone.js');
const ROOT = path.join(__dirname, '..');
function fnv64(s) { let h = 0xcbf29ce484222325n; for (const b of Buffer.from(s, 'utf8')) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } return h.toString(16).padStart(16, '0'); }
const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/texts.json'), 'utf8')).filter(x => x.kind === 'word1' && x.py && toneOf(x.py));
const NAMES = ['?', '1st', '2nd', '3rd', '4th'];
// decode every clip once, then learn the voice's pitch range from all of them (as the site does for a learner)
const decoded = [];
for (const it of items) {
  const f = path.join(ROOT, 'public/audio', fnv64(`${it.s}|${it.t}`) + '.mp3');
  if (!fs.existsSync(f)) continue;
  try { const buf = execFileSync('ffmpeg', ['-v', 'quiet', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 26 }); decoded.push({ it, pcm: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) }); } catch (e) { }
}
const allF0 = [];
for (const d of decoded) for (const v of T.smoothPitch(T.trackPitch(d.pcm))) if (v) allF0.push(v);
allF0.sort((a, b) => a - b);
const base = allF0.length ? { lo: allF0[Math.floor(allF0.length * 0.05)], hi: allF0[Math.floor(allF0.length * 0.95)] } : null;
let checked = 0, ok = 0; const bad = [];
for (const { it, pcm } of decoded) {
  const r = T.analyseTones(pcm, 1, base); checked++;
  const want = toneOf(it.py), got = r ? r.syllables[0].tone : 0;
  // an isolated 3rd tone is often a low fall; accept 3 for 3, and flag everything else
  if (got === want) ok++; else bad.push({ t: it.t, py: it.py, want, got });
}
const lines = [`# Tone check of single-character clips`, ``, `${checked} clips checked, ${ok} matched the expected tone, ${bad.length} to listen to.` + (base ? ` Voice range used: ${Math.round(base.lo)}–${Math.round(base.hi)} Hz.` : ''), ``,
  `The analyser can misjudge isolated syllables, so treat these as a listening list, not a verdict. To fix a reading, add it to tools/overrides.json, e.g. {"行": "xing 2"}, delete that clip and run the workflow again.`, ``,
  `| Character | Pinyin | Expected | Heard | Clip |`, `|---|---|---|---|---|`,
  ...bad.map(b => `| ${b.t} | ${b.py} | ${NAMES[b.want]} | ${NAMES[b.got] || 'unclear'} | public/audio/${fnv64('W|' + b.t)}.mp3 |`)];
fs.writeFileSync(path.join(ROOT, 'tools/tone_report.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 3).join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
