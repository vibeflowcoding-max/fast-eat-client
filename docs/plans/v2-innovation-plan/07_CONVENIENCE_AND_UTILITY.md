# Convenience & Utility

This document outlines the architecture and implementation details for Phase 4 of the V2 Innovation Plan: Convenience & Utility.

## 1. Scheduled Deliveries

### 1.1 Concept
Allow users, especially office workers or planners, to order food for a specific time later in the day or week.

### 1.2 Workflow
1. User adds items to the cart.
2. Before checkout, user toggles "Schedule for Later".
3. User selects a valid date and time (based on restaurant operating hours).
4. The backend stores the order with a `scheduled_for` timestamp.
5. The KDS (Kitchen Display System) hides the order until 30-45 minutes before the scheduled delivery time to ensure food is fresh.

## 2. Live Activities (iOS Dynamic Island)

### 2.1 Concept
For users on iOS devices (or Android equivalents via persistent notifications), offer a live tracking widget on the lock screen and Dynamic Island.

### 2.2 Workflow
1. When an order is placed, the backend sends a specific APNs payload to start a Live Activity.
2. As the order status changes (Preparing -> Delivering), the backend sends APNs updates.
3. The visual indicator counts down minutes and shows a progress bar without requiring the user to open the app.

## 3. Eco-Friendly / Surplus Options

### 3.1 Concept
Cater to eco-conscious consumers by offering options to skip cutlery or buy end-of-day surplus food at a discount.

### 3.2 Workflow
1. Checkout screen includes a prominent "Skip Cutlery & Napkins" toggle.
2. If the user opts out, a small leaf badge is added to their profile, and the KDS highlights the instruction to staff.

---

## 4. Full-Stack Implementation Requirements

To fully realize these Convenience and Utility features, the following frontend and backend infrastructure is required:

### 4.1. Supabase Database Updates
- [x] **`orders` Table Modifications**
  - **Schema:** Add `scheduled_for` (timestamp, nullable), `opt_out_cutlery` (boolean, default false).
- **Implemented in:** `fast-eat-api-nestjs/migrations/036_convenience_utility_fields.sql`
- [x] **`users` Table Modifications**
  - **Schema:** Add `push_token` (varchar) to store APNs/FCM tokens for Live Activities.
- **Implemented in:** `fast-eat-api-nestjs/migrations/036_convenience_utility_fields.sql`
- [x] **Migration Execution (Supabase MCP):** Base v2 schema migrations and security hardening migration applied in Supabase.
- **Implemented in:** `fast-eat-api-nestjs/migrations/035_v2_innovation_backend_features.sql`, `fast-eat-api-nestjs/migrations/036_convenience_utility_fields.sql`, `fast-eat-api-nestjs/migrations/037_v2_security_hardening.sql`

### 4.2. NestJS Backend (`fast-eat-api-nestjs`)
- [x] **Module Update:** Enhance `orders` module to handle scheduling logic.
- **Implemented in:** `fast-eat-api-nestjs/src/modules/orders/orders.controller.ts`, `fast-eat-api-nestjs/src/modules/orders/orders.service.ts`, `fast-eat-api-nestjs/src/modules/consumer/services/consumer.service.ts`
- [x] **API Endpoints:**
  - `POST /orders` - Update validation to accept `scheduledFor` and `optOutCutlery`.
  - `POST /notifications/live-activity` - New endpoint/service to dispatch Apple Push Notification service (APNs) payloads for lock screen updates.
- **Implemented in:** `fast-eat-api-nestjs/src/modules/orders/orders.controller.ts`, `fast-eat-api-nestjs/src/modules/notifications/notification.controller.ts`, `fast-eat-api-nestjs/src/modules/notifications/notification.service.ts`, `fast-eat-api-nestjs/src/modules/notifications/providers/stub-live-activity.provider.ts`
- [x] **Ownership Enforcement (JWT):** Live activity dispatch now requires JWT and enforces request user ownership for `userId` payloads.
- **Implemented in:** `fast-eat-api-nestjs/src/modules/notifications/notification.controller.ts`
- [x] **KDS Scheduling Visibility:** Hide scheduled orders from KDS until lead-time window (45 minutes before `scheduled_for`).
- **Implemented in:** `fast-eat-api-nestjs/src/modules/orders/orders.service.ts`
- [x] **Scheduled Activation Window Orchestration:** Added backend endpoint to fetch scheduled orders entering a configurable activation window for dispatch/KDS orchestration workflows.
- **Implemented in:** `fast-eat-api-nestjs/src/modules/orders/orders.controller.ts`, `fast-eat-api-nestjs/src/modules/orders/orders.service.ts`
- [x] **Branch Operating-Hours Validation:** Scheduled orders are validated against branch opening-hours windows when branch context is available.
- **Implemented in:** `fast-eat-api-nestjs/src/modules/consumer/services/consumer.service.ts`

### 4.3. Client React UI Implementation (`fast-eat-client`)
> **[FRONTEND + BACKEND INTEGRATED]**
> Metadata payload support for `scheduledFor` and `optOutCutlery` is now implemented and validated in `POST /orders`.

- [x] `src/components/CheckoutModal.tsx / OrderForm.tsx` - Added the HTML datetime picker for "Schedule for later". The value is attached to the payload `metadata` as `scheduledFor`.
- [x] `src/components/CheckoutModal.tsx / OrderForm.tsx` - Added a checkbox for "Skip Cutlery". The value is attached to the payload `metadata` as `optOutCutlery`.
- [x] `src/features/notifications/hooks/useLiveActivities.ts` - Hook created to request Service Worker Notification permissions. Integrate with the APNs dispatch endpoint here.
