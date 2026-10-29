/* Replaceable device-storage adapter. Never edits the 4.0 or 3.9 keys. */
(function(root){
 const KEY='retirement-simulator:4.1';
 function createStorage(adapter){return {
  read(){for(const key of [KEY,'retirement-simulator:4.0','retirement-simulator:3.9']){const raw=adapter.getItem(key);if(raw===null)continue;let d;try{d=JSON.parse(raw);}catch{throw Error('Saved data in '+key+' could not be read. It has been retained; export a backup before resetting.');}if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Saved data is not a plan store.');return {...d,schemaVersion:'4.1',sourceVersion:d.sourceVersion||d.schemaVersion||'4.0.3',scenarios:(d.scenarios||[]).map(x=>({...x,plan:x.plan||x.current?.plan||x}))};}return {schemaVersion:'4.1',sourceVersion:'4.0.3',scenarios:[]};},
  write(value){adapter.setItem(KEY,JSON.stringify({...value,schemaVersion:'4.1'}));},key:KEY
 };}
 const api={createStorage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.OptimizerStorage={read:()=>createStorage(root.localStorage).read(),write:d=>createStorage(root.localStorage).write(d)};}
})(globalThis);
