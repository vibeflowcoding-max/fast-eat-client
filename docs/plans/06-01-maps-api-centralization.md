# Plan 06.01 — Maps Logic Centralization to API

## Implementation Checklist (Execution Tracking)

- [x] Add `src/services/maps-api.ts` for backend `/api/maps/v1/*` requests with abort support and typed responses
- [x] Integrate reverse geocode flow into `GoogleMapsAddressPicker.tsx` while preserving map interactions
- [x] Extend `AddressDetailsModal` payload to include optional normalized location metadata
- [x] Update `HomePage.tsx` address save/load flow to pass enriched metadata
- [x] Update `src/app/api/customer/address/route.ts` to accept and return normalized metadata safely
- [x] Standardize map key runtime usage to `NEXT_PUBLIC_GOOGLE_MAPS_*`
- [x] Add/update tests for picker fallback paths and enriched address payload handling
- [x] Update rollout notes/checklist with completed migration status

## Objective

Adopt backend-owned maps endpoints (`fast-eat-api-nestjs`) for all map data operations in `fast-eat-client`, while preserving current onboarding/address UX.

## Dependency

This plan depends on:
- `fast-eat-api-nestjs/docs/MAPS_API_CENTRALIZATION_PLAN.md`

Use those endpoint contracts as source of truth.

---

## 1) Current State (in this app)

- Interactive map component: `src/components/GoogleMapsAddressPicker.tsx`.
- Address onboarding flow: `src/components/AddressDetailsModal.tsx` + `src/components/HomePage.tsx`.
- Server-side persistence route: `src/app/api/customer/address/route.ts`.
- Key mismatch currently exists:
  - component reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `.env.local` currently has `VITE_GOOGLE_MAPS_API_KEY` values added.

---

## 2) Target Architecture

Frontend responsibilities:
- map rendering + marker interactions
- geolocation permission handling
- address form UX

API responsibilities:
- geocode / reverse geocode
- places autocomplete / details
- directions
- config metadata

---

## 3) Endpoint Adoption Plan

## 3.1 New client API module

Add:
- `src/services/maps-api.ts`

Methods mapped to backend:
- `geocodeAddress` -> `POST /api/maps/v1/geocode`
- `reverseGeocode` -> `POST /api/maps/v1/reverse-geocode`
- `autocompletePlaces` -> `GET /api/maps/v1/places/autocomplete`
- `getPlaceDetails` -> `GET /api/maps/v1/places/:placeId`
- `getDirections` -> `POST /api/maps/v1/directions`
- `getMapsConfig` -> `GET /api/maps/v1/config`

All requests should be abortable (`AbortController`) and typed.

## 3.2 Update onboarding flow

### `GoogleMapsAddressPicker.tsx`

- Keep click/drag marker and geolocation behavior.
- On marker update, optionally call `reverseGeocode` to obtain normalized formatted address.
- Keep manual URL fallback input.

### `AddressDetailsModal.tsx`

- Extend form payload model to optionally include:
  - `lat`
  - `lng`
  - `formattedAddress`
  - `placeId`

### `HomePage.tsx`

- Keep existing analytics events.
- Keep same modal sequencing and prompt behavior.
- Ensure saved customer address includes normalized location payload (if available).

### `src/app/api/customer/address/route.ts`

- Expand accepted payload to store enriched location metadata (if database columns exist; otherwise persist in JSON-compatible field or defer schema update).

---

## 4) Env Variable Cleanup Plan (this repo)

## Required for current interactive map rendering

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Optional

- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (if mapId usage is added to this app)

## Not needed in web client

- `VITE_GOOGLE_MAPS_SDK_ANDROID`

## Migration action

1. Stop relying on `VITE_GOOGLE_MAPS_*` in Next.js runtime path.
2. Standardize to `NEXT_PUBLIC_*` for any browser-consumed values.
3. Keep geocoding keys server-side only (API repo), not in client `.env.local`.

---

## 5) UX Constraints

Do not change:
- onboarding sequence
- profile/address modal UX
- map picker interactions

Do improve:
- address quality via API reverse geocoding normalization
- error message consistency from API error codes

---

## 6) Testing Plan

1. Add/update tests for `GoogleMapsAddressPicker`:
   - emits coordinates and URL
   - geolocation denied fallback path
   - reverse geocode API failure fallback path
2. Add tests for `AddressDetailsModal` save payload shape.
3. Add test for `HomePage` address save success/error handling with enriched payload.

---

## 7) Rollout Sequence

1. API maps endpoints live and validated.
2. Integrate `maps-api.ts` in client with feature switch default ON in dev.
3. Verify onboarding end-to-end and profile completion flow.
4. Remove obsolete map keys from this repo.
5. Rotate any previously exposed Google keys.

---

## 8) Definition of Done

- Client uses `/api/maps/v1/*` for geocode/reverse/place/directions.
- `GoogleMapsAddressPicker` remains visually and behaviorally equivalent.
- `.env.local` maps keys are minimal and correctly prefixed for Next.js.
- Address save flow can persist normalized location metadata.
