/* Pure expense scheduling. Market RNG is never consumed by this module. */
(function(global){'use strict';
const categories=['Vehicle','Home maintenance','Roof / exterior','Home renovation','Appliances / HVAC','Dental','Medical','Long-term care / assistance','Family support','Travel','Emergency','Other'];
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function uniform(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function createState(){return new Map();}
function ageOf(e,key,plan){return e.timing==='year'?plan.A.age+e[key]-(plan.baseYear??2026):e[key];}
function validateExpenses(plan){const errors=[],seen=new Set();if((plan.expenses||[]).some(e=>e.enabled)&&!Number.isInteger(plan.A.age))errors.push('Use a whole current age for Person A when scheduling new expenses.');for(const e of plan.expenses||[]){const n=e.name||'Expense';if(!e.id||seen.has(e.id))errors.push(n+': unique expense ID required.');seen.add(e.id);if(!e.enabled)continue;if(!e.name?.trim())errors.push('Expense name required.');if(!['one-time','recurring','contingency'].includes(e.type))errors.push(n+': invalid expense type.');if(!['age','year'].includes(e.timing))errors.push(n+': choose age or year.');if(!['today','future'].includes(e.dollars))errors.push(n+': invalid dollar basis.');if(!['plan','balanced','rrsp','corp','tfsa'].includes(e.funding))errors.push(n+': unsupported funding preference.');for(const k of ['start','end'])if(!Number.isInteger(e[k]))errors.push(n+': ages/years must be whole numbers.');const a=ageOf(e,'start',plan),b=ageOf(e,'end',plan);if(a<plan.A.age||b<a||a>=plan.planAge||b>=plan.planAge)errors.push(n+': dates must fall within the simulated years (current age through plan age minus one).');if(e.type==='recurring'&&(!Number.isInteger(e.interval)||e.interval<1))errors.push(n+': repeat interval must be a positive whole number.');for(const k of ['amount','min','max'])if(!Number.isFinite(e[k])||e[k]<0)errors.push(n+': costs must be finite and non-negative.');if(e.max<e.min)errors.push(n+': maximum cost must be at least minimum cost.');if(e.type==='contingency'){if(e.dollars==='future')errors.push(n+': contingency costs use today’s dollars; select inflation adjustment as needed.');for(const k of ['probability','endProbability'])if(!Number.isFinite(e[k])||e[k]<0||e[k]>1)errors.push(n+': probability must be 0–100%.');if(!Number.isInteger(e.gap)||e.gap<0||!Number.isInteger(e.maxOccurrences)||e.maxOccurrences<0)errors.push(n+': limits and spacing must be non-negative whole numbers.');}}
if(![1,1.25,1.5,2].includes(plan.expenseStress??1))errors.push('Select a supported stress multiplier.');return errors;}
function eventsForYear(plan,pathIndex,age,cumInf,state){const events=[];for(const e of plan.expenses||[]){if(!e.enabled)continue;const start=ageOf(e,'start',plan),end=ageOf(e,'end',plan);if(age<start||age>end)continue;let s=state.get(e.id);if(!s){s={count:0,last:-Infinity,firstInflation:cumInf};state.set(e.id,s);}let occurs=false,amount=e.amount;
 if(e.type==='one-time')occurs=age===start;
 if(e.type==='recurring')occurs=(age-start)%e.interval===0;
 if(e.type==='contingency'&&plan.includeContingencies&&plan.mode!=='historical'){
   const u=uniform(hash(`${plan.seed}|contingency|${pathIndex}|${e.id}|${age}`));
   const p=e.ageProbability?e.probability+(e.endProbability-e.probability)*(age-start)/Math.max(1,end-start):e.probability;
   occurs=(!e.maxOccurrences||s.count<e.maxOccurrences)&&age-s.last>=Math.max(1,e.gap)&&u()<p;
   if(occurs&&e.amountMode==='range')amount=e.min+u()*(e.max-e.min);
 }
 if(!occurs)continue;s.count++;s.last=age;
 const scale=!e.inflation?1:e.dollars==='future'?cumInf/s.firstInflation:cumInf;
 const stress=e.stress?(plan.expenseStress??1):1,cost=amount*scale*stress;
 events.push({id:e.id,name:e.name,category:e.category,type:e.type,age,year:(plan.baseYear??2026)+age-plan.A.age,enteredAmount:amount,nominal:cost,todayCost:cost/cumInf,funding:e.funding,notes:e.notes||'',taxTreatment:'After-tax spending; no expense tax credit modeled',stress});
}return events;}
global.ExpenseEngine={categories,hash,uniform,createState,ageOf,validateExpenses,eventsForYear};
})(globalThis);
