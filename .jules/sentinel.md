## 2024-05-15 - Unhandled Exception in AI JSON Parsing
**Vulnerability:** External API payloads (specifically from Gemini AI) were being parsed using `JSON.parse` without a `try...catch` block.
**Learning:** This missing error handling can cause an unhandled exception if the AI returns malformed JSON, propagating to a generic catch-all handler that returns a 500 Internal Server Error, which can leak stack traces or cause unpredictable system states in certain configurations.
**Prevention:** Always wrap `JSON.parse` of external outputs, especially from non-deterministic AI models, in a `try...catch` block to handle the error gracefully, log a warning, and return a more appropriate response code (like 502 Bad Gateway).
