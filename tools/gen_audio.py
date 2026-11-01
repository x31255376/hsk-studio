#!/usr/bin/env python3
"""Generate natural neural-voice clips for every text in tools/texts.json with Azure Speech.

Output: public/audio/<fnv64("<speaker>|<text>")>.mp3  (same hash as public/audio.js)
Existing files are skipped, so the script can be stopped and resumed at any time.

Environment:
  AZURE_SPEECH_KEY, AZURE_SPEECH_REGION   required
  REQUESTS_PER_MINUTE   default 18 (the free F0 tier allows 20 per minute)
  MAX_MINUTES           stop after this long (default 330, inside GitHub's 6-hour job limit)
  COMMIT_EVERY          if set, git-commit and push after this many new clips (used by the workflow)
  VOICE_W, VOICE_M      voices for the woman/narrator and the man
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTS = os.path.join(ROOT, "tools", "texts.json")
OVERRIDES = os.path.join(ROOT, "tools", "overrides.json")
OUT = os.path.join(ROOT, "public", "audio")

KEY = os.environ.get("AZURE_SPEECH_KEY", "").strip()
REGION = os.environ.get("AZURE_SPEECH_REGION", "").strip()
RPM = float(os.environ.get("REQUESTS_PER_MINUTE", "18"))
MAX_MIN = float(os.environ.get("MAX_MINUTES", "330"))
COMMIT_EVERY = int(os.environ.get("COMMIT_EVERY", "0") or 0)
VOICES = {"W": os.environ.get("VOICE_W", "zh-CN-XiaoxiaoNeural"), "M": os.environ.get("VOICE_M", "zh-CN-YunxiNeural")}

def fnv64(s):
    h = 0xcbf29ce484222325
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return f"{h:016x}"

def ssml(item, use_phoneme=True):
    text = escape(item["t"])
    if use_phoneme and item.get("ph"):
        # pin the reading of a single character (pinyin with tone numbers, 5 = neutral)
        text = f'<phoneme alphabet="sapi" ph="{escape(item["ph"])}">{text}</phoneme>'
    rate = "-8%" if item.get("kind") in ("word", "word1") else "0%"
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">'
            f'<voice name="{VOICES.get(item["s"], VOICES["W"])}"><prosody rate="{rate}">{text}</prosody></voice></speak>')

def synth(body):
    req = urllib.request.Request(
        f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=body.encode("utf-8"), method="POST",
        headers={"Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "hsk-studio-audio"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def git_commit(n):
    subprocess.run(["git", "add", "public/audio"], cwd=ROOT, check=True)
    if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
        return
    subprocess.run(["git", "commit", "-q", "-m", f"Add {n} generated audio clips"], cwd=ROOT, check=True)
    for _ in range(3):
        if subprocess.run(["git", "push", "-q"], cwd=ROOT).returncode == 0:
            return
        subprocess.run(["git", "pull", "-q", "--rebase"], cwd=ROOT)
    print("warning: push failed; clips stay committed locally", file=sys.stderr)

def main():
    if not KEY or not REGION:
        sys.exit("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.")
    items = json.load(open(TEXTS, encoding="utf-8"))
    if os.path.exists(OVERRIDES):
        ov = json.load(open(OVERRIDES, encoding="utf-8"))  # {"<text>": "<ph>"} manual reading fixes
        for it in items:
            if it["t"] in ov:
                it["ph"] = ov[it["t"]]
    os.makedirs(OUT, exist_ok=True)
    todo = [it for it in items if not os.path.exists(os.path.join(OUT, fnv64(f'{it["s"]}|{it["t"]}') + ".mp3"))]
    print(f"{len(items)} texts, {len(items) - len(todo)} already done, {len(todo)} to generate")
    gap, start, made, since_commit, no_phoneme = 60.0 / RPM, time.time(), 0, 0, []
    for i, it in enumerate(todo):
        if (time.time() - start) / 60 > MAX_MIN:
            print(f"time limit reached; run again to continue ({len(todo) - i} left)")
            break
        path = os.path.join(OUT, fnv64(f'{it["s"]}|{it["t"]}') + ".mp3")
        use_ph, tries = True, 0
        while True:
            t0 = time.time()
            try:
                data = synth(ssml(it, use_ph))
                break
            except urllib.error.HTTPError as e:
                tries += 1
                if e.code == 400 and use_ph and it.get("ph"):
                    use_ph = False  # phoneme rejected: fall back to plain text and note it for review
                    no_phoneme.append(it["t"])
                    continue
                if e.code in (429, 500, 502, 503) and tries < 8:
                    wait = float(e.headers.get("Retry-After") or min(60, 5 * tries))
                    print(f"  {e.code}, waiting {wait:.0f}s")
                    time.sleep(wait)
                    continue
                if e.code in (401, 403):
                    sys.exit(f"Azure rejected the key or region ({e.code}). Check the repository secrets.")
                print(f"  skip {it['t']!r}: HTTP {e.code}", file=sys.stderr)
                data = None
                break
            except Exception as e:
                tries += 1
                if tries < 5:
                    time.sleep(5 * tries)
                    continue
                print(f"  skip {it['t']!r}: {e}", file=sys.stderr)
                data = None
                break
        if data:
            with open(path, "wb") as f:
                f.write(data)
            made += 1
            since_commit += 1
        if made and made % 100 == 0:
            print(f"  {made} new clips ({i + 1}/{len(todo)})")
        if COMMIT_EVERY and since_commit >= COMMIT_EVERY:
            git_commit(since_commit)
            since_commit = 0
        time.sleep(max(0.0, gap - (time.time() - t0)))
    if COMMIT_EVERY and since_commit:
        git_commit(since_commit)
    print(f"done: {made} new clips")
    if no_phoneme:
        print(f"{len(no_phoneme)} single characters were read without a pinned reading: {' '.join(no_phoneme[:50])}")

if __name__ == "__main__":
    main()
