# HSK & HSKK Studio

English-language prep site for the HSK and HSKK. A static site: no server, no running costs.

## Files

| File | What it is |
|---|---|
| `public/index.html` | The whole site (levels, vocabulary, tones, HSKK mock tasks, recording practice) |
| `public/progress.js` | Saves progress, review words, mistakes and mock-test history in the learner's browser |
| `public/features.js` | Tone trainer, listening practice, progress page and HSKK mock test |
| `public/vocab.json` | HSK 3.0 levels 1–6 word list: `[level][i] = [hanzi, pinyin, English]` |
| `wrangler.jsonc` | Cloudflare Workers config: serves the `public/` folder as a static site |
| `functions/api/score.js` | Optional: paid detailed scoring through Azure. Not used unless you switch it on. |

## Features

- **Vocabulary**: all HSK 3.0 levels 1–6, search, mark words as known or add them to a review list.
- **Tone trainer**: single tones, tone pairs (with tone changes) and “which word did you hear?”, with a list of your most common mix-ups.
- **Listening practice**: original short dialogues, conversations and passages for HSK 1–6, multiple choice, transcript and English explanations.
- **HSKK mock test**: Beginner / Intermediate / Advanced, with preparation time, prompts played once, automatic recording against a countdown, playback and history.
- **My progress**: words known per level, accuracy, practice time, day streak and a mistake book. Stored in localStorage and IndexedDB on the learner's device; no account.

## How Record & score works (free, unlimited)

Everything runs on the learner's own phone or computer:

1. The browser records the learner and converts the audio to 16 kHz.
2. **Tone check**: the page tracks the pitch of the voice, splits it into syllables and classifies each one as 1st, 2nd, 3rd or 4th tone. It compares this with the expected spoken tones, including tone changes (你好 → ní hǎo, 一个 → yí gè, 不对 → bú duì) and neutral tones. Each syllable shows the learner's own pitch curve, green if right and red if wrong.
3. **Recognition check**: in browsers with built-in speech recognition (Chrome, Edge), it also shows which characters were understood.

Nothing is uploaded, so there is no per-use cost for you and no limit for learners.
Tone checks cover words up to six characters; longer HSKK sentences get the recognition check only.
Accuracy improves after a learner's first few recordings, because the page learns their voice range (stored only in their browser).

## Deploy (free)

The repository is connected to a Cloudflare Worker named `hsk-studio`. Every push to `main` rebuilds and redeploys automatically
(`npx wrangler deploy`, using `wrangler.jsonc`). Microphone access needs HTTPS, which Cloudflare Pages provides automatically.

## Optional: detailed AI scoring later

If you later want accuracy / fluency scores for paying members:

1. Create an Azure Speech resource and copy its key and region.
2. In Cloudflare Pages → Settings → Variables and Secrets add `AZURE_SPEECH_KEY` (Secret) and `AZURE_SPEECH_REGION`.
3. In `index.html` change `const SCORE_ENABLED=false;` to `true` and redeploy.

On Azure's free tier, usage stops when the monthly free hours run out instead of being billed.

## Data credits

Word list from [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT licence), which compiles the HSK 3.0 syllabus; English definitions from CC-CEDICT (CC BY-SA 4.0). Keep this credit on the site.

The official syllabus counts 5,456 entries for levels 1–6. This file has 5,363 because repeated entries for the same word are merged into one card.
