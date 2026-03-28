// ElevenLabs TTS service — interrupt-on-new design for navigation
// No SDK dependency, plain fetch to REST API

export const VOICE_PRESETS = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "Brat",    description: "Sassy, confident attitude" },
  { id: "piTKgcLEGmPE4e6mEKli", name: "Nicole",  description: "Calm, professional navigator" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Warm, friendly guide" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria",    description: "Clear, articulate narrator" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River",   description: "Smooth, relaxed tone" },
];

export const DEFAULT_VOICE_ID = VOICE_PRESETS[0].id;

let _currentAudio = null;
let _currentAbort = null;
let _warnedOnce = false;

function getApiKey() {
  return import.meta.env.VITE_ELEVENLABS_KEY || "";
}

export async function speak(text, voiceId = DEFAULT_VOICE_ID) {
  const key = getApiKey();
  if (!key) {
    if (!_warnedOnce) {
      console.warn("[TTS] VITE_ELEVENLABS_KEY not set — voice navigation disabled");
      _warnedOnce = true;
    }
    return;
  }

  // Interrupt any in-progress speech
  if (_currentAbort) _currentAbort.abort();
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }

  const abort = new AbortController();
  _currentAbort = abort;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: abort.signal,
      }
    );

    if (!res.ok) {
      console.error("[TTS] API error:", res.status);
      return;
    }

    const blob = await res.blob();
    if (abort.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (_currentAudio === audio) _currentAudio = null;
    };

    await audio.play();
  } catch (e) {
    if (e.name !== "AbortError") console.error("[TTS] speak failed:", e);
  }
}

export function stopSpeaking() {
  if (_currentAbort) _currentAbort.abort();
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }
}
