# Tracking Function Summary Report

Source analyzed: `tests/method-definitions.generated.js`
Generated: 2026-03-15T01:22:51.806Z

## Overview
- Total extracted functions: 85
- Functions with at least one tracking indicator: 8
- Functions with no matched indicators: 77
- Indicator patterns evaluated: 26

## Top Functions By Tracking Indicator Score

| Rank | Export Name | Row | Original Name | Score | Matched Indicators |
|---:|---|---:|---|---:|---|
| 1 | row14__l | 14 | l | 7 | document access:3, createElement(script):1, appendChild:1, getElementsByTagName(script):1, script-src injection:1 |
| 2 | row2___0x59bcaf | 2 | _0x59bcaf | 4 | metrics:2, token:1, waf:1 |
| 3 | row10___0x953328 | 10 | _0x953328 | 3 | token:2, waf:1 |
| 4 | row15__I | 15 | I | 3 | eventBus:1, metrics:1, flog:1 |
| 5 | row18__l | 18 | l | 3 | window access:2, document access:1 |
| 6 | row19__I | 19 | I | 3 | eventBus:1, metrics:1, flog:1 |
| 7 | row3___0x2e727f | 3 | _0x2e727f | 3 | voucher:2, token:1 |
| 8 | row7___0x5a45d0 | 7 | _0x5a45d0 | 2 | token:2 |

## Indicator Totals Across All Functions

| Indicator | Total Matches |
|---|---:|
| token | 6 |
| document access | 4 |
| metrics | 4 |
| waf | 2 |
| eventBus | 2 |
| flog | 2 |
| window access | 2 |
| voucher | 2 |
| createElement(script) | 1 |
| appendChild | 1 |
| getElementsByTagName(script) | 1 |
| script-src injection | 1 |

## Notes
- This is a heuristic lexical scan, not full semantic classification.
- High scores indicate dense presence of tracking/network/storage/script-injection markers.
- Obfuscated functions may still contain tracking behavior that does not match these indicator patterns.
