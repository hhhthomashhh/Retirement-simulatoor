# v4.0.3 production audit

Reviewed 2026-10-29. Production commit: `b859a0719d86f2d23a8d87d5cf8b5f6113ed19e7`.

## The actual deployed source

GitHub Pages publishes the repository root on `main`. Its `index.html` is a 1.6 KB loader, not the financial application. The loader concatenates `p403-00a.txt`, `p403-00b.txt`, `p403-01.txt` through `p403-10.txt`, base64-decodes the result and decompresses gzip into a 185,560-byte HTML application. `p403-00.txt` is not loaded. The older `src/` modules belong to v3.9 and are not used by this entrypoint. Editing those alone would not upgrade v4.0.3.

`reference/v4.0.3.html` is the exact decoded application, SHA-256 `e38edfd17b95401e92f18f25a5e987e1bc15be2e34001acf8dcb8d3084618ffa`. The original compressed files, older modules and historical v3.8 loader are retained. This development branch uses readable static modules instead of writing decompressed HTML into the document.

## Strengths retained

- Two-person/single household; separate RRSP/RRIF, TFSA, non-registered balances/cost bases and corporate investments.
- Tax-grossed-up withdrawals, dividend gross-ups/credits, federal BPA phaseout, OAS recovery, CPP/OAS claiming adjustments and RRIF minimums.
- Reproducible correlated normal or variance-scaled Student-t shocks; configurable return bounds; fees; stochastic inflation; paired allocation comparisons.
- Historical/hybrid simulation with explicit random tails, downside measures, lifestyle-floor and guardrail distinctions.
- One-time and recurring purchases, contingency events, funding preferences, expense audits and stress comparisons.
- Scenario storage, 3.9 migration fallback, JSON/CSV export, chart/representative-path PDF reports and PWA assets.

The volatility inputs ARE applied through the covariance Cholesky factor. They were checked; no volatility-scaling bug was found.

## Limitations found

The previous recommendation layer compares three fixed withdrawal orders. It does not search retirement dates or spending/withdrawal amounts over the lifetime. Its recommendations are heuristic text and sensitivity screens, not an optimizer.

Financial issues found and addressed in the updated basis are listed individually in CALCULATION-CHANGES.md. Remaining limits include BC-only personal taxation, no salary/work-expense cash-flow budget, no survivor transition, simplified corporate/security taxation, no GIS or AMT, and historical U.S. asset proxies without FX adjustment. Inflation is independent of market returns in parametric Monte Carlo. The older hybrid results can include random years and should not be called a pure historical backtest.

## Plan storage

v4.0.3 uses `retirement-simulator:4.0`; v3.9 uses `retirement-simulator:3.9`. Envelopes contain plan objects and saved scenarios. The upgrade reads these without modifying their keys and writes `retirement-simulator:4.1`. Unknown metadata, expenses and scenario plans are retained. Malformed stores produce an error rather than silently discarding data. No real private saved plan was available; migration tests use synthetic stores.
