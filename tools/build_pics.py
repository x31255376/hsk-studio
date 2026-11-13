"""Builds public/pics.js (picture questions) and copies the Twemoji images they use into public/img/e/.

Input:  tools/adv/pictures.txt, tools/adv/scenes.txt
Images: Twemoji 15 SVGs (graphics CC-BY 4.0, https://github.com/jdecked/twemoji), from the npm package @twemoji/svg.
Run:    python3 tools/build_pics.py /path/to/twemoji/svg/folder
"""
import json, os, random, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/twe/pkg/package')
OUT_IMG = os.path.join(ROOT, 'public', 'img', 'e')
rnd = random.Random(20261114)
errs = []

def lines(name):
    with open(os.path.join(ROOT, 'tools', 'adv', name), encoding='utf-8') as f:
        return [l.rstrip('\n') for l in f if l.strip() and not l.startswith('#')]

def emoji_file(e):
    cps = [f'{ord(c):x}' for c in e]
    if '200d' not in cps:
        cps = [c for c in cps if c != 'fe0f']
    for cand in ('-'.join(cps), '-'.join(c for c in cps if c != 'fe0f')):
        if os.path.exists(os.path.join(SRC, cand + '.svg')):
            return cand + '.svg'
    errs.append(f'no Twemoji image for {e} ({"-".join(cps)})')
    return None

# word list: hanzi -> (pinyin, level)
vocab = json.load(open(os.path.join(ROOT, 'public', 'vocab.json'), encoding='utf-8'))
V = {}
for lvl, words in enumerate(vocab, 1):
    for h, py, en in words:
        V.setdefault(h, (py, lvl))
from pypinyin import pinyin, Style
def py_of(w):
    if w in V:
        return V[w][0], V[w][1]
    return ' '.join(x[0] for x in pinyin(w, style=Style.TONE)), 7  # 7 = not in the HSK 1–6 list

used = set()
def imgs(es):
    out = []
    for e in es:
        f = emoji_file(e)
        if f:
            used.add(f); out.append(f)
    return out

concepts = []
for i, l in enumerate(lines('pictures.txt')):
    p = [x.strip() for x in l.split('|')]
    if len(p) != 6:
        errs.append(f'pictures.txt:{i+1} needs 6 fields'); continue
    e, w, s, w4, m4, en = p
    if w4 not in m4: errs.append(f'pictures.txt:{i+1} model sentence does not use {w4}')
    py, lvl = py_of(w); py4, _ = py_of(w4)
    concepts.append(dict(e=e, img=imgs([e]), w=w, py=py, lvl=lvl, s=s, w4=w4, py4=py4, m4=m4, en=en))

scenes = []
for i, l in enumerate(lines('scenes.txt')):
    p = [x.strip() for x in l.split('|')]
    if len(p) != 3:
        errs.append(f'scenes.txt:{i+1} needs 3 fields'); continue
    es, en, model = p
    n = len([c for c in model if '一' <= c <= '鿿'])
    if n < 70: errs.append(f'scenes.txt:{i+1} model only {n} characters')
    scenes.append(dict(img=imgs(es.split()), en=en, model=model, n=n))

# pictures that could both fit one sentence must never be offered together
CONFLICT = ['🚲🚴', '🌸💐', '🧘⚽🏀🏊🏃🚴💃', '🍕🍜🍚🥟🥗🍞🍳🍎🍉🍌🍰🎂🍦🥮🐟', '☕🍵🥛🥤🍷🍺🧊', '🍰🎂🍦🥮',
            '🧑‍💻💻', '👨‍🍳🍳', '🌧️☂️', '😴🛏️⏰', '🤒💊🏥👩‍⚕️', '🛫✈️', '🎤🎵🎸🎹💃', '🌙🥮⭐', '🧧🏮🎆',
            '📝✏️📖🎒', '👫💑', '🚿🪥', '🧥🎩👕', '🏖️⛰️', '🛒💰', '☀️🕶️', '👴👵', '😊😭😡', '🏫👨‍🏫🎓', '🚗🚕🚦']
def conflicts(a, b):
    if a['w'] == b['w']:
        return True
    return any(a['e'] in g and b['e'] in g for g in CONFLICT)

def others(c, k):
    pool = [x for x in concepts if x is not c and not conflicts(c, x)]
    pick = []
    for x in rnd.sample(pool, len(pool)):
        if all(not conflicts(x, y) for y in pick):
            pick.append(x)
        if len(pick) == k:
            break
    return pick

