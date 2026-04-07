## 2025-02-18 - [Security Enhancement] Implement Zod Validation in Profile API
**Vulnerability:** Weak input validation in the profile update API (`/api/profile/me/route.ts`).
**Learning:** The API lacked proper boundary checking for text fields, allowing potentially unbounded strings to reach the database ORM, which could lead to DoS or data corruption issues if exploited.
**Prevention:** Always enforce strict schema validation (using Zod) at the API boundary, validating lengths (min/max), types, and formats before processing the request.
