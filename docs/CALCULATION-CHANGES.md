# Calculation changes from v4.0.3

Updated rules apply to the new 4.1 basis. Select **Original v4.0.3 compatibility** to retain the previous calculations and return model. The 15 golden regression paths use the immutable decoded original as their oracle. There are no unexplained changes to the original baseline.

| Area | What v4.0.3 does | Why change / updated behavior |
|---|---|---|
| RRIF minimum | Multiplies the account after annual investment returns by the age factor | CRA requires opening-year FMV. Updated mode uses the beginning-year RRSP/RRIF value, with no minimum in the conversion year. Ages remain annual model ages; no birthdays/monthly timing or younger-spouse election is modeled. |
| Age credit | Omits federal/BC age amounts | Includes income-tested federal $9,208 and BC $5,927 base amounts, with their 2026 thresholds and 15% phaseouts. |
| Pension credit | Omits RRIF pension credits | Includes up to $2,000 federal and $1,000 BC eligible pension income. In this engine the pension field represents RRIF income; a split recipient younger than 65 gets taxable income but no RRIF pension credit. |
| OAS recovery | Adds recovery tax while retaining gross OAS in taxable income | Repayment is deductible at line 23500. Updated mode computes recovery from pre-deduction income, then deducts it before regular income tax and credit income tests. Annual accrual approximates monthly withholding. |
| Pension splitting | Tests 0%,10%,20%,30%,40%,50% | Searches tax/credit breakpoints and both lawful transfer directions, capped at 50%. No CPP/OAS splitting; no transfer from an ineligible RRIF donor younger than 65. Breakpoint search is a planning approximation in complex phaseout combinations. |
| BC index pause | Freezes first five simulation years, irrespective of base calendar year | Freezes 2026 bases through calendar 2030, resumes in 2031. Federal/OAS indexation remains a projection with modeled inflation. A future base year projects from verified 2026 values using the plan's inflation assumption. |
| First-year dollars | Inflates spending and tax parameters once immediately | First model year uses entered today's-dollar spending and tax bases; later years index once per step. Annual return-before-withdrawal convention otherwise remains. |
| Single household | Surplus can enter a nonexistent spouse's TFSA/non-reg; pension splitting/ownership may still allocate there | Disables spousal splitting and corporate/passive allocation to a nonexistent spouse; retains surplus in the actual person's accounts. |
| Personal ACB / losses | Disposes cost at no more than sale value; no capital-loss carryforward | Uses proportional ACB, allows ACB above FMV, nets realized losses against capital gains and carries unused capital losses forward within the run. No carryback, superficial-loss rule or full tax-return election machinery. Opening losses can be supplied as `A.capitalLoss` / `B.capitalLoss` in gain-dollar units; the basic editor has no dedicated field. |
| Corporate taxation | One combined RDTOH pool; all taxable distributions are non-eligible; cost base can be reduced on unrealized loss | Optional split-pool model tracks eligible/non-eligible RDTOH, GRIP and eligible/non-eligible shareholder dividends; limits eligible payouts to GRIP; applies dividend refund ordering; preserves cost base during price losses. Existing combined opening RDTOH is conservatively allocated to NERDTOH unless an eligible portion is supplied. |
| Final depletion | Omits depletion flag in final step | Includes final-step depletion while still distinguishing fully funded horizon spending from remaining assets. The nominal $1,000 depletion threshold is retained. |

## New options, rather than corrections to a falsely claimed bug

The original return engine explicitly adds 0.5 percentage points to equity assumptions before approximate arithmetic conversion. Its fat-tail generator is variance-scaled and covariance correctly applies SD inputs. Both are retained as the original return-model option.

New **geometric returns as entered** uses correlated lognormal shocks, preserving the entered geometric mean and calibrating the marginal annual return SD before portfolio return limits. It does not add the original uplift. Fees and the existing optional loss/gain bounds still apply; those bounds change tail moments. Correlation is applied to log shocks and is only approximately the correlation of simple returns. This is an alternative assumption set, not a claim that lognormal markets predict reality.

The optimizer adds complete-window historical checks without random tails and five-year moving-block bootstrap stress tests. Both reuse the inherited data, honestly labelled U.S. proxies; they do not pretend to be a validated Canadian-dollar backtest. Parametric inflation remains independent; block bootstrapping retains observed return/inflation tuples.

## Corporate scope

The split-pool option is a more detailed investment-only BC CCPC model, **not** a T2 computation. It assumes non-connected Canadian portfolio dividends, permitted shareholder payments, the supplied ownership split, and user-supplied passive/refundable tax rates. It does not model TOSI, connected-company dividend refunds, active-business income/SBD grind, full foreign-tax-credit calculations, corporate capital-loss carryforwards, all CDA adjustments, shareholder loans or GRIP additions from future active business income. Refund cash is reinvested in the same annual step. Corporate gain realization uses an average portfolio cost base. Obtain tax review before implementing a recommended distribution.

The default 50.67%,30.67%,38.33% corporate rates are rounded planning inputs retained from v4.0.3. The underlying federal statutory amounts are 38 2/3% Part I on investment income, 30 2/3% refundable and 38 1/3% refund rate; BC general corporation rate is 12%. These are separately documented, not silently substituted for user-entered rates.
