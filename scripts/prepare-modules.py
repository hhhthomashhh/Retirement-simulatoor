from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
h=(root/'reference/v4.0.3.html').read_text()
s=re.search(r'<script>([\s\S]*?)</script>',h)[1]
a=s[:s.index('function $(id)')]
b=s[s.index('function clamp('):s.index('// ----------------------------- v3.9')]
c=s[s.index('const ExpenseEngine='):s.index('function expenseOption(')]
d=s[s.index('function getFactors('):s.index('async function simulate(')]
# The functions removed here are byte-identical in core-v403; no manual financial rewrite.
parts=[a,b,c,d]
core='\n'.join(parts)
exports=re.findall(r'^(?:async )?function (\w+)\(',core,re.M)+re.findall(r'^const (\w+)\s*=',core,re.M)
exports=list(dict.fromkeys(exports))
wrapper=lambda code: "/* Derived from the deployed v4.0.3, reference SHA recorded in docs. */\n(function(root){'use strict';\n"+code+'\nconst api={'+','.join(exports)+'}; if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.RetirementCore=api;\n})(globalThis);\n'
(root/'optimizer/core-v403.js').write_text(wrapper(core))
for part in parts:s=s.replace(part,'',1)
s='const {'+','.join(exports)+'}=RetirementCore;\n'+s
s=s.replace('return {mode:$(\'simMode\')','return {...(window.optimizerInputs?.()||{}),mode:$(\'simMode\')')
s=s.replace('function invalidateResults(){','function invalidateResults(){window.invalidateOptimizer?.();')
s=s.replace('function setFormPlan(p){if(!p)return;','function setFormPlan(p){if(!p)return;window.restoreOptimizerFields?.(p);')
s=s.replace("const V40_KEY='retirement-simulator:4.0'","const V40_KEY='retirement-simulator:4.1'")
s=s.replace("const old=localStorage.getItem(V39_KEY)","const old=localStorage.getItem('retirement-simulator:4.0')||localStorage.getItem(V39_KEY)")
s=s.replace("schemaVersion:'4.0',sourceVersion:'3.9'","schemaVersion:'4.1',sourceVersion:'4.0.3'")
s=s.replace('v4.0.3','v4.1.0-dev').replace('v4.0.json','v4.1.json').replace('v4.0-backup','v4.1-backup')
# Permit an already-converted RRIF for retired users older than 71.
s=s.replace('i.A.rrifAge<i.A.age||i.A.rrifAge>71','i.A.rrifAge<18||i.A.rrifAge>71').replace('i.B.rrifAge<i.B.age||i.B.rrifAge>71','i.B.rrifAge<18||i.B.rrifAge>71')
s=s.replace('if(i.A.acb>i.A.nr||i.B.acb>i.B.nr||i.corpACB>i.corp)', 'if(i.calculationVersion===\"v4.0.3\"&&(i.A.acb>i.A.nr||i.B.acb>i.B.nr||i.corpACB>i.corp))')
s=s.replace('must be between current age and 71','must be between 18 and 71 (past conversion is allowed)')
(root/'optimizer/legacy-ui.js').write_text(s)
style=re.search(r'<style>([\s\S]*?)</style>',h)[1]
(root/'optimizer/legacy.css').write_text(style)
h=re.sub(r'<style>[\s\S]*?</style>','<link rel="stylesheet" href="optimizer/legacy.css"><link rel="stylesheet" href="optimizer/optimizer.css">',h,count=1)
h=re.sub(r'<script>[\s\S]*?</script>','',h)
h=h.replace('v4.0.3','v4.1.0-dev').replace('Single-file, offline retirement planning model','Local retirement planning and optimization')
h=h.replace('</body>','<script src="optimizer/engine.js"></script><script src="optimizer/ui.js"></script><script src="optimizer/legacy-ui.js"></script>\n</body>')
(root/'index.html').write_text(h)
# One generated engine, with narrowly scoped versioned hooks; baseline remains immutable.
e=core
repls={
'function getFactors(y,cumInf,bcAnchor){':'function getFactors(y,cumInf,bcAnchor,plan=null){if(plan?.calculationVersion!=="v4.0.3"&&plan)return updatedFactors(y,cumInf,bcAnchor,plan);',
'function personTax(flow,age,f){':'function personTax(flow,age,f){if(f.updated)return updatedPersonTax(flow,age,f);',
'function householdTax(flowA,flowB,ageA,ageB,f,splitEnabled){':'function householdTax(flowA,flowB,ageA,ageB,f,splitEnabled){if(f.updated)return updatedHouseholdTax(flowA,flowB,ageA,ageB,f,splitEnabled);',
'function marketReturns(i,rng,L,means){':'function marketReturns(i,rng,L,means){if(i.returnModel==="lognormal")return lognormalReturns(i,rng);',
'for(const src of strategyOrder(i.strategy))':'for(const src of (i._sources||strategyOrder(i.strategy)))',
'cumInf*=1+inf;if(y===4)bcAnchor=cumInf;':'if(i.calculationVersion==="v4.0.3"||y>0)cumInf*=1+inf;if((i.calculationVersion==="v4.0.3"?y===4:(i.baseYear+y===2030)))bcAnchor=cumInf;',
'const r=hy?hy.r:marketReturns(i,rng,L,means);':'const r=hy?hy.r:marketReturns(i,rng,L,means);',
'const yearStart=accountTotals(st),ledger=emptyYearLedger(),corpTaxAtStart=st.corpTax;':'const yearStart=accountTotals(st),rrspOpening={A:st.A.rrsp,B:st.B.rrsp},ledger=emptyYearLedger(),corpTaxAtStart=st.corpTax;',
'p.rrsp*rrifRate(age,conversionAge)':'(i.calculationVersion==="v4.0.3"?p.rrsp:rrspOpening[who])*rrifRate(age,conversionAge)',
'getFactors(y,cumInf,bcAnchor)':'getFactors(y,cumInf,bcAnchor,i)',
'getFactors(years,cumInf,bcAnchor)':'getFactors(years,cumInf,bcAnchor,i)',
'let res=fundToTarget(st,flow,target,ageA,ageB,factors,i,ledger)':'let res=policyFund(st,flow,target,ageA,ageB,factors,i,ledger,cumInf)',
'const calYear=histRetireYear===null?null:':'const calYear=histRetireYear===null?null:',
'if(!depleted && y+1<years && traj[y+1]<=1000)':'if(!depleted && (i.calculationVersion!=="v4.0.3"||y+1<years) && traj[y+1]<=1000)',
'reinvestSurplus(st,surplus,ledger);':'reinvestSurplus(st,surplus,ledger);',
'lifeTax:lifeTax+st.corpTax':'lifeTax:lifeTax+st.corpTax',
}
for x,y in repls.items():
 assert x in e,x
 e=e.replace(x,y)
