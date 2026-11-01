import json, os, sys, unicodedata, glob, re

src, official_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]

def norm(p):  # compare pinyin ignoring spaces, case and apostrophes
    return re.sub(r"[\s'’·-]", "", p).lower().replace("u:", "ü")

def strip_tones(p):
    return "".join(c for c in unicodedata.normalize("NFD", norm(p)) if unicodedata.category(c) != "Mn")

official, by_level = {}, {}
for lvl_name in ["1", "2", "3", "4", "5", "6", "7-9"]:
    f = os.path.join(official_dir, f"HSK {lvl_name}.tsv")
    for line in open(f, encoding="utf-8"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) >= 3 and parts[1] and parts[2]:
            by_level.setdefault(lvl_name, {}).setdefault(parts[1], parts[2])
            official.setdefault(parts[1], parts[2])
GLOSS_FIX = {"干": "to do; to work", "长": "to grow; chief"}

levels, stats = [], {"exact": 0, "toneless": 0, "official_only": 0, "kept": 0}
changed = []
for lv in range(1, 7):
    rows = []
    for w in json.load(open(os.path.join(src, f"{lv}.json"), encoding="utf-8")):
        h = w["simplified"]
        forms = w["forms"]
        off = by_level.get(str(lv), {}).get(h) or official.get(h)
        pick = None
        if off:
            ex = [f for f in forms if norm(f["transcriptions"]["pinyin"]) == norm(off)]
            lower = [f for f in ex if not f["transcriptions"]["pinyin"][:1].isupper()]
            pick = (lower or ex or [None])[0]
            if pick and off[:1].islower() and pick["transcriptions"]["pinyin"][:1].isupper():
                pick = None  # official reading is lowercase: never take the surname/place entry
            if pick: stats["exact"] += 1
        if not pick and off:
            cands = [f for f in forms if strip_tones(f["transcriptions"]["pinyin"]) == strip_tones(off) and not f["transcriptions"]["pinyin"][:1].isupper()]
            if cands:
                pick = cands[0]; stats["toneless"] += 1
        if not pick:
            # no official match: skip surname/variant readings
            bad = re.compile(r"^(surname|variant of|old variant|see |used in|\(onom|euphemistic|archaic)", re.I)
            good = [f for f in forms if not f["transcriptions"]["pinyin"][:1].isupper() and not (f.get("meanings") and bad.search(f["meanings"][0]))]
            pick = (good or forms)[0]; stats["kept"] += 1
        py = pick["transcriptions"]["pinyin"]
        if off and norm(py) != norm(off):
            # rebuild spaced pinyin from the official reading when the dataset has no matching form
            syl = py.split()
            # split official reading using the dataset's syllable lengths (same letters, different tones)
            if strip_tones(py) == strip_tones(off) and len(norm(off)) == len(norm(py).replace(" ", "")):
                o = norm(off); i = 0; outs = []
                for s in syl:
                    n = len(norm(s)); outs.append(o[i:i+n]); i += n
                py = " ".join(outs); stats["official_only"] += 1
        bad = re.compile(r"^(surname|variant of|old variant|see |used in|\(onom|euphemistic|archaic|abbr\.)", re.I)
        meanings = [m for m in (pick.get("meanings") or []) if not bad.search(m)] or (pick.get("meanings") or [""])
        parts = [p.strip() for p in meanings[0].split(";") if p.strip()]
        if len(parts) < 2 and len(meanings) > 1:
            parts.append(meanings[1].split(";")[0].strip())
        gloss = "; ".join(parts[:2])
        if len(gloss) > 60:
            gloss = gloss[:57].rstrip() + "…"
        old = forms[0]["transcriptions"]["pinyin"]
        if norm(old) != norm(py):
            changed.append((h, old, py))
        if GLOSS_FIX.get(h): gloss = GLOSS_FIX[h]
        rows.append([h, py, gloss])
    levels.append(rows)

json.dump(levels, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(stats, "official entries:", len(official))
print(len(changed), "readings corrected, e.g.:")
for c in changed[:40]:
    print("  ", c)
