# Testing & QA Strategy

This document outlines the comprehensive testing and Quality Assurance (QA) strategy for the FastEat Client V2 Innovation Plan, ensuring high reliability, performance, and user satisfaction.

## 1. Testing Pyramid

We will follow a standard testing pyramid approach, prioritizing fast, reliable unit tests at the base and reserving slower, more brittle end-to-end (E2E) tests for critical user journeys.

### 1.1. Unit Testing (Vitest)
*   **Scope:** Pure functions, utility helpers, state reducers (Zustand), and AI prompt builders.
*   **Goal:** Ensure individual units of code behave correctly in isolation.
*   **Tools:** Vitest (fast, Vite-native test runner).
*   **Key Areas to Test:**
    *   Bill splitting calculations (Equal, Itemized, Custom).
    *   Loyalty points and streak logic.
    *   Dietary profile validation rules.
    *   Date/time formatting for scheduled deliveries.

### 1.2. Integration Testing (React Testing Library)
*   **Scope:** Component interactions, custom hooks, and state synchronization (e.g., Group Cart updates).
*   **Goal:** Verify that different parts of the application work together seamlessly.
*   **Tools:** React Testing Library (RTL) + Vitest.
*   **Key Areas to Test:**
    *   Group Cart UI updating when a mock WebSocket event is received.
    *   AI Assistant chat flow (mocking the LLM response).
    *   Checkout form validation and submission.
    *   Video player intersection observer logic (mocking the observer).

### 1.3. End-to-End (E2E) Testing (Playwright)
*   **Scope:** Critical user journeys (CUJs) across the entire application stack (Frontend + Backend/Mock API).
*   **Goal:** Ensure the app functions correctly from the user's perspective in a real browser environment.
*   **Tools:** Playwright (cross-browser, reliable, supports network interception).
*   **Key Areas to Test:**
    *   Full checkout flow (Single user).
    *   Group Cart creation, joining, adding items, and checkout (simulating multiple browser contexts).
    *   "Surprise Me" AI flow from home screen to cart.
    *   Authentication and profile completion.

## 2. AI Feature Testing Strategy

Testing non-deterministic AI features requires a specialized approach.

### 2.1. Prompt Evaluation & Regression Testing
*   Maintain a suite of "Golden Prompts" and expected outputs (or output schemas).
*   Run automated tests against the LLM API (using a staging environment) to ensure changes to the system prompt do not degrade performance or break the expected JSON structure.
*   Use tools like LangSmith or custom scripts to evaluate the accuracy of the Dietary Guardian agent against a known dataset of menu items and dietary profiles.

### 2.2. Fallback & Error Handling Tests
*   Explicitly test the UI behavior when the AI API times out, returns a 500 error, or returns malformed JSON.
*   Ensure the fallback UI (e.g., standard search results instead of "Surprise Me") renders correctly and gracefully.

## 3. Manual QA & Edge Cases

While automation covers the happy paths and known regressions, manual exploratory testing is crucial for complex, real-world scenarios.

### 3.1. Network & Connectivity
*   Test the app under poor network conditions (3G, offline) using browser DevTools.
*   Verify WebSocket reconnection logic for Group Carts when the connection drops and restores.
*   Ensure offline indicators appear and disappear correctly.

### 3.2. Device & OS Specifics
*   Test video playback (HLS) on older Android and iOS devices to ensure performance is acceptable.
*   Verify iOS Live Activities / Dynamic Island updates correctly during an active order.
*   Test SINPE Móvil deep linking on actual mobile devices (not just emulators).

## 4. Metrics & Monitoring (Post-Release QA)

QA doesn't stop at deployment. We must monitor the app in production to catch issues early.

*   **Error Tracking:** Use Sentry or Datadog to track unhandled exceptions and React Error Boundary triggers.
*   **Performance Monitoring:** Track Core Web Vitals (LCP, FID, CLS) using Vercel Analytics or Google Analytics.
*   **AI Telemetry:** Log AI agent latency, token usage, and failure rates to identify bottlenecks or prompt degradation.