# Independent pre-generated paths keep age comparisons on the same future calendar markets.
e=e.replace('const hy=calYear===null?null:historicalMarketYear(calYear);','const hy=i._marketPath?.[y]||(calYear===null?null:historicalMarketYear(calYear));')
e=e.replace('const useLossLimit=!hy;','const useLossLimit=!hy||!!hy.simulated;')
# A single household cannot create a fictitious spouse's TFSA or non-reg holdings.
e=e.replace('st.B.tfsaRoom+=(y>0?tfsaLimit:0)+st.B.tfsaWithdrawPending;', 'st.B.tfsaRoom+=(i.calculationVersion==="v4.0.3"||i.couple)?(y>0?tfsaLimit:0)+st.B.tfsaWithdrawPending:0;')
e=e.replace('tfsaRoom:i.B.tfsaRoom,','tfsaRoom:(i.couple||i.calculationVersion==="v4.0.3")?i.B.tfsaRoom:0,')
e=e.replace('reinvestSurplus(st,surplus,ledger);','if(i.calculationVersion!=="v4.0.3"&&!i.couple)st.single=true;reinvestSurplus(st,surplus,ledger);')
e=e.replace('const a=surplus*.5,b=surplus-a;','const a=st.single?surplus:surplus*.5,b=surplus-a;')
# Start with already-started plans, not a fixed offset from 2026.
e=e.replace('function applyCorpReturn(st,i,r,useLimit=true){','function applyCorpReturn(st,i,r,useLimit=true){if(i.calculationVersion!=="v4.0.3"&&i.corporateModel==="split-pools")return updatedCorpReturn(st,i,r,useLimit);')
e=e.replace('function corpEstimate(c,x,i,useCDA){','function corpEstimate(c,x,i,useCDA){if(i.calculationVersion!=="v4.0.3"&&i.corporateModel==="split-pools")return updatedCorpEstimate(c,x,i,useCDA);')
e=e.replace('c.bal=Math.max(0,c.bal-est.sale);','if(est.newEligibleRDTOH!==undefined){c.eligibleRDTOH=est.newEligibleRDTOH;c.nonEligibleRDTOH=est.newNonEligibleRDTOH;c.grip=est.newGRIP;}c.bal=Math.max(0,c.bal-est.sale);')
e=e.replace('rdToh:i.corpRDTOH}', 'rdToh:i.corpRDTOH,eligibleRDTOH:i.corpEligibleRDTOH||0,nonEligibleRDTOH:Math.max(0,i.corpRDTOH-(i.corpEligibleRDTOH||0)),grip:i.corpGRIP||0}')
e=e.replace('ff.A.nonEligDiv+=est.taxDiv*oa;ff.B.nonEligDiv+=est.taxDiv*ob;', 'ff.A.nonEligDiv+=(est.taxDiv-(est.eligibleDiv||0))*oa;ff.B.nonEligDiv+=(est.taxDiv-(est.eligibleDiv||0))*ob;ff.A.eligDiv+=(est.eligibleDiv||0)*oa;ff.B.eligDiv+=(est.eligibleDiv||0)*ob;')
e=e.replace('f.A.nonEligDiv+=ce.taxDiv*oa;f.B.nonEligDiv+=ce.taxDiv*ob;', 'f.A.nonEligDiv+=(ce.taxDiv-(ce.eligibleDiv||0))*oa;f.B.nonEligDiv+=(ce.taxDiv-(ce.eligibleDiv||0))*ob;f.A.eligDiv+=(ce.eligibleDiv||0)*oa;f.B.eligDiv+=(ce.eligibleDiv||0)*ob;')
e=e.replace('function onePath(i,pathIndex,means,L,histRetireYear=null,captureDetails=false){','function onePath(i,pathIndex,means,L,histRetireYear=null,captureDetails=false){if(!i.couple&&i.calculationVersion!=="v4.0.3")i={...i,corpOwnerA:1,passiveOwnerA:1,pensionSplit:false};')
e=e.replace('function nonregEstimate(p,x){','function nonregEstimate(p,x){if(p.updated){x=Math.min(Math.max(0,x),p.nr);const acbDisposed=p.nr>0?p.acb*x/p.nr:0;return {cash:x,cg:x-acbDisposed,acbDisposed};}')
e=e.replace('A:{rrsp:i.A.rrsp,','A:{updated:i.calculationVersion!=="v4.0.3",lossCarry:i.A.capitalLoss||0,rrsp:i.A.rrsp,').replace('B:{rrsp:i.B.rrsp,','B:{updated:i.calculationVersion!=="v4.0.3",lossCarry:i.B.capitalLoss||0,rrsp:i.B.rrsp,')
e=e.replace('const flow={A:emptyFlow(),B:emptyFlow()};for(', 'const flow={A:emptyFlow(),B:emptyFlow()};if(i.calculationVersion!=="v4.0.3"){flow.A.capitalLossCarry=st.A.lossCarry;flow.B.capitalLossCarry=st.B.lossCarry;}for(')
e=e.replace('const surplus=Math.max(0,res.current.cash-spentTotal);','if(i.calculationVersion!=="v4.0.3"){for(const who of ["A","B"]){const g=res.flow[who].capGains;st[who].lossCarry=Math.max(0,st[who].lossCarry-Math.max(0,g))+Math.max(0,-g);}}const surplus=Math.max(0,res.current.cash-spentTotal);')
e=e.replace('const p=s[who],x=p.nr,e=nonregEstimate(p,x);', 'const p=s[who],x=p.nr,e=nonregEstimate(p,x);if(i.calculationVersion!=="v4.0.3")f[who].capitalLossCarry=p.lossCarry||0;')
e += '\n'+(root/'optimizer/improvements.inc.js').read_text()
(root/'optimizer/engine.js').write_text(wrapper(e))
print('Prepared modular v4.1 application, preserved v4.0.3 core API:',len(exports),'exports')
