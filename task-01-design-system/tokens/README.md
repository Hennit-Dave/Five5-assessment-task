# Nit's Cut tokens → CSS

Regenerate and validate from the repository root:

```sh
node task-01-design-system/tokens/build-css.mjs
node task-01-design-system/tokens/validate-css.mjs
```

- Sources (evidence, never edited):
  - `../evidence/06-tokens-complete.json` (Figma plugin export: primitives, Dark-mode role aliases, typography, shadows)
  - `../evidence/06b-tokens-colour-roles-modes-from-figma-state.json` (both Figma modes `Light` `19:1` and `Dark` `19:2` of `NC · M3 Colour roles` extracted from captured Figma Variables state `work/figma-m3-state.json`)
- Output: `generated/nc-tokens.css` (`192` primitives, `57` Light roles on `:root, [data-theme="light"]`, `57` Dark roles on `[data-theme="dark"]`, `15` typography styles/classes, `3` shadows), plus `generated/build-report.json`
- Requires Node 18+ (tested with v24.16.0). No external dependencies.

## How to use the variables

| Prefix | Use in interface code? | Meaning |
|---|---|---|
| `--nc-color-*` | Yes | Semantic colour roles (`primary`, `on-primary`, `surface`, `on-surface`, …) in Light and Dark modes |
| `--nc-type-*` / `.nc-type-*` | Yes | The 15 typography styles |
| `--nc-shadow-soft/medium/hard` | Yes | Brand shadows (`#334DAF` via `color-mix()`) |
| `--nc-ref-*` | **No** | Primitive tones; only semantic roles point at them |

Only `nc · m3 primitives` and `nc · m3 colour roles` are used. The earlier draft collections `nc · primitives` and `nc · colour roles` are excluded because they predate the M3 system and are not referenced by the current roles.
