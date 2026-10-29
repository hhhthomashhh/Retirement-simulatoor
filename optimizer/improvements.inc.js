// Verified 2026 BC resident planning rules. See docs/TAX-SOURCES.md.
function updatedFactors(y,cumInf,bcAnchor,i){
 const year=i.baseYear+y;
 // Future starting years project 2026 bases using the plan inflation assumption.
 const before=Math.pow(1+i.infMean,Math.max(0,i.baseYear-2026));
 const bcBefore=Math.pow(1+i.infMean,Math.max(0,i.baseYear-2031));
 return {fed:before*cumInf,bc:year<=2030?1:bcBefore*cumInf/Math.max(1e-9,bcAnchor),oas:before*cumInf,updated:true};
}
function updatedPersonTax(flow,age,f){
 const grossNet=Math.max(0,flow.ordinary+flow.pension+flow.oas+flow.eligDiv*ELIG_GROSS+flow.nonEligDiv*NONELIG_GROSS+Math.max(0,flow.capGains)*CG_INCLUSION);
 const claw=Math.min(flow.oas,Math.max(0,(grossNet-OAS_THRESHOLD_2026*f.oas)*.15));
 const net=Math.max(0,grossNet-claw); // OAS recovery is deductible on line 23500.
 const lossDeduction=Math.min(Math.max(0,flow.capGains),flow.capitalLossCarry||0)*.5;
 const taxableIncome=Math.max(0,net-lossDeduction); // Prior losses reduce taxable income, not net-income-tested benefits.
 const federalAge=age>=65?Math.max(0,9208*f.fed-.15*Math.max(0,net-46432*f.fed)):0;
 const bcAge=age>=65?Math.max(0,5927*f.bc-.15*Math.max(0,net-44119*f.bc)):0;
 // This engine's 'pension' field contains RRIF income only. A younger recipient
 // may receive split income, but does not acquire the RRIF pension credit.
 const pension=age>=65?Math.max(0,flow.pension):0;
 const fc=(fedBPA(net,f.fed)+federalAge+Math.min(2000,pension))*.14;
 const bcCredit=(BC_BPA*f.bc+bcAge+Math.min(1000,pension))*.056;
 const fed=Math.max(0,progressiveTax(taxableIncome,FED_BRACKETS,f.fed)-fc-flow.eligDiv*ELIG_GROSS*FED_ELIG_DTC-flow.nonEligDiv*NONELIG_GROSS*FED_NONELIG_DTC);
 const red=Math.max(0,690*f.bc-Math.max(0,net-25570*f.bc)*.0356);
 const bc=Math.max(0,progressiveTax(taxableIncome,BC_BRACKETS,f.bc)-bcCredit-flow.eligDiv*ELIG_GROSS*BC_ELIG_DTC-flow.nonEligDiv*NONELIG_GROSS*BC_NONELIG_DTC-red);
 return {tax:fed+bc+claw,federal:fed,bc,claw,net,grossNet,taxableIncome,lossDeduction,federalAge,bcAge,pensionCredit:Math.min(2000,pension)*.14+Math.min(1000,pension)*.056};
}
function updatedHouseholdTax(flowA,flowB,ageA,ageB,f,splitEnabled){
 const evalSplit=s=>{const A={...flowA},B={...flowB};const x=s>=0?A.pension*s:B.pension*-s;A.pension+=s>=0?-x:x;B.pension+=s>=0?x:-x;const a=updatedPersonTax(A,ageA,f),b=updatedPersonTax(B,ageB,f);return {total:a.tax+b.tax,a:a.tax,b:b.tax,split:s,claw:a.claw+b.claw};};
 let best=evalSplit(0);
 if(!splitEnabled)return best;
 // Tax functions are piecewise linear: include every income breakpoint in both
 // directions instead of a slow, arbitrary percentage grid.
 const breakpoints=(age)=>[0,16452*f.fed,181440*f.fed,258482*f.fed,95323*f.oas,...FED_BRACKETS.slice(0,-1).map(x=>x[0]*f.fed),...BC_BRACKETS.slice(0,-1).map(x=>x[0]*f.bc),25570*f.bc,44952*f.bc,...(age>=65?[46432*f.fed,(46432+9208/.15)*f.fed,44119*f.bc,(44119+5927/.15)*f.bc]:[])];
 for(const dir of [1,-1]){const src=dir>0?flowA:flowB,sa=dir>0?ageA:ageB,dst=dir>0?flowB:flowA,da=dir>0?ageB:ageA;if(sa<65||src.pension<=0)continue;
 const sn=updatedPersonTax(src,sa,f).grossNet,dn=updatedPersonTax(dst,da,f).grossNet,amount=src.pension;
 const candidates=new Set([0,.5]);
 for(const b of breakpoints(sa))candidates.add(clamp((sn-b)/amount,0,.5));
 for(const b of breakpoints(da))candidates.add(clamp((b-dn)/amount,0,.5));
 // Credit kinks when the remaining/received RRIF equals 1000 or 2000.
 for(const b of [1000,2000]){candidates.add(clamp((amount-b)/amount,0,.5));candidates.add(clamp((b-dst.pension)/amount,0,.5));}
 for(const x of candidates){const t=evalSplit(dir*x);if(t.total<best.total-1e-8)best=t;}
 }
 return best;
}
const LOG_CORR=cholesky4(CORR);
function lognormalReturns(i,rng){
 const z=Array.from({length:4},()=>rng.normal()),g=[i.gmFI,i.gmCAD,i.gmUS,i.gmINTL],sd=[i.sdFI,i.sdCAD,i.sdUS,i.sdINTL];
 return g.map((m,a)=>{let e=0;for(let b=0;b<=a;b++)e+=LOG_CORR[a][b]*z[b];const t=(1+Math.sqrt(1+4*(sd[a]/(1+m))**2))/2;return Math.expm1(Math.log1p(m)+Math.sqrt(Math.log(t))*e);});
}
function policyFund(st,flow,target,ageA,ageB,factors,i,ledger,cumInf){
 if(!i.withdrawalPolicy||ageA<i.A.ret)return fundToTarget(st,flow,target,ageA,ageB,factors,i,ledger);
 const policy=i.withdrawalPolicy;
 for(const [who,age] of [['A',ageA],['B',ageB]]){if(who==='B'&&!i.couple)continue;if(age<i[who].ret)continue;
 const phase=age<65?0:age<72?1:2,threshold=(policy.rrspTargets?.[phase]||0)*cumInf;
 const fl=flow[who],taxable=fl.ordinary+fl.pension+fl.oas+fl.eligDiv*1.38+fl.nonEligDiv*1.15+fl.capGains*.5;
 const x=Math.min(st[who].rrsp,Math.max(0,threshold-taxable));if(x<=0)continue;
 st[who].rrsp-=x;fl.cash+=x;if(age>=65&&age>=i[who].rrifAge)fl.pension+=x;else fl.ordinary+=x;ledger.rrspOut+=x;
 }
 const phase=ageA<65?0:ageA<72?1:2,fraction=policy.corpFractions?.[phase]||0;
 if(fraction>0){const current=afterTaxCash(flow,ageA,ageB,factors,i.pensionSplit).cash;const corporateTarget=current+Math.max(0,target-current)*fraction;
 flow=fundToTarget(st,flow,corporateTarget,ageA,ageB,factors,{...i,_sources:['corp']},ledger).flow;
 }
 return fundToTarget(st,flow,target,ageA,ageB,factors,i,ledger);
}
function updatedCorpReturn(st,i,r,useLimit){
 const c=st.corp,ret=accountReturn(i.eqCorp,r,i.corpFee,i.maxDrop,i.maxGain,useLimit),y=distYields(i,i.eqCorp),start=c.bal;
 const cad=start*y.cadDiv,other=start*(y.foreignDiv+y.interest),partIV=cad*i.corpRefundRate,partI=other*i.corpPassiveTax;
 c.eligibleRDTOH+=partIV;c.nonEligibleRDTOH+=other*i.corpRefundable;c.grip+=cad;
 const reinvest=Math.max(0,cad+other-partIV-partI);c.bal=Math.max(0,start*(1+clamp(ret-y.total,-.95,1.5)))+reinvest;
 c.acb+=reinvest;c.rdToh=c.eligibleRDTOH+c.nonEligibleRDTOH;
 return partIV+partI;
}
function updatedCorpEstimate(c,x,i,useCDA){
 x=Math.min(Math.max(0,x),c.bal);const gainRatio=c.bal>0?clamp((c.bal-c.acb)/c.bal,0,1):0,gain=x*gainRatio,acbDisp=c.bal>0?c.acb*x/c.bal:0;
 const corpTax=gain*.5*i.corpPassiveTax,avail=Math.max(0,x-corpTax),cda=c.cda+gain*.5;
 const capDiv=useCDA?Math.min(avail,cda):0,taxDiv=avail-capDiv,eligibleDiv=Math.min(taxDiv,c.grip||0),non=taxDiv-eligibleDiv;
 let ep=c.eligibleRDTOH||0,np=(c.nonEligibleRDTOH??c.rdToh)+gain*.5*i.corpRefundable;
 const er=Math.min(ep,eligibleDiv*i.corpRefundRate);ep-=er;
 const nr=Math.min(np,non*i.corpRefundRate);np-=nr;
 const extra=Math.min(ep,Math.max(0,non*i.corpRefundRate-nr));ep-=extra;
 return {sale:x,cash:avail,capDiv,taxDiv,eligibleDiv,corpTax,newCDA:cda-capDiv,newRDTOH:ep+np,refund:er+nr+extra,acbDisp,newEligibleRDTOH:ep,newNonEligibleRDTOH:np,newGRIP:(c.grip||0)-eligibleDiv};
}
