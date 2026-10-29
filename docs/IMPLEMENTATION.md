# Implementation and validation

Version: 4.1.0-dev, development branch `development/retirement-optimizer-4.1`. Production v4.0.3 is deliberately not replaced.

## What the optimizer searches

1. Normalize and validate a plain plan object, retaining expenses/account handling. Optimization requires whole annual ages. It does not run a cloud calculation.
2. Construct paired future-calendar market paths. Training uses 20 paths by default; age/spending screening 64. Holding calendar paths constant avoids giving a delayed retirement a different set of future markets. Contingencies have deterministic, bank-specific seeds too.
3. Evaluate all four existing account-order policies as incumbents. Start additional policies with different registered-income targets. Use bounded coordinate search to change six numerical controls: per-person RRSP taxable-income targets and corporate funding fractions in the before-65,65–71,72+ life stages. Targets react to existing taxable income, balances, mandatory RRIF draws and inflation. Corporate fractions apply to the remaining after-tax cash need. Policies have no knowledge of future returns within a path.
4. Score the entire lifetime, giving shortfall failures a strong penalty, then a blend of downside and median after-tax ending value with a modest lifetime-tax penalty. Lower tax alone cannot win by delivering materially less retirement wealth. This is tax-efficient planning across years, not a guaranteed minimum-tax T1/T2 solution.
5. Enumerate the requested retirement-age range. Screen fixed and searched policies at each age; refine near the first passing age and validate candidate ages in order on another seed. Return the earliest validated age **found**, or an explicit no-solution result. Not every possible policy at every earlier age is exhausted.
6. Search spending by bracketing and bisection over the policies, then calibrate on an additional seed at a two-percentage-point higher target, rounding down to $500. Confirm once on the held-out market bank. If it fails, label it unconfirmed rather than quietly lowering the goal based on validation outcomes. This is an estimated sustainable budget within the search bounds, not a proof of the global maximum.
7. Compare the selected policy with fixed alternatives at identical retirement age, spending and holdout paths. Report nominal-path ledgers in real dollars, median lifetime taxes, after-tax liquidation estimates, downside values, depletion and Wilson intervals. Success means full required spending including enabled expenses, without guardrail cuts. The confidence interval measures sampling uncertainty within the model, not confidence in future financial outcomes.
8. Run all available complete historical windows plus a five-year-block bootstrap check. No random tail is appended to the complete-window check. Historical proxies and limits are prominent.

A worker keeps the browser responsive. Cancellation terminates it. A local no-worker fallback exists, with stage-level yielding. The old detailed simulator remains batched, as in v4.0.3; it is not silently replaced by the optimizer.

## Architecture

| Location | Responsibility |
|---|---|
| `index.html`, `manifest.json`, `sw.js`, `icons/` | Readable static app shell, PWA assets, scoped versioned offline cache |
| `reference/v4.0.3.html` | Immutable decoded production reference |
| `optimizer/core-v403.js` | Preserved headless original financial core |
| `optimizer/engine.js` | Headless versioned financial engine and expense integration |
| `optimizer/improvements.inc.js` | Authoritative source for new tax/corporate/policy helpers; assembled into engine |
| `optimizer/optimizer.js` | Pure plan validation, path banks, policy search, age/spending search, validation and stress checks |
| `optimizer/worker.js` | Background calculation boundary |
| `optimizer/storage.js` | Replaceable storage adapter; migration without old-key writes |
| `optimizer/ui.js`, `optimizer/optimizer.css` | Simple recommendation dashboard, import/apply/export bridge, responsive presentation |
| `optimizer/legacy-ui.js`, `optimizer/legacy.css` | Existing interface, charts, expense controls, scenarios and PDF reports |
| `scripts/` | Reproducible extraction and assembly tools |
| `tests/` | Immutable original fixtures, financial/simulation/storage/search tests and static checks |
| `.github/workflows/optimizer-tests.yml` | CI checks on development branch and PR |

No framework migration or backend dependency. The old `src/` and compressed payloads remain for provenance; the new entrypoint does not import them.

## API

Node:

```js
const optimizer = require('./optimizer/optimizer.js');
const result = await optimizer.optimize(planData, {
  target: 0.90, minAge: 55, maxAge: 70, validationPaths: 512
}, progress => console.log(progress.message));
```

The browser worker imports the same modules. `normalizePlan`, `evaluate`, `marketBank`, `policyPlan` and `completeHistoricalBank` also support headless analysis. Financial code uses no form elements. Original detailed UI code consumes the headless core and retains the original report functions.

## Scope of testing

See TEST-RESULTS.md for executed results. Tests are deterministic and use the public repository's defaults and synthetic fixtures, not private device-saved plans. The golden suite compares complete annual ledgers and aggregate outputs against the **decoded original application**, not another copy of the new implementation.

The mathematical retirement case uses $100,000 TFSA, no returns/income/taxes/contributions, a horizon at age 70 and a $20,000 annual goal. The earliest feasible age is 65; this checks a known answer independently of the implementation. Statistical checks validate return moments and contingency frequency. Tax tests include hand-calculated liabilities and edge rules, not a claim of complete CRA certification.

## Remaining limitations / next priorities

- BC resident taxation only. Other provinces must not use this as a province-correct tax projection.
- Salary, work costs, contribution financing, CPP contribution-history changes from earlier retirement and pension entitlements require user review. The model assumes work-funded additions remain affordable until the selected stop dates. Corporate saving stop can follow retirement or stay fixed; a partner's date can stay fixed or move with it.
- Search is a bounded policy heuristic. It does not optimize CPP/OAS claim ages, asset allocation, RRIF conversion election, every annual withdrawal dollar or stochastic dynamic-programming decisions globally.
- Corporate caveats in CALCULATION-CHANGES.md apply. No AMT/GIS, survivor/death transitions, emigration, LCGE/practice-sale planning or complete T1 credits/transfers. Personal capital-loss carryforwards are supported in the annual engine, but corporate loss carryforwards are not. Prior personal losses reduce taxable income, not OAS/age-credit net income.
- Historical dataset is inherited, U.S. asset proxies with Canadian inflation; no CAD FX conversion. Data provenance/Canadian diversification needs a separately verified dataset project. Block bootstrap does not create independent historical evidence.
- Annual return-before-withdrawal and dividend-yield assumptions from the existing engine remain approximations. Parametric shocks/inflation and return bounds are assumptions, not forecasts.
- Physical iPhone/iPad/Android testing, actual PWA installation/offline device testing and independent tax-professional review remain release tasks. This branch is ready for review, not represented as a certified financial-planning product.
