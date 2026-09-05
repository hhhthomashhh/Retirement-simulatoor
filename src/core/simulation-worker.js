'use strict';
importScripts('expense-engine.js','retirement-engine.js','monte-carlo-engine.js');
onmessage=async ({data})=>{try{const options={onProgress:(progress,label)=>postMessage({progress,label}),coarsePointer:true};let result;
if(data.action==='allocations')result=await RetirementEngine.runAllocationComparison(data.plan,options);
else if(data.action==='resilience')result=await SimulationAPI.compareResilience(data.plan,options);
else if(data.action==='scenarios')result=await SimulationAPI.compareScenarios(data.scenarios,data.seed,options);
else result=await SimulationAPI.runMonteCarlo(data.plan,options);
postMessage({result});}catch(e){postMessage({error:e.message});}};
