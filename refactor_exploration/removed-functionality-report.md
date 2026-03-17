# GTM Neutralization Removal Report

This report explains what functionality was removed when replacing the legacy GTM runtime with the compatibility shim.

## Scope Compared

- `backups/original.original.js` (legacy GTM runtime; ~20,111 lines)
- `original.js` (neutralized compatibility shim; 25 lines)
- `backups/planned-parenthood-gtm.original.js` and `planned-parenthood-gtm.js` are already identical shims

## Why So Much Could Collapse to a Small Shim

The old file is a generated Google Tag Manager container runtime with configuration and dozens of internal helpers. The app typically only needs a few globals to exist (`dataLayer.push`, `gtag`, `google_tag_manager.e`) so page code does not crash. The shim keeps those interfaces but removes tracking behavior.

## Major Removed Functionality (from `backups/original.original.js`)

1. GTM container configuration graph
   - `"macros"` starts at line ~18
   - `"tags"` starts at line ~338
   - `"predicates"` starts at line ~608
   - `"rules"` starts at line ~787

2. Legacy eval execution path
   - Old behavior had `google_tag_manager.e` execute `eval` (`return eval(s);`, line ~6)
   - Shim replaces with no-op `google_tag_manager.e` that returns `undefined`

3. Tag execution payloads and injected HTML scripts
   - 15 `__html` tag payload entries (around lines ~466 to ~599)
   - Included remote script loads through `data-gtmsrc` and script templates

4. Consent and trigger orchestration logic
   - Consent-related references are pervasive (`consent` appears many times)
   - Multiple trigger/rule blocks and predicate matching logic removed

5. Third-party and cross-frame integration logic
   - Hotjar config (`vtp_hotjar_site_id`)
   - Freshpaint bootstrap/consent integration
   - YouTube iframe API and activity tracking hooks
   - postMessage-based iframe client-id sharing flows

6. Internal GTM helper/runtime functions
   - 19 distinct `__*` helper types found (e.g., `__v`, `__jsm`, `__html`, `__zone`, `__tg`)
   - These include variable lookup, JS macro eval wrappers, tag runners, zoning, consent helpers, etc.

## Current Shim Behavior (what remains)

- Initializes `window.dataLayer` if missing
- Overrides `dataLayer.push` with a no-op that preserves array length
- Defines no-op `window.gtag`
- Defines `window.google_tag_manager.e` as a safe no-op returning `undefined`
- Uses an idempotent guard (`dataLayer._pp_noop`) so repeated execution is safe

## Important Note About "Both Files"

In the current workspace snapshot, only `backups/original.original.js` contains the large legacy runtime. Both current JS files and `backups/planned-parenthood-gtm.original.js` are already the same 25-line shim.
