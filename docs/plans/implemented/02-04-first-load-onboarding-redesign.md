# Plan 02.04 — First-Load Onboarding Redesign (Non-Blocking + Address Capture)

## Objective

Improve first-time user experience by **always showing Home first**, while still guiding users to complete missing profile and location data through lightweight prompts.

## Problem Statement

Current behavior blocks first impression with a full onboarding modal (name, phone, location). This creates friction and makes users feel interrupted before seeing any value.

## Target UX Outcome

- On first app load, user sees the Home screen immediately.
- User sees a small non-blocking prompt near top-right area (close to `Ubicación activa`) with text:
  - **"Fill missing information for the best experience"**
- Tapping prompt opens profile form for:
  - Full name
  - Number
  - Address (high-level entry point)
- Tapping `Permitir ubicación`:
  1. Triggers browser/system location permission.
  2. Opens address details form with embedded Google map.
  3. Lets user complete structured address details.
  4. Save Address returns user to previous profile form.

## Scope

### In Scope

- Replace blocking first-load onboarding with non-blocking prompt flow.
- Add profile completion popup/entry point in Home header zone.
- Add location flow with map and address detail sub-form.
- Persist address to Supabase in `customer_address`.
- Keep Home usable during incomplete onboarding.

### Out of Scope

- Full account system redesign.
- Multi-address management UI (v1 can support single active address).
- Geocoding/reverse-geocoding enhancements beyond map URL capture.

## Reference Implementation to Reuse

Map picker pattern from `restaurant-partner-p`:
- [restaurant-partner-p/src/components/maps/GoogleMapsAddressPicker.tsx](restaurant-partner-p/src/components/maps/GoogleMapsAddressPicker.tsx)

Use this as functional/architectural reference for:
- Google Maps loader lifecycle
- click/drag marker selection
- map URL generation
- geolocation fallback behavior

## Proposed UX Flow

## A) First App Load (Guest / New User)

1. Home renders immediately (no blocking modal).
2. If required customer data is incomplete, show compact top-right prompt.
3. Prompt copy:
   - Title: `Fill missing information for the best experience`
   - Optional subtext: `Add your profile and address for faster delivery`
4. Prompt CTA: `Complete now`
5. Dismiss option: `Later`

## B) Profile Completion Modal (Step 1)

Fields:
- Full name (required)
- Number (required)
- Address status row:
  - if missing location: button `Permitir ubicación`
  - if location exists: show `Ubicación configurada`

Actions:
- `Continue`
- `Close` / `Later`

Validation:
- Name non-empty
- Number format as per existing project constraints

## C) Location + Address Details (Step 2)

Triggered by `Permitir ubicación`.

Step behavior:
1. Request location permission.
2. On grant, open Address Details form with map.
3. Map interaction (embed/picker) stores map URL in background.

Fields shown:
- Building Type (dropdown)
  - Apartment
  - Residential Building
  - Hotel
  - Office Building
  - Other
- Apartment/Suite/Floor (text)
- Delivery notes (text, editable; default `Meet at door`)

Actions:
- `Save Address`
- optional `Back`

On Save:
- Persist address record in Supabase.
- Return to Step 1 form (profile completion).

## D) Error and Permission Edge Cases

- Permission denied:
  - Show clear inline message and alternate CTA `Enter address manually`
- Map load failure:
  - Show fallback text input for map URL (internal fallback only)
- Save error:
  - Keep user in form with retry CTA and non-destructive state

## Functional Requirements

1. Home must never be blocked by onboarding on first load.
2. Prompt appears only when data is incomplete.
3. Prompt can be dismissed but should reappear by policy (e.g., next session/day) until completion.
4. `Permitir ubicación` must request system permission.
5. Address form must include map + required fields above.
6. `Save Address` persists to Supabase `customer_address`.
7. Return flow to profile form must be seamless.

## Data Model (Supabase)

## Table: `customer_address`

Purpose: store structured delivery address linked to customer.

Columns:
- `id` uuid primary key default `gen_random_uuid()`
- `customer_id` uuid not null references `customers(id)` on delete cascade
- `url_address` text not null
- `building_type` text not null check in
  - `Apartment`
  - `Residential Building`
  - `Hotel`
  - `Office Building`
  - `Other`
- `unit_details` text null  (UI label: Apartment/Suite/Floor)
- `delivery_notes` text not null default `'Meet at door'`
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Indexes:
- index on `customer_id`
- optional unique partial/index for active single address policy (v1 simplification)

