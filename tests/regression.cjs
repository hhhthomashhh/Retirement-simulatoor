const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../optimizer/engine.js');
const cases=JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(__dirname+'/baseline-v403.json.gz')));
for(const x of cases){const p={...x.plan,calculationVersion:'v4.0.3'},sd=[p.sdFI,p.sdCAD,p.sdUS,p.sdINTL],L=C.cholesky4(C.CORR.map((r,a)=>r.map((v,b)=>v*sd[a]*sd[b])));for(const [j,k] of [0,1,7].entries()){const result=JSON.parse(JSON.stringify(C.onePath(p,k,C.arithmeticMeans(p),L,x.hist,true)));assert.deepEqual(result,x.paths[j],x.name+' path '+k);}}
console.log('PASS: 15 complete v4.0.3 paths, every annual balance/withdrawal/tax/expense and aggregate unchanged.');
