# Promo Banner

## Purpose

Highlights short-lived campaigns and incentive messaging in discovery contexts.

## Anatomy

- Campaign headline
- Supporting copy
- Primary CTA
- Decorative background shape
- Gradient background

## Behavior

- Primary action: entire CTA opens the linked offer or filtered feed.
- Secondary action: banner tap may also open the offer if whole-surface click is enabled.
- Fallback: if the campaign target is unavailable, hide the CTA and show informational messaging only.
- Feedback: route change or modal open on success; error toast if campaign target is invalid.
- Tracking: `promo_impression`, `promo_click`, `promo_conversion`, `promo_dismiss` if dismissible in future.

## Rules

- Limit gradients to promo surfaces only.
- Decorative blur circles should not interfere with legibility.