## Suggested SQL Migration (to execute via Supabase MCP)

```sql
create table if not exists public.customer_address (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  url_address text not null,
  building_type text not null check (
    building_type in (
      'Apartment',
      'Residential Building',
      'Hotel',
      'Office Building',
      'Other'
    )
  ),
  unit_details text,
  delivery_notes text not null default 'Meet at door',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_address_customer_id
  on public.customer_address(customer_id);
```

## Suggested RLS (adjust to your auth model)

```sql
alter table public.customer_address enable row level security;

create policy "Users can view own addresses"
  on public.customer_address
  for select
  using (auth.uid() = customer_id);

create policy "Users can insert own addresses"
  on public.customer_address
  for insert
  with check (auth.uid() = customer_id);

create policy "Users can update own addresses"
  on public.customer_address
  for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);
```

## Frontend Architecture Changes

Primary targets:
- `src/components/HomePage.tsx`
- `src/components/UserOnboardingModal.tsx` (split/refactor into non-blocking flows)
- `src/features/home-discovery/components/HomeHeroSearch.tsx` (prompt anchor placement)
- New map/address components in `fast-eat-client` inspired by partner app map picker

Suggested new components:
- `ProfileCompletionPrompt.tsx` (small top-right prompt)
- `ProfileCompletionModal.tsx` (name/phone + location entry)
- `AddressDetailsModal.tsx` (map + fields + save)
- `GoogleMapsAddressPicker.tsx` (adapted lightweight version)

State strategy:
- Keep profile completion state in Home page container or dedicated hook.
- Persist prompt dismissal timestamp and completion status in local storage/store.
- Persist saved address ID/status after Supabase success.

## Analytics Events (Recommended)

- `profile_prompt_impression`
- `profile_prompt_click`
- `profile_prompt_dismiss`
- `location_permission_request`
- `location_permission_granted`
- `location_permission_denied`
- `address_form_save_click`
- `address_form_save_success`
- `address_form_save_error`

## Accessibility Requirements

- Prompt is keyboard reachable and screen-reader labeled.
- Modal focus trap and escape behavior preserved.
- Map control has descriptive label and non-map fallback.
- Errors are announced with `aria-live="polite"`.

## Performance Considerations

- Lazy load map picker only when address step is opened.
- Avoid loading Google Maps script on first paint.
- Debounce any map URL/state updates tied to user interaction.

## Security & Privacy

- Store only needed address metadata.
- Keep map URL sanitized/validated as text.
- Avoid logging precise coordinates in verbose console logs in production.

## Rollout Strategy

Because this repository is in active build mode, implement as **always visible in development** (no hidden-by-default feature gating).

Optional later rollout controls can be introduced only after UX validation.

## Definition of Done

- Home always visible on first load.
- Non-blocking prompt appears for incomplete data.
- Profile form + location flow works end-to-end.
- Address details saved to `customer_address` successfully.
- User can continue browsing Home regardless of completion state.
- Mobile UX is smooth and non-blocking.

## Implementation Checklist

- [x] Confirm final UX copy for prompt and modal actions.
- [x] Add non-blocking profile completion prompt in Home top-right area.
- [x] Refactor/remove blocking first-load onboarding modal behavior.
- [x] Implement profile completion modal (full name + number + location entry point).
- [x] Implement `Permitir ubicación` system permission request flow.
- [x] Add map-based address detail modal using partner-app picker pattern.
- [x] Add fields: Building Type, Apartment/Suite/Floor, Delivery notes (default `Meet at door`).
- [x] Implement `Save Address` and return-to-profile-form navigation.
- [x] Create Supabase table `customer_address` via Supabase MCP with required columns and constraints.
- [x] Add foreign key relation `customer_id -> customers.id`.
- [x] Add index(es) and baseline RLS policies as appropriate.
- [x] Implement API/storage integration to persist/read customer address.
- [x] Add loading/error/empty states for address save flow.
- [x] Add analytics events for prompt, permissions, and address save outcomes.
- [x] Add accessibility validations for prompt/modal/map interactions.
- [x] Add tests: first-load non-blocking behavior, permission flow, form validation, save success/error.
- [x] Validate mobile behavior and interaction smoothness in browser device mode.
- [x] QA end-to-end flow with a new user and returning user.
