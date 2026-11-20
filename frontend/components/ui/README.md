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
- **Status is a stoplight with a shape and a word.** Use `StatusMark`, `StatusDot`,
  `statusEdge` or `Notice`, never a bare status color: check:ui flags `text-go`, `bg-caution-soft`,
  `text-checked`, `text-warn` and their kin outside this folder. Form errors keep `text-error`.
  `scripts/check-contrast.mjs` (also in check:ui) checks every status text pair at 4.5:1 and
  every shape at 3:1 on bg, surface, tint and the tone's soft fill.
- **Motion:** color and background transitions (150 ms), the page fade, and press feedback.
  Nothing lifts, slides or staggers, with two exceptions that each tell part of the story and
  play once: the home headline's highlighter draws across, and the example summer's weeks fill
  in left to right when it scrolls into view, open weeks last. `prefers-reduced-motion` turns
  it all off (globals.css).
- **Press feedback:** a control answers on press, not on release. Buttons, round buttons, chips
  and tiles carry `press` and shrink to 97% while held; rows tint and text links dim. Under
  reduced motion only the color change stays. From the `apple-design` skill.
- **The header** is a translucent material whose hairline fades in once content scrolls under
  it (`.chrome`). Reduced transparency and increased contrast make it solid; increased contrast
  also strengthens every hairline.
- **Full height is `dvh`.** `min-h-dvh` or `h-dvh`, never `h-screen` or `100vh`, which run under
  a phone's browser bar and hide the bottom of the page. check:ui flags both.
- **Never block paste.** Parents paste policy numbers, phone numbers and sign-in codes.
  check:ui flags `onPaste`; a handler that only reads what was pasted carries a
  `ui-check-ignore` comment saying so.
- **Ask before anything a parent can't take back.** Deleting, leaving a family, removing a
  person, resetting a link: the question says what is lost, then the action runs. A removal
  that one tap puts back doesn't need the question.
- **Numbers in a column take `tabular-nums`**, so prices, dates and counts line up row to row.
- `npm run check:ui` enforces the mechanical parts in CI. A line that must break a rule (for
  example a literal color in Next metadata) ends with a `ui-check-ignore` comment saying why.

## Tokens

Defined once as CSS variables in `app/globals.css` (`:root`), mapped to role names in
`tailwind.config.ts`. A dark theme redefines the variables; nothing else changes. When it
comes, show depth with lighter surfaces, not shadows, which barely read on a dark page.

