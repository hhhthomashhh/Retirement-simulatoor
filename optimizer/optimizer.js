/* Local multiyear policy search. No DOM, remote service, or future-path foresight. */
(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.RetirementCore;
const copy=x=>JSON.parse(JSON.stringify(x));
const q=(a,p)=>C.percentile(a,p);
function validatePlan(p){
 const errors=[];
 for(const key of ['baseYear','planAge','seed','spend','infMean','infStd','eqPersonal','eqCorp','fee','corpFee','corp','corpACB','corpCDA','corpRDTOH','corpAdd','corpAddUntil','corpOwnerA','passiveCash','passiveTaxable','passiveStart','passiveStop','corpPassiveTax','corpRefundable','corpRefundRate','lump','lumpAge','maxDrop','maxGain'])if(!Number.isFinite(p[key]))errors.push(key+' must be a finite number.');
 if(errors.length)return errors;
 if(!Number.isInteger(p.baseYear)||p.baseYear<2026||p.baseYear>2100)errors.push('Plan year must be 2026–2100.');
 if(p.spend<=0||p.planAge>110||p.planAge<=p.A?.age||p.planAge-p.A?.age>80)errors.push('Use positive spending and a planning age up to 110, after your current age (maximum 80 years).');
 for(const who of ['A',...(p.couple?['B']:[])]){const x=p[who];if(!x){errors.push('Person '+who+' is missing.');continue;}
  for(const key of ['age','ret','rrsp','tfsa','tfsaRoom','nr','acb','addRRSP','addTFSA','addNR','cppAge','cpp65','oasAge','oas65','rrifAge'])if(!Number.isFinite(x[key])||x[key]<0)errors.push(who+'.'+key+' must be a non-negative number.');
  if(!Number.isInteger(x.age)||!Number.isInteger(x.ret)||x.age<18||x.ret<x.age||who==='A'&&x.ret>=p.planAge)errors.push(who+': use whole ages, with retirement no earlier than now.');
  if(x.cppAge<60||x.cppAge>70||x.oasAge<65||x.oasAge>70)errors.push(who+': CPP must start at 60–70; OAS at 65–70.');
  if(x.rrifAge<18||x.rrifAge>71)errors.push(who+': RRIF conversion age must be at most 71; past conversion is allowed.');
 }
 for(const k of ['gmFI','gmCAD','gmUS','gmINTL'])if(!Number.isFinite(p[k])||p[k]<=-.5||p[k]>.3)errors.push(k+': use a geometric return between -50% and 30%.');
 for(const k of ['sdFI','sdCAD','sdUS','sdINTL','infStd'])if(!Number.isFinite(p[k])||p[k]<0||p[k]>.8)errors.push(k+': use a volatility from 0–80%.');
 for(const k of ['eqPersonal','eqCorp','corpOwnerA','passiveOwnerA','corpPassiveTax','corpRefundable','corpRefundRate'])if(p[k]<0||p[k]>1)errors.push(k+' must be 0–100%.');
 for(const k of ['fee','corpFee'])if(p[k]<0||p[k]>.1)errors.push(k+' must be 0–10%.');
 if(p.infMean<-.01||p.infMean>.15||p.corp<0||p.corpACB<0||p.corpRDTOH<0||p.corpCDA<0||p.corpAdd<0||p.lump<0)errors.push('Check inflation, balances, costs and contributions.');
 if((p.corpEligibleRDTOH||0)>p.corpRDTOH||(p.corpEligibleRDTOH||0)<0||(p.corpGRIP||0)<0)errors.push('Eligible RDTOH must be between zero and total RDTOH; GRIP cannot be negative.');
 if(p.passiveStop<=p.passiveStart)errors.push('Passive income must end after it starts.');
 if(p.withdrawalPolicy){for(const key of ['rrspTargets','corpFractions'])if(!Array.isArray(p.withdrawalPolicy[key])||p.withdrawalPolicy[key].length!==3||p.withdrawalPolicy[key].some(x=>!Number.isFinite(x)||x<0||x>(key==='corpFractions'?1:200000)))errors.push('Invalid optimized withdrawal-policy '+key+'.');}
 for(const e of p.expenses||[]){if(!e.enabled)continue;if(!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.end<e.start)errors.push((e.name||'Expense')+': use whole start/end ages or years, end no earlier than start.');if(e.type==='contingency'&&e.amountMode==='fixed'&&(!Number.isFinite(e.amount)||e.amount<0))errors.push('Contingency cost must be non-negative.');}
 errors.push(...C.ExpenseEngine.validateExpenses(p));return errors;
}
function normalizedPlan(raw){if(!raw||typeof raw!=='object'||!raw.A)throw Error('A plan with Person A is required.');const p=copy(raw);p.calculationVersion=p.calculationVersion||'4.1';p.returnModel=p.returnModel||'lognormal';p.corporateModel=p.corporateModel||'split-pools';p.baseYear=p.baseYear??2026;p.expenses=p.expenses||[];p.expenseStress=p.expenseStress??1;
 if(!p.couple)p.B={age:p.A.age,ret:999,rrsp:0,tfsa:0,tfsaRoom:0,nr:0,acb:0,addRRSP:0,addTFSA:0,addNR:0,cppAge:65,cpp65:0,oasAge:65,oas65:0,rrifAge:71};
 const e=validatePlan(p);if(e.length)throw Error(e.join('\n'));return p;}
function covariance(p){const sd=[p.sdFI,p.sdCAD,p.sdUS,p.sdINTL];return C.cholesky4(C.CORR.map((r,a)=>r.map((x,b)=>x*sd[a]*sd[b])));}
function marketBank(p,n,seed=p.seed,model='mc'){
 const bank=[],L=covariance(p),means=C.arithmeticMeans(p),years=p.planAge-p.A.age;
 const histYears=Object.keys(C.HIST_DATA).map(Number).sort((a,b)=>a-b);
 for(let k=0;k<n;k++){const rng=C.makeRng((seed+Math.imul(k+1,2654435761))>>>0),path=[];let cursor=0;
  for(let y=0;y<years;y++){
   if(model==='bootstrap'){if(y%5===0)cursor=Math.floor(rng.u()*(histYears.length-4));const h=C.historicalMarketYear(histYears[cursor++]);path.push({r:h.r,inf:h.inf,simulated:false});}
   else {const inf=C.clamp(p.infMean+rng.normal()*p.infStd,-.01,.08),r=C.marketReturns(p,rng,L,means);path.push({r,inf,simulated:true});}
  }bank.push(path);
 }bank.expenseSeed=seed;return bank;
}
function wilson(successes,n,z=1.96){if(!n)return {low:0,high:1};const p=successes/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return {low:Math.max(0,c-h),high:Math.min(1,c+h)};}
function evaluate(raw,bank,{details=false}={}){
 const p=raw,L=covariance(p),means=C.arithmeticMeans(p),outcomes=[],taxes=[],estates=[],depletionAges=[];let successes=0,depleted=0;
 let first=null;for(let k=0;k<bank.length;k++){const i={...p,seed:bank.expenseSeed??p.seed,_marketPath:bank[k]},x=C.onePath(i,k,means,L,null,details&&k===0);if(x.fullSuccess)successes++;if(x.depleted){depleted++;depletionAges.push(x.depletionAge);}taxes.push(x.realLifeTax);estates.push(x.realAfterTax);outcomes.push(x.fullSuccess?1:0);if(details&&k===0)first=x;}
 return {n:bank.length,successes,success:bank.length?successes/bank.length:0,interval:wilson(successes,bank.length),depletion:bank.length?depleted/bank.length:0,medianDepletionAge:depletionAges.length?q(depletionAges,.5):null,medianTax:q(taxes,.5),meanTax:taxes.reduce((a,b)=>a+b,0)/Math.max(1,taxes.length),medianEstate:q(estates,.5),p10Estate:q(estates,.1),p90Estate:q(estates,.9),taxes,estates,outcomes,...(first?{example:first}:{})};
}
function agePlan(base,age,settings={}){const p=copy(base),delta=age-base.A.ret;p.A.ret=age;if(settings.retireTogether&&p.couple)p.B.ret=Math.max(p.B.age,p.B.ret+delta);if(settings.linkCorporateStop!==false)p.corpAddUntil=Math.max(p.A.age,p.corpAddUntil+delta);return p;}
function policyPlan(base,policy){const p=copy(base);if(policy.kind==='fixed'){p.strategy=policy.strategy;delete p.withdrawalPolicy;}else{p.strategy=policy.strategy||'balanced';p.withdrawalPolicy={rrspTargets:policy.rrspTargets,corpFractions:policy.corpFractions};}return p;}
function fixedPolicies(){return ['balanced','rrsp','corp','tfsa'].map(strategy=>({kind:'fixed',strategy,label:{balanced:'Non-registered → corporate → RRSP → TFSA',rrsp:'RRSP first',corp:'Corporate first',tfsa:'TFSA first'}[strategy]}));}
function objective(r,target){
 // Every extra failure dominates ordinary estate/tax differences; feasible policies
 // are judged over the entire horizon including after-tax liquidation value.
 return (r.success<target?(r.success-target)*1e9:0)+r.p10Estate*.65+r.medianEstate*.35-r.medianTax*.05;
}
function tunePolicy(base,bank,target,{rounds=2,start=null,progress=()=>{}}={}){
 let evaluations=0,best=null;const seen=new Map(),trace=[];
 const test=policy=>{const key=JSON.stringify(policy);if(seen.has(key))return seen.get(key);const metrics=evaluate(policyPlan(base,policy),bank),x={policy,metrics,score:objective(metrics,target)};evaluations++;seen.set(key,x);if(!best||x.score>best.score+1e-6){best=x;trace.push({evaluation:evaluations,score:x.score,success:metrics.success,medianEstate:metrics.medianEstate});}return x;};
 for(const p of fixedPolicies())test(p);
 if(start)test(start);
 const total=base.A.rrsp+(base.couple?base.B.rrsp:0),personCount=base.couple?2:1;
 const level=C.clamp(total/personCount/Math.max(5,85-base.A.ret),0,160000);
 for(const v of [0,level,58523])test({kind:'searched',strategy:'balanced',label:'Multiyear income-target policy',rrspTargets:[v,v*.75,v*.5],corpFractions:[.5,.5,.5]});
 for(let round=0;round<rounds;round++){
  const anchor=best.policy.kind==='searched'?copy(best.policy):{kind:'searched',strategy:best.policy.strategy,label:'Multiyear income-target policy',rrspTargets:[0,0,0],corpFractions:[0,0,0]};
  let current=anchor;test(current);for(let d=0;d<6;d++){
   const field=d<3?'rrspTargets':'corpFractions',idx=d%3,step=d<3?30000/2**round:.5/2**round;
   let pick=test(current);
   for(const sign of [-1,1]){const t=copy(current);t[field][idx]=C.clamp(t[field][idx]+sign*step,0,d<3?200000:1);const x=test(t);if(x.score>pick.score)pick=x;}
   current=copy(pick.policy);
  }progress({stage:'withdrawals',message:`Searching withdrawal amounts: ${evaluations} lifetime policies tested`});
 }
 return {...best,evaluations,trace};
}
function pairedDifference(a,b){const d=a.estates.map((v,k)=>v-b.estates[k]),avg=d.reduce((x,y)=>x+y,0)/d.length;return {meanEstateDifference:avg,medianEstateDifference:q(d,.5),successDifference:a.success-b.success};}
function completeHistoricalBank(p){const bank=[],starts=[],pre=p.A.ret-p.A.age,years=p.planAge-p.A.age;for(let ret=Math.max(1900,p.histStart||1900);ret<=Math.min(2025,p.histEnd||2025);ret++){
 const first=ret-pre,last=first+years-1;if(!C.HIST_DATA[first]||!C.HIST_DATA[last])continue;
 starts.push(ret);bank.push(Array.from({length:years},(_,y)=>C.historicalMarketYear(first+y)));
 }return {bank,starts};}
function sustainable(base,policies,bank,target){
 let lo=0,hi=Math.max(base.spend*2,50000),bestPolicy=policies[0],evaluations=0,bounded=false;
 const test=spend=>{let best=null;for(const policy of policies){const p=policyPlan({...base,spend},policy),metrics=evaluate(p,bank);evaluations++;if(!best||metrics.success>best.metrics.success||metrics.success===best.metrics.success&&metrics.medianEstate>best.metrics.medianEstate)best={policy,metrics};}return best;};
 // Zero spending is a valid feasibility boundary even though user plans require >0.
 const zero=test(0);if(zero.metrics.success<target)return {amount:0,policy:zero.policy,feasible:false,bounded:true,evaluations};
 for(let k=0;k<8;k++){if(test(hi).metrics.success<target){bounded=true;break;}lo=hi;hi*=2;}
 if(!bounded)return {amount:lo,policy:bestPolicy,feasible:true,bounded:false,evaluations};
 for(let k=0;k<9;k++){const mid=(lo+hi)/2,x=test(mid);if(x.metrics.success>=target){lo=mid;bestPolicy=x.policy;}else hi=mid;}
 return {amount:Math.floor(lo/500)*500,policy:bestPolicy,feasible:true,bounded,evaluations};
}
async function optimize(raw,options={},progress=()=>{}){
 const base=normalizedPlan(raw),settings={target:.90,trainPaths:20,screenPaths:64,validationPaths:512,minAge:base.A.age,maxAge:Math.min(75,base.planAge-1),retireTogether:false,linkCorporateStop:true,model:'mc',...options};
 for(const k of ['trainPaths','screenPaths','validationPaths'])if(!Number.isInteger(settings[k])||settings[k]<8||settings[k]>10000)throw Error('Path counts must be whole numbers from 8 to 10000.');
 if(!Number.isFinite(settings.target)||settings.target<.5||settings.target>.99||!Number.isInteger(settings.minAge)||!Number.isInteger(settings.maxAge)||settings.minAge<base.A.age||settings.maxAge<settings.minAge||settings.maxAge>=base.planAge||settings.maxAge-settings.minAge>50)throw Error('Check success target and retirement-age range.');
 // For uncut sustainable spending, guardrails cannot manufacture a higher success rate.
 base.guardrails=false;base.mode='mc';
 const training=marketBank(base,settings.trainPaths,base.seed,settings.model),screen=marketBank(base,settings.screenPaths,base.seed,settings.model),holdoutSeed=(base.seed^0x9e3779b9)>>>0;
 const holdout=marketBank(base,settings.validationPaths,holdoutSeed,settings.model);
 const yieldNow=()=>new Promise(r=>setTimeout(r,0));
 progress({stage:'withdrawals',message:'Searching multiyear withdrawal policies…'});await yieldNow();
 let tuned=tunePolicy(base,training,settings.target,{progress});let evaluations=tuned.evaluations;
 const candidates=[tuned.policy,...fixedPolicies()];const ageRows=[];let proposed=null;
 for(let age=settings.minAge;age<=settings.maxAge;age++){
  const p=agePlan(base,age,settings);let best=null;
  for(const policy of candidates){const x=evaluate(policyPlan(p,policy),screen);evaluations++;if(!best||objective(x,settings.target)>objective(best.metrics,settings.target))best={policy,metrics:x};}
  const row={age,screenSuccess:best.metrics.success,policy:best.policy};ageRows.push(row);
  if(best.metrics.success>=settings.target&&proposed===null)proposed=age;
  progress({stage:'ages',message:`Testing retirement age ${age} (${age-settings.minAge+1}/${settings.maxAge-settings.minAge+1})`});await yieldNow();
 }
 // Refine policies near the earliest screened date, then independently validate
 // each passing date in chronological order. Holdout results never tune policy.
 let recommended=null;
 for(const row of ageRows){
  if(row.age<(proposed??settings.maxAge)-1)continue;
  if(row.screenSuccess<settings.target&&row.age!==(proposed??settings.maxAge)-1)continue;
  const p=agePlan(base,row.age,settings),x=tunePolicy(p,training,settings.target,{rounds:1,start:row.policy,progress});evaluations+=x.evaluations;
  const validation=evaluate(policyPlan(p,x.policy),holdout);evaluations++;row.validation=validation;row.policy=x.policy;
  progress({stage:'validation',message:`Independent check at age ${row.age}: ${(validation.success*100).toFixed(1)}% fully funded`});await yieldNow();
  if(validation.success>=settings.target){recommended={age:row.age,policy:x.policy,metrics:validation};break;}
 }
 const selectedAge=recommended?.age??base.A.ret,atAge=agePlan(base,selectedAge,settings);
 const atAgeTune=tunePolicy(atAge,training,settings.target,{rounds:2,start:recommended?.policy||tuned.policy,progress});evaluations+=atAgeTune.evaluations;
 // Preserve the already validated policy for the age recommendation.
 const finalPolicy=recommended?.policy||atAgeTune.policy;
 const alternatives=[];for(const policy of [finalPolicy,...fixedPolicies()]){const metrics=evaluate(policyPlan(atAge,policy),holdout);alternatives.push({policy,metrics});evaluations++;await yieldNow();}
 progress({stage:'spending',message:'Searching sustainable after-tax spending…'});await yieldNow();
 const capacity=sustainable(atAge,[atAgeTune.policy,finalPolicy,...fixedPolicies()],screen,settings.target);evaluations+=capacity.evaluations;
 const screenedAmount=capacity.amount;
 // A separate calibration bank sets a modest safety margin before the holdout
 // ever evaluates this spending amount. Do not lower the goal on holdout results.
 if(capacity.feasible){
  progress({stage:'spending',message:'Calibrating spending on an additional independent market sample…'});await yieldNow();
  const calibration=marketBank(base,Math.max(128,Math.min(settings.validationPaths,512)),(base.seed^0x85ebca6b)>>>0,settings.model);
  const conservative=sustainable(atAge,[capacity.policy],calibration,Math.min(.99,settings.target+.02));evaluations+=conservative.evaluations;
  if(conservative.feasible&&conservative.amount<capacity.amount){capacity.amount=conservative.amount;capacity.policy=conservative.policy;}
 }
 capacity.screenedAmount=screenedAmount;
 let capacityValidation=null;
 if(capacity.feasible){
  // Select amount on screening paths only. The result is reported as unconfirmed
  // if the independent validation falls below target (no holdout retuning).
  capacityValidation=evaluate(policyPlan({...atAge,spend:capacity.amount},capacity.policy),holdout);evaluations++;
 }
 const hist=completeHistoricalBank(atAge),historical=hist.bank.length?evaluate(policyPlan(atAge,finalPolicy),hist.bank):null;
 const bootstrap=marketBank(base,Math.min(settings.validationPaths,128),(holdoutSeed^0xa5a5a5a5)>>>0,'bootstrap');
 const stress=evaluate(policyPlan(atAge,finalPolicy),bootstrap);
 const example=evaluate(policyPlan(atAge,finalPolicy),holdout.slice(0,1),{details:true}).example;
 const result={version:'4.1.0-dev',basePlan:base,settings,seed:base.seed,holdoutSeed,recommended,selectedAge,policy:finalPolicy,metrics:alternatives[0].metrics,spending:{...capacity,validation:capacityValidation,meetsTarget:!!capacityValidation&&capacityValidation.success>=settings.target},alternatives,ageRows,historical:{starts:hist.starts,metrics:historical},bootstrap:stress,example,evaluations,searchTrace:tuned.trace,comparison:pairedDifference(alternatives[0].metrics,alternatives[1].metrics),notes:['BC resident model only.','Success means all requested spending and enabled irregular expenses funded without cuts.','Retirement search keeps salary-funded contributions as entered until retirement; wages and work expenses are not modeled.','A retirement recommendation is the earliest validated age found by this bounded heuristic search, not a proof or a guarantee.','All displayed tax and estate summaries are in today’s dollars.','Historical outcomes use a US asset-return proxy, Canadian inflation and current Canadian tax rules; no currency conversion.']};
 progress({stage:'complete',message:'Optimization and independent validation complete.'});return result;
}
const api={normalizePlan:normalizedPlan,validatePlan,covariance,marketBank,evaluate,wilson,agePlan,policyPlan,fixedPolicies,objective,tunePolicy,completeHistoricalBank,sustainable,optimize};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetirementOptimizer=api;
})(globalThis);
