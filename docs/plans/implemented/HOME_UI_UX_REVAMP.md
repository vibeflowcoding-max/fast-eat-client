# Home Screen UI/UX Revamp Plan

This document outlines the implementation plan to modernize the home screen UI, reducing information overload and improving the vertical space layout to match top-tier delivery apps.

## Phase 1: Top Banners & Notifications Cleanup
- [x] Make the "Fill missing information" profile banner dismissible or shrink it to a single line.
- [x] Remove or relocate the "Activar notificaciones" pill from the permanent home feed (move to a modal or OS prompt).

## Phase 2: Consolidate Categories & Filters
- [x] Replace text-heavy cuisine pills (Alitas, Árabe, etc.) with a single row of visual icons (circular image + text).
- [x] Combine the multiple filter rows ("Todos, Promos, Cercanos" and "Económico, <= 30 min") into one single scrollable row of quick-filter pills.
- [x] Move the "Ordenar: Mejor valor" dropdown into a dedicated "Filters" modal/drawer accessed by an icon.

## Phase 3: Clean Up Restaurant Cards
- [x] Simplify the card footer: Remove gray background boxes for "Total est." and "Envío". Replace with a single, clean line of text (e.g., `⭐ 4.8 (500+) • 20-30 min • ₡1,000 envío`).
- [x] Update typography: Make the restaurant title slightly larger and bolder. Make the category text a lighter gray.
- [x] Adjust badges: Make "Promo activa" and "ETA" badges smaller and more integrated (consider moving ETA to the bottom text).

## Phase 4: Navigation & Floating Buttons
- [x] Implement a fixed Bottom Navigation Bar (Home, Search, Orders, Profile) for mobile view.
- [x] Adjust Floating Action Buttons (FABs): Ensure the "Asistente" and other floating buttons don't obscure critical card info (add background blur or adjust positioning).