| Role | Use |
| --- | --- |
| `bg` | page background (paper) |
| `surface` | inputs, menus, the rare container (white) |
| `ink` | text and icons (night navy) |
| `muted` | secondary text, AA on `bg` and `surface` |
| `line` | hairlines and borders. Translucent (`--line-alpha`), so it shows on any fill |
| `tint` | hover wash on rows and ghost buttons, info notices |
| `accent`, `accent-hover`, `accent-ink` | primary buttons and the user's chat bubble; text on them |
| `highlight`, `highlight-soft` | flashlight yellow: fills only, sparingly, never text |
| `go`, `go-soft` | status go: done, confirmed, has a place (#2E6B3F on #E3EFE5) |
| `caution`, `caution-soft` | status caution: in progress or at risk (#8A5300 on #FDEED6). Not the flashlight yellow, which means checked |
| `stop`, `stop-soft` | status stop: a gap or a blocker (#B42318 on #FEF3F2) |
| `checked`, `checked-soft` | trust: verified. An alias of `go` |
| `warn` | warn notices and the odd test label; status uses `caution` |
| `error`, `error-soft` | errors, remove, delete |
| `focus` | focus outline |
| `series-1…5` | one color per kid on the family week (identity only) |

Type: `text-display` (home hero only), `text-h1` (page title), `text-h2` (section),
`text-h3` (row and card titles), `text-lead`, `text-body`, `text-small`, `text-caption`.
Radius: `rounded-sm` 8, `rounded-md` 12, `rounded-lg` 16, `rounded-pill`. A rounded thing
inside another one gets the outer radius minus the padding between them, so the corners
stay concentric (`Composer` is the worked example). Shadow:
`shadow-soft`, only for floating things (composer, search bar, menus, and the example summer,
which sits on the page like a screen from the app). Widths:
`max-w-narrow` 720, `max-w-default` 1024, `max-w-wide` 1152, `max-w-measure` 65ch.
Spacing follows Tailwind's 4px scale; stick to 1, 2, 3, 4, 6, 8, 12, 16 (and 24 for page
top space).

## Primitives

| Component | For |
| --- | --- |
| `Button` | Every button. `primary` (one per view), `secondary`, `ghost`, `link` (inline action), `quiet` (cancel, housekeeping), `danger` (remove, delete). Sizes `sm`/`md`/`lg`. `href` renders a link; `external` opens a new tab. `icon`/`leadingIcon` add an Icon. |
| `IconButton` | A round button with one icon. `label` is required. |
| `Icon` | Inline SVG line icons: arrow-right, arrow-left, arrow-up, check, search, x, chevron-*, calendar, user, plus, external, bell, lock, users, board, chat, clock, and the four status shapes (status-go, status-caution, status-stop, status-neutral). Stroke is 1.5px to match body text; `Button` raises it to match its semibold label. |
| `Heading` | `display`, `h1`, `h2`, `h3`; `as` overrides the element. |
| `Text` | `lead`, `body`, `small`, `caption`; tones `ink`, `muted`, `error` (`checked` and `warn` remain for trust and notices; a status uses `StatusMark`). Capped at 65ch unless `wide`. |
| `Container` | Page width (`narrow`, `default`, `wide`) and gutters. |
| `Stack` | Flex column or row with a gap from the rhythm. |
| `Section` | Heading, optional description and action, content. `divided` adds the top hairline. |
| `Divider`, `Surface` | A hairline; a white container. |
| `Input`, `Textarea`, `Select` | Form controls (`fieldSize` `sm`/`md`). |
| `Field` | Label, control, hint, error. Children can be a function of the generated id. |
| `Checkbox`, `ChoiceChip` | A single yes/no; pick several (or one, `type="radio"`) from a short list. |
| `SearchBar`, `SearchField` | The unified pill search bar. |
| `Composer` | The chat input (`hero` or `dock`). |
| `ActionTile` | A large button for one thing a person can do: icon on a yellow square, a verb-first title, an optional hint. `href` makes it a link, `onClick` a button. With `children`, `expanded` and `onToggle` it is a preview: the tile opens in place to show a short explanation and the button that goes on, so nobody lands on a new page before knowing what it is. Keep one preview open at a time. Use a grid of tiles where a page would otherwise describe its features. Hover darkens the border; disabled fades to 40%. |
| `List`, `ListRow` | Hairline-separated rows. `href` makes the whole row a link with a hover wash. |
| `Meta` | A muted line of facts joined with " · ", skipping empty parts. |
| `Price` | Bold amount plus muted unit ("$385/wk"). |
| `TrustMark` | A listing's verification status (`TRUST` holds the labels). `components/TrustBadge` wraps it and adds "ACA accredited". |
| `StatusMark` | A status as shape plus word: `tone` go, caution, stop or neutral; `size` sm (caption) or md (small); `weight="regular"` for a sentence. |
| `StatusDot` | The shape alone, for dense places: go a filled circle with a check, caution a half-filled circle, stop an open ring, neutral a dash. Sizes sm 12, md 14, lg 20. Pass `label` when it stands without a word. |
| `StatusCounts`, `StatusLegend` | "6 weeks set · 2 in progress · 2 open" from counts by tone; a key of shapes and what they mean on this page. |
| `StatusStrip` | One segment per item (a week), tinted and shaped by tone. Each segment has its own accessible name and can link to its row. |
| `statusEdge(tone)` | Classes for a quiet 2px left edge in the tone's color on a row or cell. |
| `TextLink` | Inline link; `arrow`, `external`, tone `muted`. |
| `Notice` | A message that must stand out: `info`, `warn`, `success`, `error`. |
| `EmptyState`, `Skeleton` | Nothing to show; loading. |
| `cx` | Joins class names. Pass layout classes (margin, width) through `className`, not colors or sizes. |
