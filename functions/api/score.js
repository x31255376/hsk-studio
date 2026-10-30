// Cloudflare Pages Function: POST /api/score?ref=<reference text>
// Body: 16 kHz mono PCM WAV recorded in the browser.
// Forwards the audio to Azure Speech pronunciation assessment and returns a compact score.
//
// Required environment variables (Cloudflare Pages → Settings → Variables and Secrets):
//   AZURE_SPEECH_KEY     your Azure Speech resource key (store as a Secret)
//   AZURE_SPEECH_REGION  the resource region, e.g. eastasia, southeastasia, eastus

const MAX_AUDIO_BYTES = 1_200_000; // about 35 s of 16 kHz mono audio
const MAX_REF_CHARS = 300;

export async function onRequestPost({ request, env }) {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    return json({ error: "Scoring is not configured on this site." }, 503);
  }

  const ref = (new URL(request.url).searchParams.get("ref") || "").trim();
  if (!ref || ref.length > MAX_REF_CHARS) {
    return json({ error: "Missing or too long reference text." }, 400);
  }

  const audio = await request.arrayBuffer();
  if (audio.byteLength < 1000) return json({ error: "Recording is empty." }, 400);
  if (audio.byteLength > MAX_AUDIO_BYTES) return json({ error: "Recording is too long." }, 413);

  const config = {
    ReferenceText: ref,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: true,
  };
  const configHeader = toBase64(JSON.stringify(config));

  const endpoint =
    `https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com` +
    `/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN&format=detailed`;

  let azure;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": configHeader,
        Accept: "application/json",
      },
      body: audio,
    });
    if (!res.ok) return json({ error: `Speech service returned ${res.status}.` }, 502);
    azure = await res.json();
  } catch (e) {
    return json({ error: "Could not reach the speech service." }, 502);
  }

  const best = azure.NBest && azure.NBest[0];
  if (azure.RecognitionStatus !== "Success" || !best) {
    return json({ error: "No speech recognized.", status: azure.RecognitionStatus }, 422);
  }

  // Scores may sit on the NBest entry directly or under PronunciationAssessment.
  const pa = best.PronunciationAssessment || best;
  return json({
    heard: azure.DisplayText || best.Display || "",
    overall: pa.PronScore ?? null,
    accuracy: pa.AccuracyScore ?? null,
    fluency: pa.FluencyScore ?? null,
    completeness: pa.CompletenessScore ?? null,
    prosody: pa.ProsodyScore ?? null,
    words: (best.Words || []).map((w) => {
      const wpa = w.PronunciationAssessment || w;
      return { word: w.Word, accuracy: wpa.AccuracyScore ?? null, error: wpa.ErrorType || "None" };
    }),
  });
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
