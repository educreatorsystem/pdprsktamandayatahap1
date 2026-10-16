/* Published Google Sheets CSV reader. All writes remain on the Apps Script backend. */
(function(root){
 'use strict';
 const TASK_FIELDS=['id','date','className','subject','teacher','title','instructions','message','createdAt','updatedAt','deleted'];
 const SUB_FIELDS=['id','taskId','className','studentName','message','photos','submittedAt','stars','marks','feedback','reviewedAt','photosPending'];
 function parseCSV(text){
  if(typeof text!=='string'||/^\s*</.test(text))throw new Error('Pautan CSV memulangkan halaman HTML. Semak tetapan penerbitan Sheet.');
  text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else quoted=false}else cell+=c}
   else if(c==='"'&&cell==='')quoted=true;
   else if(c===','){row.push(cell);cell=''}
   else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell=''}
   else cell+=c;
  }
  if(quoted)throw new Error('Format CSV tidak lengkap. Cuba muat semula.');
  row.push(cell);if(row.some(v=>v!==''))rows.push(row);
  if(!rows.length)throw new Error('CSV kosong tanpa tajuk lajur.');
  const headers=rows.shift().map(s=>s.trim());
  if(new Set(headers).size!==headers.length)throw new Error('Tajuk lajur CSV berulang.');
  return {headers,rows:rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])))};
 }

 // Accept both the original JSON metadata and legacy Sheet cells containing Drive URLs.
 function googleFileUrl(value){
  try{const u=new URL(String(value||'').trim());return u.protocol==='https:'&&!u.username&&!u.password&&(['drive.google.com','docs.google.com','drive.usercontent.google.com'].includes(u.hostname)||/^lh\d+\.googleusercontent\.com$/.test(u.hostname))?u.href:''}catch(_){return ''}
 }
 function driveFileId(value){
  const text=String(value||'').trim();if(/^[A-Za-z0-9_-]{10,200}$/.test(text))return text;
  const safe=googleFileUrl(text);if(!safe)return '';const u=new URL(safe),path=u.pathname.match(/\/(?:file\/)?d\/([A-Za-z0-9_-]+)/);
  const id=path?.[1]||u.searchParams.get('id')||'';return /^[A-Za-z0-9_-]{5,200}$/.test(id)?id:'';
 }
 function normalizePhotos(value){
  const result=[],seen=new Set();
  const add=item=>{
   if(result.length>=4||item==null)return;
   if(Array.isArray(item)){item.forEach(add);return}
   if(typeof item==='string'){
    const text=item.trim();if(!text)return;
    if(/^[\[{"]/.test(text)){try{add(JSON.parse(text));return}catch(_){}}
    const links=text.match(/https:\/\/[^\s<>"'\[\],;]+/gi)||[];
    if(links.length){links.forEach(url=>add({url}));return}
    if(/^[A-Za-z0-9_-]{10,200}$/.test(text))add({id:text});return;
   }
   if(typeof item!=='object')return;
   const url=googleFileUrl(item.url||item.link||item.webViewLink||item.driveUrl||''),rawId=String(item.id||item.fileId||'').trim();
   const id=/^[A-Za-z0-9_-]{1,200}$/.test(rawId)?rawId:driveFileId(url);
   if(!id&&!url)return;
   const key=id||url;if(seen.has(key))return;seen.add(key);
   result.push({...(id?{id}:{}),name:String(item.name||item.filename||'Gambar '+(result.length+1)),mimeType:String(item.mimeType||'image/jpeg'),...(url?{url}:{})});
  };add(value);return result;
 }
 function photoDriveLink(photo){
  const url=googleFileUrl(photo?.url),id=photo?.id||driveFileId(url);
  if(url&&new URL(url).hostname==='drive.google.com'&&/\/file\/d\//.test(new URL(url).pathname))return url;
  if(id&&/^[A-Za-z0-9_-]{1,200}$/.test(id)){const target=new URL('https://drive.google.com/file/d/'+id+'/view');if(url){const key=new URL(url).searchParams.get('resourcekey');if(key)target.searchParams.set('resourcekey',key)}return target.href}
  return url;
 }
 function photoPreviewUrl(photo){
  const url=googleFileUrl(photo?.url);if(!url)return '';
  const u=new URL(url);if(/^lh\d+\.googleusercontent\.com$/.test(u.hostname))return url;
  const id=photo?.id||driveFileId(url);if(!id)return '';
  const thumbnail=new URL('https://drive.google.com/thumbnail');thumbnail.searchParams.set('id',id);thumbnail.searchParams.set('sz','w1600');const key=u.searchParams.get('resourcekey');if(key)thumbnail.searchParams.set('resourcekey',key);return thumbnail.href;
 }

 function normalizedRows(text,kind){
  const csv=parseCSV(text),required=kind==='tasks'?['id','date','className','subject','teacher','title','instructions']:['id','taskId','className','studentName','submittedAt'];
  if(!required.every(h=>csv.headers.includes(h)))throw new Error('Lajur CSV '+(kind==='tasks'?'tugasan':'penghantaran')+' tidak sepadan.');
  const fields=kind==='tasks'?TASK_FIELDS:SUB_FIELDS;
  const byId=new Map();
  for(const raw of csv.rows){
   if(!String(raw.id||'').trim())continue;
   const item=Object.fromEntries(fields.map(f=>[f,String(raw[f]??'').trim()]));
   if(kind==='tasks'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!item.className||!item.title)throw new Error('Rekod tugasan CSV tidak lengkap.');
    item.deleted=/^(true|1|yes)$/i.test(item.deleted)?'true':'false';
   }else{
    if(!item.taskId||!item.className||!item.studentName||!item.submittedAt)throw new Error('Rekod penghantaran CSV tidak lengkap.');
    item.photos=normalizePhotos(raw.photos);item.photosPending=false;
    item.stars=String(Math.max(0,Math.min(5,Math.floor(Number(item.stars)||0))));
   }
   byId.set(item.id,item);
  }
  return [...byId.values()];
 }
 function signature(value){let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return (h>>>0).toString(36)}
 class CSVStore{
  constructor(options){
   this.urls={tasks:options.tasksUrl,submissions:options.submissionsUrl};this.fetcher=options.fetcher||root.fetch.bind(root);this.storage=options.storage;this.now=options.now||Date.now;this.onChange=options.onChange||(()=>{});
   this.signature=JSON.stringify([options.tasksUrl,options.submissionsUrl,options.apiUrl||'']);this.key='pdpr-csv-v2:'+signature(this.signature);
   this.raw={tasks:[],submissions:[]};this.times={tasks:null,submissions:null};this.pending={tasks:{},submissions:{}};this.errors={};this.inFlight=null;this.lastAttempt=null;this.refreshing=false;this.hydrate();
  }
  hydrate(){try{
   const saved=JSON.parse(this.storage?.getItem(this.key)||'null');
   if(!saved||saved.signature!==this.signature)return;
   for(const kind of ['tasks','submissions'])if(Array.isArray(saved.raw?.[kind])&&Number.isFinite(saved.times?.[kind])){this.raw[kind]=saved.raw[kind];this.times[kind]=saved.times[kind]}
   for(const kind of ['tasks','submissions'])if(saved.pending?.[kind]&&typeof saved.pending[kind]==='object')this.pending[kind]=saved.pending[kind];
   this.expirePending();
  }catch(_){/* A corrupt or unavailable cache does not prevent a fresh read. */}}
  persist(){try{this.storage?.setItem(this.key,JSON.stringify({signature:this.signature,raw:this.raw,times:this.times,pending:this.pending}))}catch(_){/* Continue with the in-memory copy if local storage is full. */}}
  expirePending(){for(const kind of ['tasks','submissions'])for(const [id,p] of Object.entries(this.pending[kind]))if(!p||this.now()-p.confirmedAt>86400000)delete this.pending[kind][id]}
  reconcile(kind){
   const map=new Map(this.raw[kind].map(row=>[row.id,row]));
   for(const [id,pending] of Object.entries(this.pending[kind])){
    const row=map.get(id),wanted=pending.record;if(!row)continue;
    const deleted=wanted.deleted==='true';
    const fields=kind==='tasks'?['date','className','subject','teacher','title','instructions','message']:['taskId','className','studentName','message','stars','marks','feedback'];
    const stamp=kind==='tasks'?'updatedAt':'reviewedAt',wantedStamp=wanted[stamp]||wanted.submittedAt||'',rowStamp=row[stamp]||row.submittedAt||'';
    const newer=wantedStamp&&rowStamp&&Number.isFinite(Date.parse(rowStamp))&&Date.parse(rowStamp)>Date.parse(wantedStamp);
    const matches=deleted?row.deleted==='true':row.deleted!=='true'&&fields.every(f=>String(row[f]??'')===String(wanted[f]??''))&&(!wantedStamp||rowStamp===wantedStamp);
    if(matches||(!deleted&&newer))delete this.pending[kind][id];
   }
  }
  snapshot(){
   this.expirePending();const merged={};
   for(const kind of ['tasks','submissions']){const map=new Map(this.raw[kind].map(row=>[row.id,row]));for(const [id,p] of Object.entries(this.pending[kind])){const old=map.get(id),record={...(old||{}),...p.record};if(kind==='submissions'&&old?.photos?.length&&!p.record.photos?.length){record.photos=old.photos;record.photosPending=false}map.set(id,record)};merged[kind]=[...map.values()]}
   return {tasks:merged.tasks.filter(t=>t.deleted!=='true'),submissions:merged.submissions,tasksAt:this.times.tasks,submissionsAt:this.times.submissions,hasTasks:this.times.tasks!==null,hasSubmissions:this.times.submissions!==null,refreshing:this.refreshing,errors:{...this.errors},pendingCount:Object.keys(this.pending.tasks).length+Object.keys(this.pending.submissions).length};
  }
  emit(){try{this.onChange(this.snapshot())}catch(e){if(root.console)root.console.warn('Paparan CSV belum dikemas kini.',e)}}
  async readFeed(kind){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
   try{
    const response=await this.fetcher(this.urls[kind],{redirect:'follow',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('CSV tidak dapat dibaca (HTTP '+response.status+').');
    const rows=normalizedRows(await response.text(),kind);
    this.raw[kind]=rows;this.times[kind]=this.now();delete this.errors[kind];this.reconcile(kind);this.persist();this.emit();
   }catch(e){this.errors[kind]=e.name==='AbortError'?'Sambungan CSV tamat masa.':e.message||'CSV tidak dapat dibaca.';this.emit()}
   finally{clearTimeout(timer)}
  }
  refresh({force=false}={}){
   if(this.inFlight)return this.inFlight;
   if(!force&&this.lastAttempt!==null&&this.now()-this.lastAttempt<20000)return Promise.resolve(this.snapshot());
   this.lastAttempt=this.now();this.refreshing=true;this.emit();
   this.inFlight=Promise.all(['tasks','submissions'].map(kind=>this.readFeed(kind))).then(()=>{this.refreshing=false;this.inFlight=null;this.emit();return this.snapshot()});
   return this.inFlight;
  }
  confirm(action,data,result){
   const r=result&&typeof result==='object'?result:{};let kind,record;
   const current=this.snapshot(),now=new Date(this.now()).toISOString();
   if(action==='createTask'||action==='updateTask'){
    kind='tasks';const id=r.id||data.task?.id;if(!id)return;
    record={...current.tasks.find(t=>t.id===id),...data.task,...r,id,deleted:'false',updatedAt:r.updatedAt||now};
   }else if(action==='deleteTask'){
    kind='tasks';record={id:data.id,deleted:'true',updatedAt:now};
   }else if(action==='submitTask'){
    if(!r.id)return;kind='submissions';record={id:r.id,taskId:data.taskId,className:data.className,studentName:data.studentName,message:data.message||'',photos:normalizePhotos(r.photos),photosPending:!!data.photos?.length&&!normalizePhotos(r.photos).length,submittedAt:r.submittedAt||now,stars:'0',marks:'',feedback:'',reviewedAt:''};
   }else if(action==='gradeSubmission'){
    kind='submissions';const old=current.submissions.find(s=>s.id===data.id);if(!old)return;
    record={...old,stars:String(data.stars),marks:String(data.marks??''),feedback:data.feedback||'',reviewedAt:r.reviewedAt||now};
   }else return;
   // Only whitelisted metadata is persisted; passwords, session tokens and base64 uploads are excluded.
   const fields=kind==='tasks'?TASK_FIELDS:SUB_FIELDS;
   record=Object.fromEntries(fields.filter(f=>f in record).map(f=>[f,record[f]]));
   this.pending[kind][record.id]={record,confirmedAt:this.now()};this.persist();this.emit();
  }
 }
 root.PDPRData={CSVStore,parseCSV,normalizedRows,normalizePhotos,photoDriveLink,photoPreviewUrl};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.PDPRData;
})(typeof window!=='undefined'?window:globalThis);
