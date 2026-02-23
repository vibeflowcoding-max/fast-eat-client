# Architecture & Patterns

This document outlines the architectural principles, design patterns, and best practices required to implement the V2 Innovation Plan for FastEat Client.

## 1. Architectural Principles

### 1.1. SOLID Principles Application
*   **Single Responsibility Principle (SRP):** Components should have one reason to change. For example, the `GroupCart` component should only handle rendering the cart UI, while a separate `useGroupCartSync` hook manages the WebSocket connection and state synchronization.
*   **Open/Closed Principle (OCP):** The system should be open for extension but closed for modification. When adding new payment methods (e.g., SINPE Móvil for bill splitting), implement a new strategy class rather than modifying existing checkout logic.
*   **Liskov Substitution Principle (LSP):** Subtypes must be substitutable for their base types. Ensure that different types of AI agents (e.g., `SurpriseMeAgent`, `DietaryGuardianAgent`) adhere to a common `IAIAgent` interface.
*   **Interface Segregation Principle (ISP):** Clients should not be forced to depend on interfaces they do not use. Create specific interfaces for different features (e.g., `IVideoPlayer` vs. `IImageGallery`) rather than a monolithic `IMediaViewer`.
*   **Dependency Inversion Principle (DIP):** High-level modules should not depend on low-level modules. Both should depend on abstractions. Use dependency injection for services like API clients or analytics trackers.

### 1.2. State Management
*   **Local UI State:** React `useState` and `useReducer` for component-specific state (e.g., modal visibility, form inputs).
*   **Global Client State:** Zustand for cross-component state that doesn't require server synchronization (e.g., user preferences, theme).
*   **Server State:** React Query (TanStack Query) for fetching, caching, synchronizing, and updating server data (e.g., restaurant lists, user profiles).
*   **Real-time State:** Supabase Realtime (WebSockets) combined with Zustand or React Query for collaborative features (e.g., Group Carts).

## 2. Design Patterns

### 2.1. Strategy Pattern (Payment Splitting)
Use the Strategy pattern to handle different bill-splitting methods (e.g., Equal Split, Itemized Split, Custom Amount).

```typescript
interface ISplitStrategy {
    calculateShares(total: number, participants: User[], items: CartItem[]): Map<string, number>;
}

class EqualSplitStrategy implements ISplitStrategy { ... }
class ItemizedSplitStrategy implements ISplitStrategy { ... }
```

### 2.2. Observer Pattern (Real-time Updates)
Use the Observer pattern (via WebSockets/Supabase Realtime) to notify clients of changes in a Group Cart or when a friend completes an order.

### 2.3. Factory Pattern (AI Agent Selection)
Use a Factory to instantiate the correct AI agent based on the user's intent or context.

```typescript
class AIAgentFactory {
    static createAgent(intent: string): IAIAgent {
        switch (intent) {
            case 'surprise_me': return new SurpriseMeAgent();
            case 'dietary_check': return new DietaryGuardianAgent();
            default: return new GeneralAssistantAgent();
        }
    }
}
```

## 3. Error Handling & Retries

### 3.1. API Requests
*   Implement exponential backoff for failed API requests using React Query's built-in retry mechanism.
*   Use Axios interceptors to handle global errors (e.g., 401 Unauthorized -> redirect to login).

### 3.2. AI Agent Failures
*   If an AI agent fails to respond or returns invalid data, implement a fallback mechanism (e.g., default to a standard search or show a friendly error message).
*   Log AI failures with context (prompt, parameters) for debugging and model fine-tuning.

### 3.3. WebSocket Disconnections
*   Implement automatic reconnection logic for WebSockets with exponential backoff.
*   Queue outgoing messages while disconnected and replay them upon reconnection.
*   Show a non-intrusive "Offline" indicator to the user.

## 4. Observability (Logs, Metrics, Traces)

### 4.1. Logging
*   Use a structured logging library (e.g., Pino or Winston) to log events with context (user ID, session ID, feature flag state).
*   Send critical logs (errors, warnings) to a centralized logging service (e.g., Datadog, Sentry).

### 4.2. Metrics
*   Track key performance indicators (KPIs) such as:
    *   Time to Interactive (TTI)
    *   First Input Delay (FID)
    *   API response times
    *   AI agent response times
    *   Feature usage rates (e.g., how often "Surprise Me" is used)

### 4.3. Tracing
*   Implement distributed tracing (e.g., OpenTelemetry) to track requests across the frontend, backend, and AI services.
*   Include a `trace_id` in all API requests and logs to correlate events.
