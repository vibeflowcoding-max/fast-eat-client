## 2024-05-15 - Unhandled Exception in AI JSON Parsing
**Vulnerability:** External API payloads (specifically from Gemini AI) were being parsed using `JSON.parse` without a `try...catch` block.
**Learning:** This missing error handling can cause an unhandled exception if the AI returns malformed JSON, propagating to a generic catch-all handler that returns a 500 Internal Server Error, which can leak stack traces or cause unpredictable system states in certain configurations.
**Prevention:** Always wrap `JSON.parse` of external outputs, especially from non-deterministic AI models, in a `try...catch` block to handle the error gracefully, log a warning, and return a more appropriate response code (like 502 Bad Gateway).

## 2024-05-16 - Unhandled Exception in Client Storage JSON Parsing
**Vulnerability:** Client-side `localStorage` data was being parsed using `JSON.parse()` without a `try...catch` block during React component initialization and rendering.
**Learning:** This missing error handling can cause an unhandled exception if the `localStorage` data is malformed (e.g., tampered with by the user, corrupted across versions, or interrupted during writing), causing the entire React component tree to crash and resulting in a white screen for the user.
**Prevention:** Always wrap `JSON.parse()` of untrusted client-side storage (like `localStorage` or `sessionStorage`) in a `try...catch` block to handle parsing failures gracefully, log a warning, and fall back to a safe default state.
