# 1) Project overview (one line)

Frontend streams mic audio directly to ElevenLabs Realtime endpoints using short-lived tokens issued by your Vercel backend; ElevenLabs STT → ElevenLabs Agent (with the Gemini summary in KB) → ElevenLabs streaming TTS → frontend playback. Backend persists transcripts & evaluations in Neon; **no audio is stored**.

# 2) High-level architecture

* Frontend (Next.js / React on Vercel)

  * UI, Media capture, ephemeral token request, direct WebSocket/WebRTC to ElevenLabs Realtime.
* Backend (Next.js API routes on Vercel)

  * `/api/session` — create session, call Gemini to summarize resume, create ElevenLabs agent (attach summary + JD + rubric), store session metadata in Neon.
  * `/api/token` — generate short-lived ElevenLabs realtime token for client to connect directly (backend keeps ELEVEN_API_KEY secret).
  * Webhooks (optional) — accept conversation events from ElevenLabs if you want redundant persistence.
* ElevenLabs Realtime (STT + Agents + Streaming TTS)

  * Handles transcripts, agent reasoning, evaluation, streaming TTS and interruption events.
* Gemini (only resume summarization)
* NeonDB (Postgres-compatible) — stores sessions, transcripts, evaluations (text/JSON only)
* No persistent audio storage.

# 3) Core capabilities this plan supports

* Sub-second partial transcripts (from ElevenLabs STT)
* Agent can interrupt or be interrupted (real-time barge-in)
* Agent uses resume summary (from Gemini) + JD + rubric in knowledge base
* Agent returns structured evaluation JSON per answer and a final report
* Frontend plays streaming TTS and pauses/cancels playback on user speech

# 4) Data model (NeonDB — simplified)

```sql
-- sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid,
  agent_id text,
  job_description text,
  resume_summary jsonb,
  status text,
  created_at timestamptz DEFAULT now()
);

-- transcripts (one row per utterance)
CREATE TABLE transcripts (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id),
  speaker text, -- 'candidate' | 'agent'
  seq int,      -- incremental
  text text,
  metadata jsonb, -- timestamps, partial/full flags
  created_at timestamptz DEFAULT now()
);

-- evaluations (per question or aggregated)
CREATE TABLE evaluations (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id),
  question_id text,
  score_json jsonb, -- {technical:2,communication:3,...}
  rationale text,
  created_at timestamptz DEFAULT now()
);
```

# 5) API endpoints (Vercel serverless)

Implement as Next.js API routes (TypeScript). These run server-side only.

1. `POST /api/session`

   * Input: `{ userId, jobDescription, resumeFile (multipart) }`
   * Actions:

     * Extract text from resume (pdf parsing).
     * Call Gemini with resume text → **structured summary JSON**.
     * Create agent on ElevenLabs (call Agents create endpoint) attaching:

       * resume_summary (Gemini output)
       * job_description
       * rubric doc (machine readable)
     * Persist session row in Neon with `agent_id`.
   * Return: `{ sessionId, agentId }`

2. `POST /api/token`

   * Input: `{ sessionId }`
   * Actions:

     * Validate session & auth.
     * Call ElevenLabs REST to create a short-lived realtime token/session or generate signed capability token for client to connect to ElevenLabs Realtime API.
     * Return: `{ realtimeToken, expiresAt, elevenWsUrl }`
   * Note: token must be short-lived and tied to sessionId.

3. `POST /api/webhook/elevenlabs` (optional)

   * Input: ElevenLabs conversation events (transcript, evaluation JSON)
   * Actions: persist transcripts & evaluations to Neon (robust redundancy if client events are lost).
   * Use a shared secret to validate incoming webhooks.

4. `GET /api/session/[id]/transcript`

   * Return all transcripts + evaluations for display/report.

# 6) Client-side realtime flow (high-level + pseudocode)

Design: client connects directly to ElevenLabs Realtime via WebSocket/RT using token from `/api/token`. Use WebRTC if ElevenLabs offers a WebRTC endpoint for lower-level audio handling. The sample below uses a generic WebSocket binary-send approach for clarity.

Client steps:

