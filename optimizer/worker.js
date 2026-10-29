importScripts('engine.js','optimizer.js');
self.onmessage=async e=>{const {id,plan,settings}=e.data;try{const result=await RetirementOptimizer.optimize(plan,settings,p=>self.postMessage({id,progress:p}));self.postMessage({id,result});}catch(error){self.postMessage({id,error:error.message});}};
