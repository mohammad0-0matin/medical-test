---
name: shadcn-ui
description: Use for any React UI work in Salamat Yar: building or changing components, pages, forms, tables, cards, buttons or layouts with shadcn/ui and Tailwind v4. Covers semantic color tokens, standard component patterns, radius and layout.
---

# shadcn/ui and Tailwind rules

Read `DESIGN.md` in the project root first. It defines the actual token values, RTL rules, accessibility and surface density. If this file and `DESIGN.md` disagree, `DESIGN.md` wins.

## Components

- Add components with the shadcn CLI (`npx shadcn@latest add button`) instead of hand-copying class strings. Check `components/ui/` before creating a new component.
- Edit the generated component files when the project needs a different default. Do not wrap or restyle them repeatedly at each call site.
- Reuse existing components. Do not create a second button, card or input.

## Colors: semantic tokens only

Never use raw palette colors (`bg-blue-500`, `text-gray-700`, `border-gray-200`) or hex values in components. Use these classes so light and dark mode both work:

- Backgrounds: `bg-background` (page), `bg-card` (cards, panels), `bg-muted` (subtle areas), `bg-accent` (hover rows, selected items).
- Text: `text-foreground`, `text-muted-foreground` (secondary and helper text), `text-primary` (links and brand text).
- Borders: `border-border` (dividers, cards), `border-input` (form fields).
- Actions: `bg-primary text-primary-foreground` for the main action, `bg-destructive text-destructive-foreground` for danger.
- Status: `bg-success`, `bg-warning` with their `-foreground` pairs. Always add an icon and a text label, never color alone.
- Hover: use opacity, for example `hover:bg-primary/90` and `hover:bg-muted/50`.

If a color you need is missing, add a token in `index.css` and `DESIGN.md`. Do not hardcode.

## Standard patterns

- Cards: `rounded-xl border bg-card text-card-foreground shadow-sm`, with `p-6` padding (`p-4` in clinical views).
- Buttons: use the shadcn `Button` with its variants (default, outline, secondary, destructive, ghost). Height `h-11` on touch and patient views, `h-9` in dense clinical views on desktop.
- Inputs: use shadcn `Input`, `Label` and `Form` (react-hook-form). Every input has a visible label and an error message linked with `aria-describedby`.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. This overrides shadcn's thinner default ring.
- Radius: `rounded-md` for buttons and inputs, `rounded-xl` for cards and dialogs, `rounded-full` for badges. Do not mix other values.
- Layout: Flexbox or Grid with `gap-4` or `gap-6`. Mobile-first: write base styles without a prefix, then use `sm:`, `md:`, `lg:` only to change things on larger screens.

## RTL (Persian is the default)

- Use logical utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Never `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`.
- Flip directional icons with `rtl:rotate-180`.
- Keep phone numbers, IDs and codes left-to-right with `dir="ltr"` or `<bdi>`.
- Never set negative `tracking-*` on text. Persian letters must stay connected.
- Check that shadcn components you add work in RTL (popovers, dropdowns, sheets, tabs, sliders). Fix the placement or direction props if not.

## Hygiene

- Do not reorder Tailwind classes by hand. `prettier-plugin-tailwindcss` sorts them. Run `prettier --write` instead.
- Avoid arbitrary values (`w-[317px]`). Use the scale, or add a token if it is a real design decision.
- No inline `style` for colors or spacing.