* `fetch('/api/token', { sessionId })` → get `realtimeToken` & `elevenWsUrl`.
* `ws = new WebSocket(elevenWsUrl, [realtimeToken])`
* `ws.onopen` → start capturing microphone audio (WebAudio + Opus encoder or MediaStream to send as binary)
* On `media` frames: `ws.send(binaryAudioChunk)`
* Listen to `ws.onmessage` for:

  * `partial_transcript` events → show live caption
  * `final_transcript` → append to transcripts UI & optionally send to backend if you want duplication
  * `agent_event` → structured evaluation / next question text or streaming TTS packets
  * `tts_chunk` → play audio chunks (via AudioBufferSourceNode)
  * `interruption` events → agent indicates it is interrupting or been interrupted
* On local VAD (client detects user started speaking while agent TTS playing), immediately:

  * stop audio playback
  * send an `interruption_event` through the WebSocket (or rely on ElevenLabs STT noticing audio and sending VAD events). The agent will react.

Minimal client pseudocode (conceptual):

```ts
const resp = await fetch('/api/token', {method:'POST', body: JSON.stringify({sessionId})});
const { realtimeToken, elevenWsUrl } = await resp.json();
const ws = new WebSocket(elevenWsUrl, ['token', realtimeToken]);

ws.onopen = () => startMicStream(frame => ws.send(frame)); // frame = encoded audio binary
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'partial_transcript') showCaption(msg.text);
  if (msg.type === 'final_transcript') saveTranscript(msg.text);
  if (msg.type === 'agent_tts_chunk') playAudioChunk(msg.binaryChunk);
  if (msg.type === 'agent_event' && msg.event === 'evaluation') showEvaluation(msg.payload);
};

// On VAD detection while agent audio:
function onUserBargeIn() {
  pausePlayback(); // stop audio
  ws.send(JSON.stringify({ type: 'client.interruption', reason: 'user_barge_in' }));
}
```

> Implementation notes:
>
> * Use browser WebAudio + Opus encoder (or MediaStreamTrack → RT via WebRTC) for efficient streams.
> * If ElevenLabs provides a WebRTC endpoint, prefer WebRTC because browsers already provide easy media streaming and low-latency playback controls.

# 7) Server-side token issuance (example outline)

`/api/token` must call ElevenLabs REST to create an ephemeral realtime session or sign a token. Pseudocode:

```ts
export default async function handler(req, res) {
  const { sessionId } = req.body;
  // validate session & auth
  // call ElevenLabs: POST /realtime/sessions or /tokens with server API key
  const elevenResp = await fetch('https://api.elevenlabs.io/v1/realtime/sessions', {
    method:'POST',
    headers:{ 'xi-api-key': process.env.ELEVEN_API_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ session_id: sessionId, ttl_seconds: 60 })
  });
  const data = await elevenResp.json();
  res.json({ realtimeToken: data.token, elevenWsUrl: data.ws_url, expiresAt: data.expires_at });
}
```

> Keep ELEVEN_API_KEY only server-side.

# 8) Rubric / knowledge base design (for agent)

Embed into the agent KB:

* `resume_summary` (from Gemini): short structured JSON and 6–8 bullet lines
* `job_description` (JD summary): 5–10 must-have skills and experience anchors
* `rubric.json` **(machine readable)** with:

  * criteria: technical, problem_solving, examples, communication, culture_fit
  * scales 0–5 with anchor examples (0, 2, 4, 5) for each
  * explicit output format string: `Return JSON EXACTLY: {questionId,technical,problem_solving,examples,communication,overall,rationale}`
* `agent_persona`: instruct to always return structured JSON block after each candidate answer and to produce a spoken friendly follow-up or next question.

Example rubric snippet to put in KB:

```json
{
 "criteria":[
  {"id":"technical","anchors":{"0":"No correct ideas","3":"Basic correct idea but missing details","5":"Correct, detailed, mentions tradeoffs"}},
  {"id":"communication","anchors":{"0":"Incoherent","3":"Understands but unclear","5":"Clear concise with examples"}}
 ],
 "output_spec":"Return EXACT JSON: {questionId:string,technical:int,communication:int,overall:int,rationale:string}"
}
```

# 9) Failure modes & mitigations

