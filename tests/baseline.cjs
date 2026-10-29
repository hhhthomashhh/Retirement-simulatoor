const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../reference/v4.0.3.html','utf8');
function loadOriginal(){
 const elements={};
 for(const m of html.matchAll(/<input\b([^>]*)>|<select\b([^>]*)>([\s\S]*?)<\/select>/g)){
  const attrs=m[1]??m[2],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!id)continue;
  let value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||'';
  if(m[2]!==undefined){const opts=[...(m[3]||'').matchAll(/<option([^>]*)>([^<]*)/g)];const o=opts.find(x=>/selected/.test(x[1]))||opts[0];value=o?.[1].match(/value="([^"]*)"/)?.[1]||o?.[2]||'';}
  elements[id]={value,checked:/\bchecked/.test(attrs),addEventListener(){},style:{},classList:{toggle(){}},dispatchEvent(){}};
 }
 const ctx=vm.createContext({console,setTimeout,clearTimeout,Event:class{},document:{readyState:'loading',getElementById:id=>elements[id]||(elements[id]={value:'',style:{},addEventListener(){}}),addEventListener(){}},window:{matchMedia:()=>({matches:false}),addEventListener(){}},navigator:{},localStorage:{getItem:()=>null},location:{protocol:'https:'}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const plan=JSON.parse(vm.runInContext('JSON.stringify(readInputs())',ctx));
 return {ctx,plan};
}
function calc(ctx,plan,index=0,hist=null){ctx.plan=plan;ctx.idx=index;ctx.hist=hist;return JSON.parse(vm.runInContext(`(()=>{const s=[plan.sdFI,plan.sdCAD,plan.sdUS,plan.sdINTL],L=cholesky4(CORR.map((r,a)=>r.map((x,b)=>x*s[a]*s[b])));return JSON.stringify(onePath(plan,idx,arithmeticMeans(plan),L,hist,true));})()`,ctx));}
if(require.main===module){const {ctx,plan}=loadOriginal();fs.writeFileSync(__dirname+'/default-plan.json',JSON.stringify(plan,null,2)+'\n');const cases=[['default',plan],['single',{...plan,couple:false,B:{...plan.B,rrsp:0,tfsa:0,nr:0,acb:0,cpp65:0,oas65:0,addRRSP:0,addTFSA:0,addNR:0}}],['rrsp-first',{...plan,strategy:'rrsp'}],['corp-first',{...plan,strategy:'corp'}],['historical',{...plan,mode:'historical'}]];const results=cases.map(([name,p])=>({name,plan:p,hist:name==='historical'?1973:null,paths:[0,1,7].map(k=>calc(ctx,p,k,name==='historical'?1973:null))}));fs.writeFileSync(__dirname+'/baseline-v403.json.gz',require('node:zlib').gzipSync(JSON.stringify(results)+'\n'));console.log('Recorded 5 cases × 3 paths, annual ledgers + aggregates.');}
module.exports={loadOriginal,calc};
