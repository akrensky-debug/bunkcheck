# Bunkcheck UI kit

Pages and feature components are built from these primitives and the design tokens. See them
all rendered at `/ui` (not linked from the site, `noindex`).

## Rules

- **No raw values outside `components/ui`.** No hex colors, no arbitrary Tailwind values
  (`text-[#…]`, `rounded-[22px]`, `max-w-[85%]`), no default palette (`gray-500`, `red-600`),
  no default type sizes (`text-sm`). If something is missing, add a token or a variant here.
- **No emoji, no symbol glyphs** (✓ → ↗ ›) in the UI. Use `<Icon>` or words.
- **Sentence case everywhere.** No uppercase, tracked eyebrow labels.
- **Whitespace and hairlines before boxes.** Separate sections with `Section divided` or a
  `border-line` rule. Use `Surface` only when a container is truly needed.
- **Motion:** color and background transitions (150 ms) and the page fade. Nothing lifts,
  slides or staggers. `prefers-reduced-motion` turns it all off (globals.css).
- `npm run check:ui` enforces the mechanical parts in CI. A line that must break a rule (for
  example a literal color in Next metadata) ends with a `ui-check-ignore` comment saying why.

## Tokens

Defined once as CSS variables in `app/globals.css` (`:root`), mapped to role names in
`tailwind.config.ts`. A dark theme redefines the variables; nothing else changes.

| Role | Use |
| --- | --- |
| `bg` | page background (paper) |
| `surface` | inputs, menus, the rare container (white) |
| `ink` | text and icons (night navy) |
| `muted` | secondary text, AA on `bg` and `surface` |
| `line` | hairlines and borders |
| `tint` | hover wash on rows and ghost buttons, info notices |
| `accent`, `accent-hover`, `accent-ink` | primary buttons and the user's chat bubble; text on them |
| `highlight`, `highlight-soft` | flashlight yellow: fills only, sparingly, never text |
| `checked`, `checked-soft` | verified, done, open |
| `warn` | waitlist, missing, "check this" text |
| `error`, `error-soft` | errors, remove, delete |
| `focus` | focus outline |
| `series-1…5` | one color per kid on the family week (identity only) |

Type: `text-display` (home hero only), `text-h1` (page title), `text-h2` (section),
`text-h3` (row and card titles), `text-lead`, `text-body`, `text-small`, `text-caption`.
Radius: `rounded-sm` 8, `rounded-md` 12, `rounded-lg` 16, `rounded-pill`. Shadow:
`shadow-soft`, only for floating things (composer, search bar, menus). Widths:
`max-w-narrow` 720, `max-w-default` 1024, `max-w-wide` 1152, `max-w-measure` 65ch.
Spacing follows Tailwind's 4px scale; stick to 1, 2, 3, 4, 6, 8, 12, 16 (and 24 for page
top space).

## Primitives

| Component | For |
| --- | --- |
| `Button` | Every button. `primary` (one per view), `secondary`, `ghost`, `link` (inline action), `quiet` (cancel, housekeeping), `danger` (remove, delete). Sizes `sm`/`md`/`lg`. `href` renders a link; `external` opens a new tab. `icon`/`leadingIcon` add an Icon. |
| `IconButton` | A round button with one icon. `label` is required. |
| `Icon` | Inline SVG line icons: arrow-right, arrow-left, arrow-up, check, search, x, chevron-*, calendar, user, plus, external. |
| `Heading` | `display`, `h1`, `h2`, `h3`; `as` overrides the element. |
| `Text` | `lead`, `body`, `small`, `caption`; tones `ink`, `muted`, `checked`, `warn`, `error`. Capped at 65ch unless `wide`. |
| `Container` | Page width (`narrow`, `default`, `wide`) and gutters. |
| `Stack` | Flex column or row with a gap from the rhythm. |
| `Section` | Heading, optional description and action, content. `divided` adds the top hairline. |
| `Divider`, `Surface` | A hairline; a white container. |
| `Input`, `Textarea`, `Select` | Form controls (`fieldSize` `sm`/`md`). |
| `Field` | Label, control, hint, error. Children can be a function of the generated id. |
| `Checkbox`, `ChoiceChip` | A single yes/no; pick several (or one, `type="radio"`) from a short list. |
| `SearchBar`, `SearchField` | The unified pill search bar. |
| `Composer` | The chat input (`hero` or `dock`). |
| `List`, `ListRow` | Hairline-separated rows. `href` makes the whole row a link with a hover wash. |
| `Meta` | A muted line of facts joined with " · ", skipping empty parts. |
| `Price` | Bold amount plus muted unit ("$385/wk"). |
| `TrustMark` | A listing's verification status (`TRUST` holds the labels). `components/TrustBadge` wraps it and adds "ACA accredited". |
| `TextLink` | Inline link; `arrow`, `external`, tone `muted`. |
| `Notice` | A message that must stand out: `info`, `warn`, `success`, `error`. |
| `EmptyState`, `Skeleton` | Nothing to show; loading. |
| `cx` | Joins class names. Pass layout classes (margin, width) through `className`, not colors or sizes. |
