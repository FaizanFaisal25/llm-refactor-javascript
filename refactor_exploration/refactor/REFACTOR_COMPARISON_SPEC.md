# Refactor Equivalence Check Spec

## Goal

Compare extracted functions from `method_definition` (original) and `method_code_refactored` (refactored) and classify each pair as:

- `equivalent_except_tracking`
- `behavior_changed_non_tracking`
- `inconclusive`

The intended interpretation is: no observed non-tracking behavior loss, with tracking-related differences allowed.

## Inputs

- Original extracted functions: `method_definition_functions.js`
- Refactored extracted functions: `method_code_refactored_functions.js`

Pairing key:

- `(row, functionIndex)`

## Execution Model

Each function is executed inside a VM sandbox with:

- deterministic stubs for unknown globals and chained property access
- fake timers and fake promise implementation to reduce async side effects
- instrumentation of calls and writes

## Tracking Detection Heuristic

A call/write path is treated as tracking-related when it matches one of:

- `track`, `tracking`, `analytics`, `cookie`, `visitor`, `audience`, `mbox`, `beacon`, `consent`, `adobe`, `utm`, `pixel`, `telemetry`, `dyid`, `event`, `optout`, `measure`, `segment`, `campaign`, `clickid`

Everything else is treated as non-tracking.

## Test Inputs Per Function Pair

For each pair, multiple argument vectors are generated (arity-capped):

- all `undefined`
- numeric sequence (`1..n`)
- mixed object/string/bool/list/object
- optional heuristic cases (array/origin/cookie-sensitive)

## Comparison Rules

For each generated case:

1. Compare outcome type (`return` vs `throw`)
2. If returned, compare normalized return values
3. If thrown, compare error type
4. Compare non-tracking call sets
5. Compare non-tracking write sets

Tracking call/write differences are recorded but allowed.

Classification:
 
- Any mismatch in 1-5 => `behavior_changed_non_tracking`
- All cases pass => `equivalent_except_tracking`
- Missing pair on either side => `inconclusive`

## Outputs

- Detailed JSON report: `method_code_refactor_comparison_report.json`
- Human summary: `method_code_refactor_comparison_summary.md`

## Limitations

- This is differential testing, not a formal proof.
- Results depend on generated inputs and sandbox approximations.
- Behavior requiring real browser/network/runtime integration may be under-exercised.
- Tracking classification is heuristic and can be tuned if your policy differs.

## Run

```bash
node compare_refactor_functionality.js
```
