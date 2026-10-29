# Executed test results — 4.1.0-dev

2026-10-29, Node v24.22.1 / Python 3.12.14 in the development environment.

- **36 automated tests passed**, zero failures (`node --test tests/*.test.cjs`).
- **15 golden regression paths passed**: five household/strategy/historical cases × path indices 0,1,7. Every annual balance, withdrawal, tax, expense row and aggregate exactly matches the decoded original v4.0.3 when compatibility mode is selected.
- **Static checks passed**: JavaScript syntax, unique form IDs, linked runtime assets, complete service-worker shell and no external runtime script/API dependency.
- **Chrome browser workflow passed**: load default plan, start the worker, watch progress, receive recommendation, independently validated spending amount, tax/estate results, strategy comparison and detailed disclosure rows.

The financial suite includes a hand-calculated 2026 $100,000 BC liability, age/pension credits, OAS recovery and deduction, dividend gross-ups, gains inclusion, pension splitting, RRIF opening FMV, calendar-based BC pause, first-year inflation, single-household account handling, personal losses, corporate CDA/GRIP/refund limits and after-tax expense gross-up. The carried-loss test explicitly checks that prior-year losses do not reduce OAS/age-credit net income.

Simulation checks include seed reproduction, different validation/contingency seeds, geometric return/SD calibration over 50,000 samples, paired markets across retirement dates, complete historical windows without random tails, preserved five-year bootstrap tuples and contingency frequency over 30,000 trials. Storage checks cover synthetic 4.0/3.9 migrations, scenarios, policy arrays, metadata preservation and retained corrupt stores.

The analytical optimizer case (zero return/income/tax, $100,000 TFSA, $20,000 yearly spending, age-70 horizon) recovers the known earliest retirement age of 65 and the expected spending capacity. Additional checks verify no-solution handling, input immutability, full-run reproducibility, bounded search and incumbent fixed-strategy preservation.

`tests/optimizer-example.json` records the standard public-default example, including settings/outcomes, policy, strategy differences and measured elapsed seconds. It is a software fixture result, not a personalized recommendation to Thomas or a forecast. Browser and Node default runs produced a confirmed $147,000 illustrative spending budget after calibration, rather than the unconfirmed $155,000 initial screen. Final exact metrics are recorded in that JSON.

Not executed: physical iPhone/iPad/Android tests, actual app-store/native packaging, installed-PWA offline tests, independent accountant certification or a comparison against commercial products. Browser rendering was checked in desktop Chrome; responsive CSS and touch target sizes were implemented, but full device coverage is not claimed. CI repeats automated checks on the development branch/PR where repository Actions permissions permit it.
