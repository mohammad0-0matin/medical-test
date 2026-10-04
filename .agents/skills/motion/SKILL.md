---
name: motion
description: Use when adding or changing animations, transitions, hover and press states, loaders, skeletons, dialogs, menus or list entrance effects in Salamat Yar. Covers durations, easing, reduced-motion support and what to avoid in clinical views.
---

# Motion rules

Read the Motion section and the surface table in `DESIGN.md` first. It wins if there is a conflict.

## Interaction states

- Every clickable element (buttons, links, cards, rows) has a hover state. Hover is never the only feedback, because touch devices have no hover. Add focus and pressed states as well.
- Use `transition-colors duration-200 ease-in-out` for color changes. Use `transition-transform` for movement and scaling. Do not use `transition-all`, because it animates properties you did not intend and costs performance.
- Pressed state on buttons: `active:scale-[0.98]` together with `transition-transform`.

## Appearing and disappearing

- Dialogs, dropdowns, popovers and accordions fade in and scale from 95% to 100%. They do not pop in instantly. Use the shadcn defaults (Radix `data-[state=open]` animations) before writing custom ones.
- Lists and table rows may fade in and slide up 10px, staggered by at most 50ms per item, and only for the first 8 or so items. Do not stagger long lists.
- Animate opacity and transform only. Do not animate width, height, top or left.

## Loading

- Use skeleton loaders (`animate-pulse` on `bg-muted` blocks) that match the final layout while data loads. No blank screens, and no lone spinner for a page-level load.
- Small spinners are fine inside a button while an action is submitting. Disable the button at the same time.

## Reduced motion (required)

Every animation needs a fallback for users who ask for less motion:

`motion-reduce:transition-none motion-reduce:animate-none motion-reduce:transform-none`

With reduced motion, state changes still happen. They just happen without movement.

## By surface

- Patient and public views: the rules above apply normally.
- Clinical views: keep motion minimal. No entrance animations on tables or lists. Hover, focus and pressed states stay, because doctors work fast and need immediate response.
- Report and print views: no motion at all.

## Avoid

- Animations longer than 300ms for UI feedback.
- Looping or attention-grabbing animation on anything that carries medical information.
- Motion that is the only signal that something changed. Pair it with text, an icon or an `aria-live` message.