listen, picjudge, picmatch = [], [], []
for c in concepts:
    # HSK 1 listening part 1: hear a word, is it the picture?
    true = rnd.random() < 0.5
    heard = c if true else others(c, 1)[0]
    listen.append(dict(lvl=1, type='Picture: true or false', lines=[['W', heard['w']]],
        qs=[dict(q='看图，判断对错。', qEn='Does the picture match the word you hear?', pic=c['img'], opts=['对', '错'], en=['true', 'false'],
                 ans=0 if true else 1, read=False,
                 why=f'You heard {heard["w"]} ({heard["py"]}, {heard["en"]}); the picture shows {c["w"]} ({c["en"]}).')]))
    # HSK 1 listening part 2: hear a word, choose the picture
    opts = [c] + others(c, 2); rnd.shuffle(opts)
    listen.append(dict(lvl=1, type='Picture choice', lines=[['W', c['w']]],
        qs=[dict(q='选择你听到的图片。', qEn='Choose the picture for the word you hear.', opts=[o['w'] for o in opts], en=[o['en'] for o in opts],
                 optPics=[o['img'] for o in opts], ans=opts.index(c), read=False, why=f'{c["w"]} ({c["py"]}) means {c["en"]}.')]))
    # HSK 2 listening part 1: hear a sentence, is it the picture?
    true = rnd.random() < 0.5
    heard = c if true else others(c, 1)[0]
    listen.append(dict(lvl=2, type='Picture: true or false', lines=[['M' if rnd.random() < .5 else 'W', heard['s']]],
        qs=[dict(q='看图，判断对错。', qEn='Does the picture match the sentence you hear?', pic=c['img'], opts=['对', '错'], en=['true', 'false'],
                 ans=0 if true else 1, read=False,
                 why=f'The sentence is about {heard["w"]} ({heard["en"]}); the picture shows {c["w"]} ({c["en"]}).')]))
    # HSK 3 listening part 1: hear a sentence, choose from six pictures
    opts = [c] + others(c, 5); rnd.shuffle(opts)
    listen.append(dict(lvl=3, type='Picture match', lines=[['W' if rnd.random() < .5 else 'M', c['s']]],
        qs=[dict(q='选择与录音相符的图片。', qEn='Choose the picture that matches what you hear.', opts=[o['w'] for o in opts], en=[o['en'] for o in opts],
                 optPics=[o['img'] for o in opts], ans=opts.index(c), read=False, why=f'The sentence mentions {c["w"]} ({c["py"]}, {c["en"]}).')]))
    # HSK 1 reading part 1: picture + word, true or false
    true = rnd.random() < 0.5
    shown = c if true else others(c, 1)[0]
    picjudge.append(dict(kind='picjudge', pic=c['img'], w=shown['w'], py=shown['py'], ans=0 if true else 1,
        why=f'{shown["w"]} means {shown["en"]}; the picture shows {c["w"]} ({c["en"]}).'))
    # HSK 1–2 reading: match a sentence to a picture
    opts = [c] + others(c, 3); rnd.shuffle(opts)
    picmatch.append(dict(kind='picmatch', text=c['s'], optPics=[o['img'] for o in opts], words=[o['w'] for o in opts],
        en=[o['en'] for o in opts], ans=opts.index(c)))

picsent = [dict(kind='picsent', pic=c['img'], w=c['w4'], py=c['py4'], model=c['m4']) for c in concepts]
picessay = [dict(kind='picessay', pics=s['img'], en=s['en'], model=s['model']) for s in scenes]

missing_py = sorted({c['w'] for c in concepts if c['lvl'] == 7} | {c['w4'] for c in concepts if c['w4'] not in V})
if errs:
    print('\n'.join(errs)); print(f'{len(errs)} problem(s); nothing written.'); sys.exit(1)

os.makedirs(OUT_IMG, exist_ok=True)
for f in os.listdir(OUT_IMG):
    if f not in used: os.remove(os.path.join(OUT_IMG, f))
for f in used:
    shutil.copy(os.path.join(SRC, f), os.path.join(OUT_IMG, f))

data = dict(listen=listen, picjudge=picjudge, picmatch=picmatch, picsent=picsent, picessay=picessay)
with open(os.path.join(ROOT, 'public', 'pics.js'), 'w', encoding='utf-8') as f:
    f.write('/* Generated by tools/build_pics.py. Pictures: Twemoji (CC-BY 4.0). */\nwindow.HSK_PICS=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
lv = {}
for c in concepts: lv[c['lvl']] = lv.get(c['lvl'], 0) + 1
print(f'concepts {len(concepts)} (word levels {dict(sorted(lv.items()))}), scenes {len(scenes)}, images {len(used)}, listening items {len(listen)}')
print('pinyin from pypinyin (check):', ' '.join(f'{w}={py_of(w)[0]}' for w in missing_py))