* **Client-side VAD misses barge-in**: rely on ElevenLabs partial transcripts + VAD events from STT to detect user speech; still implement local VAD for fastest response.
* **Network instability**: fall back to chunked HTTP uploads to `/api/audio-chunk` (graceful degrade).
* **ElevenLabs token expiry during session**: backend endpoint to refresh token. Frontend must handle `401` and re-request token.
* **Session concurrency / Neon connections**: use a serverless-friendly pooler recommended by Neon (pgbouncer style or Neon’s serverless adapter).
* **Agent produces non-JSON**: validate and fallback—if parsing fails, store raw agent text and flag for review. Improve KB with stricter `return_spec`.

# 10) Testing plan

* Unit tests: resume extraction → Gemini summary; agent creation payloads.
* Integration tests:

  * Simulate client streaming audio (use prerecorded audio files) into ElevenLabs Realtime dev endpoint and validate partial/final transcripts.
  * Validate agent returns JSON per rubric for a set of scripted answers.
* End-to-end QA:

  * Test barge-in: play agent TTS while injecting mic audio and confirm playback stops and agent reacts.
  * Load testing: simulate N concurrent sessions (watch Neon connection counts).
* Safety/bias tests: run sample candidate answers that could trigger bias and verify agent follows rules in KB; tune KB.

# 11) Dev / MVP milestones (ordered)

1. Implement `POST /api/session` (resume upload → Gemini summary → create ElevenLabs agent → store session).
2. Implement `POST /api/token` to issue ephemeral realtime tokens.
3. Build simple client that fetches token, connects to ElevenLabs WebSocket, streams mic audio, shows partial transcripts, and plays text-to-speech returned by agent (basic UX).
4. Add rubric JSON to agent KB and ensure agent returns evaluation JSON.
5. Implement transcript/evaluation persistence in Neon (via webhook or client forwards).
6. Add robust VAD + interruption behavior on client (stop TTS when VAD triggers).
7. QA & bias testing; add logging, observability.
8. Production readiness: add rate limiting, monitoring, secrets rotation, and usage caps.

# 12) Environment variables checklist (Vercel)

```
ELEVEN_API_KEY
ELEVEN_REALTIME_BASE_URL (if needed)
GEMINI_API_KEY
GEMINI_ENDPOINT
NEON_DB_URL
JWT_SECRET
APP_URL
WEBHOOK_SECRET (for verifying ElevenLabs webhooks)
```

# 13) Vercel deployment notes & constraints

* **Do not host WebSockets on Vercel** — client must connect directly to ElevenLabs Realtime; use Vercel only to mint ephemeral tokens and host API routes.
* Keep serverless functions short & stateless (token minting, session creation). If you need to run heavy jobs, use background jobs (external worker) later.
* Set Vercel environment variables in the dashboard; protect keys.

# 14) Security & privacy

* Never expose ELEVEN_API_KEY or GEMINI_API_KEY to client. Issue ephemeral tokens for realtime connections.
* Show explicit consent screen for recording. Let candidate opt out of transcripts storage if needed.
* Encrypt Neon DB connections (use TLS). Do not store raw audio.
* Logging: redact PII in logs, store transcripts encrypted if required.

# 15) Observability & cost control

* Track minutes of TTS and STT per session, agent inference calls, and Gemini calls. Add per-user caps or billing integration to prevent runaway costs.
* Use Sentry for errors; use Datadog/Prometheus for metrics (API call counts, token generation, session counts).
* Log agent evaluation JSON plus confidence indicator (if agent returns one) for auditability.

# 16) Example sequence (compact)

1. Candidate uploads resume → `POST /api/session`
2. Backend: parse resume → Gemini summary → create Agent (KB = summary + rubric + JD) → returns sessionId
3. Frontend: `POST /api/token` → gets `realtimeToken` + WS URL
4. Frontend → open WS to ElevenLabs. Stream mic audio binary.
5. ElevenLabs STT → partial transcripts (client UI).
6. Agent receives transcript → scores & emits evaluation event + next question → streaming TTS chunks to client.
7. Candidate barges in → client VAD stops playback, sends interruption event (or ElevenLabs STT detects new audio) → Agent adjusts and processes new input.
8. End: Agent returns final evaluation JSON → backend persists transcripts & evaluation to Neon. No audio saved.



