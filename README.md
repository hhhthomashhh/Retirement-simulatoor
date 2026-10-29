# Canadian Retirement Optimizer 4.1 development upgrade

A tested development upgrade of **Retirement Simulator v4.0.3**, for BC residents with personal and corporate investment accounts. It remains a browser application, with calculations and plans on the device. No account, financial-data upload, backend or runtime package dependency is required.

**Production is not replaced by this development branch.** The real original is preserved at `reference/v4.0.3.html`. See [repository audit](docs/REPOSITORY-AUDIT.md), [calculation changes](docs/CALCULATION-CHANGES.md), [tax sources](docs/TAX-SOURCES.md) and [implementation / testing](docs/IMPLEMENTATION.md).

## Use the development application

1. Check out `development/retirement-optimizer-4.1` from this repository.
2. In that directory run `python3 -m http.server 8000` (any local static server works).
3. Open `http://localhost:8000/` in a current browser. No npm install or build is required.
4. Enter household information and balances. Review savings, CPP/OAS and enabled irregular expenses in the detailed section. Select **Find my retirement plan**.
5. Read the recommended age, validated spending budget, full-goal success and comparison of withdrawals. Inspect annual cash flows if needed. Apply the recommendation to the editor, then save as a scenario.

The original detailed simulator, expense editor, historical/hybrid runs, allocation comparisons, stress tests, scenarios, and PDF/CSV/JSON exports remain under the detailed section. A planning horizon of age 95 means the model funds annual steps until the 95th birthday, preserving the original horizon convention. The optimizer requires whole-year ages.

A direct `file://` launch is not the supported PWA/worker path. Use HTTP localhost or HTTPS hosting. The legacy calculator's single-file reference remains available for inspection.

## Test

Requires Node 20+ and Python 3. Standard-library tests; no installation:

```sh
npm test
```

`node tests/baseline.cjs` intentionally re-records the original v4.0.3 golden fixtures; do not run it merely to make a regression failure pass. Fixture generation reads the immutable reference, never the new engine. `npm run rebuild` reproducibly extracts the engine/UI modules from the reference, applies the explicitly versioned changes, and regenerates the app shell. Runtime modules and root HTML are checked in, so users do not need the generator.

## Deploy after review

Review the development branch and its tests, back up saved plans using the production app's Export all saved scenarios, and then merge the reviewed branch into `main` when ready. Existing GitHub Pages should publish the root `index.html`. Do not switch Pages to the old `src/` directory or compressed files. Retain the `optimizer/`, `icons/`, `manifest.json` and `sw.js` assets.

Test the deployed page, reload once, and verify the 4.1 development label before entering live planning data. The upgrade uses a new storage key; old 4.0/3.9 data stays intact. HTTPS is required for PWA installation away from localhost. Use the browser's install/Add to Home Screen action after the shell loads. Offline use requires one complete initial load. Update the service-worker version for each release; the worker refreshes cached assets when online and uses them offline.

To roll back before a release, keep `main` on the current production commit. After a release, revert the upgrade commit through normal Git history; no saved 4.0/3.9 key was overwritten. Export any new 4.1 plans before using an older app, which may ignore new policy fields.

## Mobile/native direction

The optimizer and engine accept plain objects and have no DOM dependency. They can be reused in a future Capacitor wrapper. Keep `optimizer/storage.js` as the device-storage boundary; a native adapter can replace its localStorage adapter. Keep browser exports/print in the UI layer. A native release still needs native packaging, filesystem/share adapters, app-store work and physical-device validation. Capacitor is not required for the web app.

This is a bounded, validated first optimizer release, not feature parity with Adviice, MoneyReady or Optiml. The documented tax and model limitations matter when interpreting a recommendation.
