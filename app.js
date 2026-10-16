'use strict';
const DEFAULT_API='https://script.google.com/macros/s/AKfycbzSiPUCZlYfcyoZz2ULfubdUDFOQ2weaTC7ACRkfv3RS-J1RdO2PdRf_wmeu2dN0l7QXA/exec';
const SUBJECTS=['Bahasa Melayu','Bahasa Inggeris','Matematik','Sains','Pendidikan Islam','Pendidikan Moral','Bahasa Arab','Pendidikan Jasmani dan Kesihatan','Pendidikan Seni Visual','Pendidikan Muzik','Sejarah','Reka Bentuk dan Teknologi'];
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateText=d=>new Date(d+'T12:00:00+08:00').toLocaleDateString('ms-MY',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'});
const uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
const state={role:'student',teacherTab:'create',students:[],teachers:[],subjects:SUBJECTS,tasks:[],submissions:[],className:'',name:'',date:today(),filters:{className:'',subject:'',date:today()},token:sessionStorage.getItem('pdpr-token')||'',tokenExpiresAt:Number(sessionStorage.getItem('pdpr-token-expires'))||0,authNotice:'',demo:false,ready:false,live:false,loading:false};
let toastTimer,loadVersion=0;

const TASKS_CSV='https://docs.google.com/spreadsheets/d/e/2PACX-1vRLTpPsHDnSTydY1NZjQ47ZZCaFL5Sw-QxCJFo9A5EsY2bkF1bZLoRmbiUACAOr7jTRUg41Gb6L9_HT/pub?gid=1736275344&single=true&output=csv';
const SUBMISSIONS_CSV='https://docs.google.com/spreadsheets/d/e/2PACX-1vRLTpPsHDnSTydY1NZjQ47ZZCaFL5Sw-QxCJFo9A5EsY2bkF1bZLoRmbiUACAOr7jTRUg41Gb6L9_HT/pub?gid=1797850436&single=true&output=csv';
let csvStore,uiRefreshPending=false,indexedSubmissions,submittedKeys=new Set();
const detailCache=new Map();
const ROSTER_BASE='https://docs.google.com/spreadsheets/d/e/2PACX-1vRTHK4KM1pGmIf8dqmVJpLjEhdjZFE516IF8m2R2zVEFSduSV_6AUgT8IePr70SJnMsNv3N5WnFCwnR/pub?single=true&output=csv&gid=';
let rosterInFlight;
async function refreshRoster(){
 if(state.demo)return;
 try{const cached=JSON.parse(localStorage.getItem('pdpr-roster-csv-v1')||'null');if(cached?.at&&Date.now()-cached.at<300000)return}catch(_){}
 if(rosterInFlight)return rosterInFlight;
 rosterInFlight=(async()=>{
  const read=async gid=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(ROSTER_BASE+gid,{cache:'no-store',redirect:'follow',signal:controller.signal});if(!response.ok)throw new Error('Senarai nama tidak dapat dibaca.');return PDPRData.parseCSV(await response.text())}finally{clearTimeout(timer)}};
  try{
   const [pupils,staff]=await Promise.all([read('288612582'),read('0')]);
   if(!['KELAS','NAMA MURID'].every(h=>pupils.headers.includes(h))||!staff.headers.includes('NAMA GURU'))throw new Error('Lajur senarai nama tidak sepadan.');
   const seen=new Set(),students=pupils.rows.map(r=>({className:r.KELAS.trim(),name:r['NAMA MURID'].trim()})).filter(p=>{const key=JSON.stringify([p.className,p.name]);if(!p.className||!p.name||seen.has(key))return false;seen.add(key);return true});
   const teachers=[...new Set(staff.rows.map(r=>r['NAMA GURU'].trim()).filter(Boolean))];
   if(!students.length||!teachers.length)throw new Error('Senarai nama kosong.');
   try{localStorage.setItem('pdpr-roster-csv-v1',JSON.stringify({at:Date.now(),students,teachers}))}catch(_){}
   if(!state.demo){state.students=students;state.teachers=teachers;if(state.name&&!students.some(p=>p.className===state.className&&p.name===state.name))state.name='';renderDataViews()}
  }catch(e){console.warn('Senarai nama tersimpan digunakan.',e.message)}
  finally{rosterInFlight=undefined}
 })();return rosterInFlight;
}
function csvConfig(){return {tasksUrl:localStorage.getItem('pdpr-tasks-csv')||TASKS_CSV,submissionsUrl:localStorage.getItem('pdpr-submissions-csv')||SUBMISSIONS_CSV,apiUrl:localStorage.getItem('pdpr-api')||DEFAULT_API}}
function getCsvStore(){
 const config=csvConfig(),signature=JSON.stringify([config.tasksUrl,config.submissionsUrl,config.apiUrl]);
 if(csvStore?.signature===signature)return csvStore;
 const store=new PDPRData.CSVStore({...config,storage:localStorage,onChange:snapshot=>{if(csvStore===store&&!state.demo){applyCsvSnapshot(snapshot);updateCsvStatus(snapshot);renderDataViews()}}});
 csvStore=store;return store;
}
function applyCsvSnapshot(snapshot){state.tasks=snapshot.tasks;state.submissions=snapshot.submissions;state.ready=snapshot.hasTasks;state.submissionsReady=snapshot.hasSubmissions;state.live=snapshot.hasTasks&&snapshot.hasSubmissions&&!Object.keys(snapshot.errors).length}
function updateCsvStatus(snapshot){
 const button=$('#refresh-data');if(button){button.disabled=snapshot.refreshing;button.textContent=snapshot.refreshing?'↻ Mengemas kini…':'↻ Segar semula'}
 const errors=Object.values(snapshot.errors);
 if(errors.length){connection((snapshot.hasTasks?'Paparan tersimpan tersedia · ':'')+'Sebahagian CSV belum dapat dibaca. Klik Segar semula.','error');$('#connection-text').title=errors.join(' ');return}
 $('#connection-text').title='Data paparan dibaca terus daripada CSV Google Sheet.';
 if(snapshot.refreshing){connection(snapshot.hasTasks?'Paparan sedia ada · Mengemas kini CSV di latar…':'Membaca CSV Google Sheet…');return}
 if(snapshot.hasTasks){const time=new Date(snapshot.tasksAt).toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kuala_Lumpur'});connection(`CSV Google Sheet · ${snapshot.tasks.length} tugasan · ${snapshot.submissions.length} penghantaran · Dibaca ${time}${snapshot.pendingCount?' · Simpanan baharu disahkan':''}`);return}
 connection('Belum ada data CSV. Klik Segar semula.','error');
}
function renderDataViews(){
 if($('#modal')?.open||$('#teacher-auth-modal')?.open||quickReview.saving.size)return;
 if(state.role==='teacher'&&!state.token){const login=$('#login button');if(login)login.disabled=!state.ready;else renderTeacher();return}
 if(state.role==='teacher'&&state.teacherTab==='create')return;
 const active=document.activeElement;
 if(active&&$('#workspace').contains(active)&&active.matches('input,select,textarea')){uiRefreshPending=true;return}
 uiRefreshPending=false;render();
}
async function refreshCsv(force=false){if(state.demo)return;const store=getCsvStore();await store.refresh({force})}
function hasSubmission(task,pupil){
 if(indexedSubmissions!==state.submissions){indexedSubmissions=state.submissions;submittedKeys=new Set(state.submissions.map(s=>JSON.stringify([s.taskId,s.className,s.studentName])))}
 return submittedKeys.has(JSON.stringify([task.id,pupil.className,pupil.name]));
}
function confirmedMutation(action,data,result){if(state.demo)return;detailCache.clear();try{getCsvStore().confirm(action,data,result)}catch(e){console.warn('Rekod disimpan; cache tempatan belum dikemas kini.',e)}}
async function refreshVisibleData(){if(!state.demo)return refreshCsv(true);if(state.role==='teacher'&&state.token)return loadTeacher();if(state.role==='student'&&state.name)return loadStudent();return initialize()}


// Teacher-session recovery: only explicit authentication failures may be replayed.
let teacherReauthPromise;
const teacherActions=new Set(['teacherData','createTask','updateTask','deleteTask','gradeSubmission']);
function isTeacherAction(action,data={}){return teacherActions.has(action)||(action==='getSubmission'&&data.actor==='teacher')}
function sessionExpired(){return !!state.tokenExpiresAt&&Date.now()>=state.tokenExpiresAt}
function responseError(payload){const error=new Error(payload?.error||'Permintaan tidak berjaya.');error.code=payload?.code||'';return error}
function isTeacherAuthError(error,action,data={}){
 return error?.code==='AUTH_REQUIRED'||/^Sesi guru tamat/i.test(error?.message||'')||(action==='getSubmission'&&data.actor==='teacher'&&error?.message==='Nama murid dan kelas tidak sepadan dengan senarai sekolah.');
}
function clearTeacherSession(notice=''){
 state.token='';state.tokenExpiresAt=0;state.authNotice=notice;detailCache.clear();
 try{sessionStorage.removeItem('pdpr-token');sessionStorage.removeItem('pdpr-token-expires')}catch(_){}
}
function rememberTeacherSession(result){
 if(!result||typeof result.token!=='string'||!result.token)throw new Error('Login tidak memberikan sesi guru yang sah. Cuba lagi.');
 state.token=result.token;state.tokenExpiresAt=Date.now()+Math.min(21600,Math.max(1,Number(result.expiresIn)||21600))*1000;state.authNotice='';detailCache.clear();
 try{sessionStorage.setItem('pdpr-token',state.token);sessionStorage.setItem('pdpr-token-expires',String(state.tokenExpiresAt))}catch(_){}
}
function requestTeacherLogin(){
 if(teacherReauthPromise)return teacherReauthPromise;
 const dialog=$('#teacher-auth-modal');
 teacherReauthPromise=new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;const passwordField=dialog.querySelector('#teacher-reauth-password');if(passwordField)passwordField.value='';dialog.close();teacherReauthPromise=undefined;if(error){if(state.role==='teacher'&&!$('#modal').open)renderTeacher();reject(error)}else resolve()};
  const cancel=()=>{const error=new Error('Sila login semula untuk meneruskan semakan.');error.code='AUTH_CANCELLED';finish(error)};
  dialog.innerHTML=modalHead('Login semula guru','Sesi guru telah tamat atau tidak lagi sah. Masukkan kata laluan untuk meneruskan tindakan tadi.')+`<form id="teacher-reauth-form" class="modal-form"><div class="notice">Tapisan dan hasil kerja yang sedang dibuka dikekalkan.</div><div class="field"><label for="teacher-reauth-password">Kata laluan guru</label><input id="teacher-reauth-password" type="password" required autocomplete="current-password" maxlength="100" placeholder="Masukkan kata laluan guru"></div><div id="teacher-reauth-error" class="inline-error" role="alert"></div><button type="submit" class="btn red full" id="teacher-reauth-submit">Login & teruskan →</button><button type="button" class="btn light" id="teacher-reauth-cancel">Batal</button></form>`;
  dialog.querySelector('.close').onclick=cancel;$('#teacher-reauth-cancel').onclick=cancel;
  dialog.oncancel=event=>{event.preventDefault();cancel()};
  $('#teacher-reauth-form').onsubmit=async event=>{
   event.preventDefault();const button=$('#teacher-reauth-submit');button.disabled=true;button.textContent='Mengesahkan login…';$('#teacher-reauth-error').textContent='';
   try{const result=await backendRequest('login',{password:$('#teacher-reauth-password').value});if(settled)return;rememberTeacherSession(result);playSound('success');finish()}
   catch(error){if(settled)return;showError($('#teacher-reauth-error'),error);button.disabled=false;button.textContent='Login & teruskan →'}
  };
  dialog.showModal();$('#teacher-reauth-password').focus();
 });return teacherReauthPromise;
}
async function teacherBackendRequest(action,data={}){
 if(!isTeacherAction(action,data))return backendRequest(action,data);
 if(!state.token||sessionExpired()){clearTeacherSession('Sesi guru tamat. Sila login semula.');await requestTeacherLogin()}
 const originalToken=state.token;
 try{return await backendRequest(action,data)}
 catch(error){
  if(!isTeacherAuthError(error,action,data))throw error;
  // A late rejection from an old request must not discard a newer valid login.
  if(!state.token||state.token===originalToken){clearTeacherSession('Sesi guru tamat. Sila login semula.');await requestTeacherLogin()}
  const retryToken=state.token;
  try{return await backendRequest(action,data)}
  catch(retryError){if(isTeacherAuthError(retryError,action,data)&&state.token===retryToken){clearTeacherSession('Sesi guru tidak dapat disahkan. Sila login semula.');if(!$('#modal').open&&state.role==='teacher')renderTeacher()}throw retryError}
 }
}
// End teacher-session recovery.

// Original chiptune effects, synthesized locally after a user gesture.
let audioContext;
let soundEnabled=true;
try{soundEnabled=localStorage.getItem('pdpr-sound')!=='off'}catch(_){}
const soundActions=new Set(['login','createTask','updateTask','deleteTask','submitTask','gradeSubmission']);
function updateSoundButton(){
 const button=$('#sound-toggle');if(!button)return;
 button.setAttribute('aria-pressed',String(soundEnabled));
 button.setAttribute('aria-label',soundEnabled?'Senyapkan bunyi':'Aktifkan bunyi');
 button.title=soundEnabled?'Senyapkan bunyi permainan':'Aktifkan bunyi permainan';
 button.innerHTML=`<span aria-hidden="true">${soundEnabled?'🔊':'🔇'}</span><span class="sound-label">Bunyi ${soundEnabled?'aktif':'senyap'}</span>`;
}
function playSound(kind='click',level=1){
 if(!soundEnabled)return;
 try{
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  if(!AudioEngine)return;
  if(!audioContext||audioContext.state==='closed')audioContext=new AudioEngine();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const effects={
   click:[[740,0,.045],[988,.045,.055]],
   tab:[[988,0,.055],[1318.5,.065,.09]],
   close:[[659,0,.045],[440,.05,.065]],
   action:[[523.25,0,.055],[783.99,.06,.075]],
   star:[[523.25*Math.pow(2,(Math.max(1,Math.min(5,level))-1)/6),0,.09],[1046.5,.09,.07]],
   success:[[523.25,0,.07],[659.25,.08,.07],[783.99,.16,.07],[1046.5,.24,.14]],
   error:[[392,0,.075],[293.66,.09,.11]]
  };
  const start=audioContext.currentTime+.008;
  for(const [frequency,offset,duration] of effects[kind]||effects.click){
   const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
   oscillator.type=kind==='error'?'triangle':'square';
   oscillator.frequency.setValueAtTime(frequency,start+offset);
   gain.gain.setValueAtTime(0,start+offset);
   gain.gain.linearRampToValueAtTime(.045,start+offset+.005);
   gain.gain.exponentialRampToValueAtTime(.001,start+offset+duration);
   gain.gain.setValueAtTime(0,start+offset+duration+.008);
   oscillator.connect(gain);gain.connect(audioContext.destination);
   oscillator.start(start+offset);oscillator.stop(start+offset+duration+.012);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  }
 }catch(_){/* Audio support never blocks a school task. */}
}
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target:null;
 const button=target?.closest('button,input[type="file"],a.brand,a.work-drive-link');
 if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||button.id==='sound-toggle')return;
 if(button.matches('[data-role],[data-teachertab]'))playSound('tab');
 else if(button.matches('[data-star]'))playSound('star',Number(button.dataset.star));
 else if(button.matches('.close,#cancel-delete,#logout,[data-delete],#confirm-delete'))playSound('close');
 else if(button.matches('.red,[data-submit]'))playSound('action');
 else playSound('click');
},true);
function toggleSound(){
 soundEnabled=!soundEnabled;
 try{localStorage.setItem('pdpr-sound',soundEnabled?'on':'off')}catch(_){}
 if(!soundEnabled&&audioContext){const previous=audioContext;audioContext=undefined;previous.close().catch(()=>{})}
 updateSoundButton();if(soundEnabled)playSound('tab');
}
async function api(action,data={}){
 try{const result=await apiRequest(action,data);if(soundActions.has(action)){if(action!=='login')confirmedMutation(action,data,result);playSound('success')}return result}
 catch(error){if(soundActions.has(action))playSound('error');throw error}
}

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000)}
function connection(text,kind=''){const el=$('#connection');el.className='connection '+kind;$('#connection-text').textContent=text;$('#try-demo').hidden=state.demo||state.live}
function options(items,value='',placeholder='Pilih…'){return `<option value="">${esc(placeholder)}</option>`+items.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${esc(x)}</option>`).join('')}
function classes(){return [...new Set(state.students.map(x=>x.className))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true}))}
function empty(title,desc,icon='🍄'){return `<div class="empty"><span>${icon}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`}
function linkify(text){return esc(text).replace(/https?:\/\/[^\s<>]+/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)}
function icon(subject){return subject.includes('Matematik')?'🔢':subject.includes('Sains')?'🔬':subject.includes('Inggeris')?'🔤':subject.includes('Islam')?'🌙':subject.includes('Seni')?'🎨':subject.includes('Muzik')?'🎵':'📚'}
function modal(html){$('#modal-content').innerHTML=html;$('#modal').showModal();$('#modal').querySelector('.close')?.addEventListener('click',()=>$('#modal').close())}
function modalHead(title,desc=''){return `<div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><button type="button" class="close" aria-label="Tutup">×</button></div>`}
function showError(el,error){el.textContent=error.message||String(error)}
async function rosterBundle(){try{const cached=JSON.parse(localStorage.getItem('pdpr-roster-csv-v1')||'null');if(cached?.students?.length&&cached?.teachers?.length)return cached}catch(_){}return window.PDPR_ROSTER_BUNDLE || await (await fetch('roster.json')).json()}
async function apiRequest(action,data={}){
 if(state.demo)return demoApi(action,data);
 if(action==='getSubmission'){const key=JSON.stringify([state.token,data.actor||'',state.className,state.name,data.id]);const cached=detailCache.get(key);if(cached&&Date.now()-cached.at<30000&&(!isTeacherAction(action,data)||(!sessionExpired()&&state.tokenExpiresAt)))return cached.promise;for(const [cachedKey,entry] of detailCache)if(Date.now()-entry.at>=30000)detailCache.delete(cachedKey);while(detailCache.size>=3)detailCache.delete(detailCache.keys().next().value);const promise=teacherBackendRequest(action,data);detailCache.set(key,{at:Date.now(),promise});promise.catch(()=>detailCache.delete(key));return promise}
 return teacherBackendRequest(action,data);
}
async function backendRequest(action,data={}){
 if(window.google?.script?.run)return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(r=>r.ok?resolve(r.data):reject(responseError(r))).withFailureHandler(reject).api({action,...data,token:state.token}));
 const url=localStorage.getItem('pdpr-api')||DEFAULT_API;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{const read=['health','init','studentData','summary'].includes(action);const query=new URLSearchParams({action,...data});const res=await fetch(read?url+'?'+query:url,{method:read?'GET':'POST',redirect:'follow',...(read?{}:{headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data,token:state.token})}),signal:controller.signal});const text=await res.text();let payload;try{payload=JSON.parse(text)}catch{throw new Error('Endpoint belum menggunakan kod Apps Script PDPR ini. Pasang Code.gs dan cipta versi deployment baharu.')}if(!payload.ok)throw responseError(payload);return payload.data;
 }catch(e){if(e.name==='AbortError')throw new Error('Sambungan tamat masa. Sila semak sambungan dan cuba lagi.');if(e.message==='Failed to fetch'||e instanceof TypeError)throw new Error('Sambungan Google belum tersedia. Semak deployment Apps Script atau cuba mod demo.');throw e}finally{clearTimeout(timer)}
}
function demoDB(){try{return JSON.parse(localStorage.getItem('pdpr-demo-v1'))||{tasks:[],submissions:[]}}catch{return {tasks:[],submissions:[]}}}
function saveDemo(db){try{localStorage.setItem('pdpr-demo-v1',JSON.stringify(db))}catch{throw new Error('Storan demo penuh. Cuba gambar yang lebih kecil atau kosongkan data demo dalam tetapan.')}}
async function demoApi(action,d){const db=demoDB();if(action==='login'){if(d.password!=='JBA1077')throw new Error('Kata laluan tidak tepat.');return {token:'demo-teacher'}}
 if(action==='init')return {...await rosterBundle(),subjects:SUBJECTS,tasks:db.tasks.filter(x=>!x.deleted)};
 if(action==='getSubmission'){const s=db.submissions.find(s=>s.id===d.id);if(!s)throw new Error('Rekod tidak ditemui.');return s}
 if(action==='studentData')return {submissions:db.submissions.filter(x=>x.className===d.className&&x.studentName===d.studentName)};
 if(action==='summary')return {tasks:db.tasks.filter(x=>!x.deleted)};
 if(action==='teacherData')return {tasks:db.tasks.filter(x=>!x.deleted),submissions:db.submissions};
 if(action==='createTask'){const t={...d.task,id:uuid(),createdAt:new Date().toISOString()};db.tasks.push(t);saveDemo(db);return t}
 if(action==='updateTask'){const i=db.tasks.findIndex(t=>t.id===d.task.id);if(i<0)throw new Error('Tugasan tidak ditemui.');if(db.submissions.some(s=>s.taskId===d.task.id)&&db.tasks[i].className!==d.task.className)throw new Error('Kelas tidak boleh ditukar selepas penghantaran diterima.');db.tasks[i]={...db.tasks[i],...d.task};saveDemo(db);return db.tasks[i]}
 if(action==='deleteTask'){db.tasks.find(t=>t.id===d.id).deleted=true;saveDemo(db);return {deleted:true}}
 if(action==='submitTask'){if(db.submissions.some(s=>s.taskId===d.taskId&&s.className===d.className&&s.studentName===d.studentName))throw new Error('Tugasan ini sudah dihantar.');const s={id:uuid(),...d,photos:d.photos.map(p=>({url:p.data,name:p.name})),submittedAt:new Date().toISOString(),stars:'',marks:'',feedback:''};db.submissions.push(s);saveDemo(db);return s}
 if(action==='gradeSubmission'){const s=db.submissions.find(s=>s.id===d.id);Object.assign(s,{stars:d.stars,marks:d.marks,feedback:d.feedback,reviewedAt:new Date().toISOString()});saveDemo(db);return s}
 throw new Error('Tindakan tidak disokong.');}
async function initialize(){
 if(state.demo){try{const data=await api('init');Object.assign(state,data);state.ready=true;state.live=false;state.submissionsReady=true;connection('MOD DEMO · Rekod percubaan disimpan pada pelayar ini sahaja.','demo');$('#refresh-data').disabled=false;$('#refresh-data').textContent='↻ Segar semula'}catch(e){toast(e.message)}render();return}
 try{const roster=await rosterBundle();state.students=roster.students;state.teachers=roster.teachers;const store=getCsvStore();applyCsvSnapshot(store.snapshot());render();updateCsvStatus(store.snapshot());refreshRoster();await refreshCsv()}catch(e){connection('Senarai nama atau CSV belum dapat dibaca. Klik Segar semula.','error');toast(e.message)}
}
async function enableDemo(){resetQuickReview();state.demo=true;state.token='';clearTeacherSession();state.submissions=[];state.name='';state.className='';let db=demoDB();if(!localStorage.getItem('pdpr-demo-v1')){const r=await rosterBundle();const cl=r.students[0].className;db.tasks=[{id:uuid(),date:today(),className:cl,subject:'Bahasa Melayu',teacher:r.teachers[0],title:'Jom bina ayat!',instructions:'Bina 5 ayat berdasarkan aktiviti di rumah. Tulis dengan kemas dalam buku latihan Bahasa Melayu.',message:'Cuba yang terbaik. Cikgu percaya kamu boleh! 🍄'},{id:uuid(),date:today(),className:cl,subject:'Matematik',teacher:r.teachers[1],title:'Misi tambah & tolak',instructions:'Selesaikan 10 soalan tambah dan tolak di dalam buku latihan. Tunjukkan jalan pengiraan.',message:'Semak jawapan sebelum hantar. ⭐'},{id:uuid(),date:today(),className:cl,subject:'Sains',teacher:r.teachers[2],title:'Terokai benda hidup',instructions:'Lukis dan labelkan 3 benda hidup yang kamu temui di sekitar rumah.',message:'Selamat meneroka! 🌱'}];saveDemo(db)}await initialize();toast('Mod demo diaktifkan. Semua penghantaran ialah percubaan.');}
function render(){document.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('active',b.dataset.role===state.role));if(state.role==='student')renderStudent();else if(state.role==='teacher')renderTeacher();else renderSummary()}
function heading(title,desc,extra=''){return `<div class="section-heading"><div><h2>${title}</h2><p>${desc}</p></div>${extra}</div>`}
function renderStudent(){const own=state.submissions.filter(s=>s.studentName===state.name&&s.className===state.className);const tasks=state.name?state.tasks.filter(t=>t.className===state.className&&t.date===state.date):[];const submitted=tasks.filter(t=>own.some(s=>s.taskId===t.id)).length;const stars=own.filter(s=>tasks.some(t=>t.id===s.taskId)).reduce((n,s)=>n+Number(s.stars||0),0);
 $('#workspace').innerHTML=heading('Jom mulakan misi!','Pilih kelas dan nama untuk melihat tugasan anda.',`<span class="level-badge">★ &nbsp; SETIAP USAHA BERMAKNA</span>`)+`<form id="student-select" class="panel identity"><div class="field"><label for="student-class"><span class="step">1</span> Kelas saya</label><select id="student-class" required>${options(classes(),state.className,'Pilih kelas anda')}</select></div><div class="field"><label for="student-name"><span class="step">2</span> Nama saya</label><select id="student-name" required ${!state.className?'disabled':''}>${options(state.students.filter(x=>x.className===state.className).map(x=>x.name),state.name,'Pilih nama anda')}</select></div><button class="btn red" aria-describedby="student-selection-hint" ${!state.ready||!state.className||!state.name?'disabled':''}>Lihat tugasan <span aria-hidden="true">→</span></button><p id="student-selection-hint" class="selection-hint">${!state.ready?'Data tugasan sedang dimuatkan. Anda boleh memilih kelas dan nama dahulu.':!state.className||!state.name?'Pilih kelas dan nama untuk mengaktifkan butang Lihat tugasan.':'Butang aktif. Klik Lihat tugasan untuk menyemak paparan anda.'}</p></form>`+`<div class="student-overview"><div class="stat"><span class="stat-icon">▤</span><div><strong>${tasks.length}</strong><small>Misi diberikan</small></div></div><div class="stat"><span class="stat-icon">✓</span><div><strong>${submitted}</strong><small>Sudah dihantar</small></div></div><div class="stat"><span class="stat-icon">★</span><div><strong>${stars}</strong><small>Bintang dikumpul</small></div></div></div><div class="task-heading"><div><h3>${state.date===today()?'Misi hari ini':'Misi pilihan anda'} <span class="top-hint">(${tasks.length})</span></h3><p class="small-text">${state.name?esc(state.name.split(' ').slice(0,3).join(' '))+' · '+esc(state.className):'Sedia untuk pengembaraan seterusnya?'}</p></div><label class="date-filter">Tarikh tugasan <input id="student-date" aria-label="Tarikh tugasan" type="date" value="${state.date}"></label></div><div class="task-grid">${!state.name?empty('Pilih watak anda dahulu','Pilih kelas dan nama di atas. Misi daripada guru akan muncul di sini.','🎒'):!state.ready?empty('Mendapatkan misi daripada Sheet','Anda boleh terus memilih kelas dan nama sementara data dimuatkan.','☁️'):!tasks.length?empty('Tiada misi untuk tarikh ini','Belum ada tugasan diberikan. Pilih tarikh lain atau semak semula kemudian.','☁️'):tasks.map(t=>taskCard(t,own.find(s=>s.taskId===t.id))).join('')}</div>`;
 $('#student-class').onchange=e=>{state.className=e.target.value;state.name='';state.submissions=[];renderStudent()};$('#student-name').onchange=async e=>{state.name=e.target.value;if(state.name&&state.ready)await loadStudent();else renderStudent()};$('#student-select').onsubmit=async e=>{e.preventDefault();state.name=$('#student-name').value;await loadStudent()};$('#student-date').onchange=async e=>{state.date=e.target.value||today();if(state.name)await loadStudent();else renderStudent()};document.querySelectorAll('[data-submit]').forEach(b=>b.onclick=()=>submitModal(b.dataset.submit));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>viewSubmission(b.dataset.view));}
function taskCard(t,s){return `<article class="task-card"><div class="task-top"><span class="subject">${esc(t.subject)}</span><span class="subject-icon">${icon(t.subject)}</span></div><div class="task-body"><h4>${esc(t.title)}</h4><p class="linkified">${linkify(t.instructions)}</p><div class="task-meta">✎ ${esc(t.teacher)}<br>▦ ${esc(dateText(t.date))}</div>${t.message?`<div class="feedback">💬 ${esc(t.message)}</div>`:''}${s?.reviewedAt?`<div class="feedback"><span class="stars">${'★'.repeat(Number(s.stars||0))}${'☆'.repeat(5-Number(s.stars||0))}</span>${s.marks!==''&&s.marks!=null?` <b>${esc(s.marks)}/100</b>`:''}<p>${esc(s.feedback||'Tugasan anda telah disemak.')}</p></div>`:''}</div><div class="task-footer"><span class="status ${s?s.reviewedAt?'done':'review':''}">${s?s.reviewedAt?'★ Sudah disemak':'✓ Sudah dihantar':state.submissionsReady?'● Belum dihantar':'Rekod belum tersedia'}</span>${s?`<button class="btn small light" data-view="${esc(s.id)}">Lihat rekod ↗</button>`:`<button class="btn small" data-submit="${esc(t.id)}" ${!state.submissionsReady?'disabled':''}>Hantar tugasan →</button>`}</div></article>`}
async function loadStudent(){
 if(!state.demo){applyCsvSnapshot(getCsvStore().snapshot());if(state.role==='student')renderStudent();refreshCsv();return}
 const v=++loadVersion;try{const data=await api('studentData',{className:state.className,studentName:state.name});if(v!==loadVersion)return;state.submissions=data.submissions;state.submissionsReady=true;state.tasks=(await api('summary')).tasks;if(state.role==='student')renderStudent()}catch(e){toast(e.message)}
}
async function preparePhotos(files){if(files.length>4)throw new Error('Maksimum 4 gambar sahaja.');return Promise.all([...files].map(async file=>{if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Gunakan gambar JPG, PNG atau WebP sahaja.');if(file.size>10*1024*1024)throw new Error('Setiap gambar mestilah kurang daripada 10 MB.');const raw=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Gambar tidak dapat dibaca.'));r.readAsDataURL(file)});const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Gambar tidak sah.'));i.src=raw});const c=document.createElement('canvas'),scale=Math.min(1,1400/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/jpeg',.8);if(data.length>2000000)throw new Error('Gambar terlalu besar selepas dimampatkan. Pilih gambar lebih kecil.');return {name:file.name.replace(/\.[^.]+$/,'')+'.jpg',mimeType:'image/jpeg',data}}))}
function submitModal(id){const task=state.tasks.find(t=>t.id===id);let photos=[],busy=false;modal(modalHead('Hantar misi anda',task.title+' · '+task.subject)+`<form id="submission-form" class="modal-form"><div class="notice">Semak sebelum hantar. Setiap murid hanya boleh menghantar sekali bagi setiap tugasan.${state.demo?' Ini penghantaran demo sahaja.':''}</div><div class="field"><label for="student-message">Mesej kepada guru</label><textarea id="student-message" maxlength="3000" placeholder="Cikgu, saya sudah menyiapkan tugasan…"></textarea></div><div class="field"><label for="student-photos">Gambar hasil kerja <span class="small-text">(maksimum 4)</span></label><input type="file" id="student-photos" accept="image/jpeg,image/png,image/webp" multiple><span class="small-text">JPG, PNG atau WebP · maksimum 10 MB setiap gambar. Gambar akan dimampatkan.</span><div class="photo-grid" id="photo-preview"></div></div><div id="submit-error" class="inline-error" role="alert"></div><button class="btn red full" id="send-submission">Hantar tugasan →</button></form>`);$('#student-photos').onchange=async e=>{const btn=$('#send-submission');btn.disabled=true;$('#submit-error').textContent='';try{photos=await preparePhotos(e.target.files);$('#photo-preview').innerHTML=photos.map(p=>`<img src="${p.data}" alt="Pratonton hasil kerja">`).join('')}catch(err){photos=[];e.target.value='';$('#photo-preview').innerHTML='';showError($('#submit-error'),err)}finally{btn.disabled=false}};$('#submission-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const message=$('#student-message').value.trim();if(!message&&!photos.length){$('#submit-error').textContent='Sila masukkan mesej atau sekurang-kurangnya satu gambar.';return}busy=true;const btn=$('#send-submission');btn.disabled=true;btn.textContent='Sedang menghantar…';try{await api('submitTask',{taskId:id,className:state.className,studentName:state.name,message,photos,requestId:uuid()});$('#modal').close();toast(state.demo?'Berjaya disimpan dalam mod demo!':'Tugasan berjaya dihantar ke Google Sheet!');await loadStudent()}catch(err){showError($('#submit-error'),err);busy=false;btn.disabled=false;btn.textContent='Cuba hantar semula →'}}}
async function viewSubmission(id){const saved=state.submissions.find(s=>s.id===id),known=reviewPhotos(saved?.photos);let s=saved;if(!known.length||!known.every(photo=>reviewImageUrl(photo))){try{const detail=await api('getSubmission',{id,actor:'student',className:state.className,studentName:state.name});s={...saved,...detail,photos:reviewPhotos(detail.photos).length?detail.photos:known}}catch(e){if(!known.length){toast(e.message);return}s={...saved,photos:known};toast('Pratonton belum tersedia. Gunakan pautan Google Drive.')}}modal(modalHead('Rekod penghantaran',dateText(s.submittedAt.slice(0,10)))+`<p class="sub-message">${esc(s.message||'Tiada mesej.')}</p><div class="photo-grid">${photoHTML(s.photos)}</div>${drivePhotoLinks(s.photos)}${s.reviewedAt?`<div class="feedback"><div class="stars">${'★'.repeat(Number(s.stars||0))}${'☆'.repeat(5-Number(s.stars||0))}</div>${s.marks!==''&&s.marks!=null?`<b>Markah: ${esc(s.marks)}/100</b>`:''}<p>${esc(s.feedback||'Sudah disemak oleh guru.')}</p></div>`:'<div class="notice">Tugasan diterima. Menunggu semakan guru.</div>'}`)}
function photoHTML(photos){return reviewPhotos(photos).map(photo=>{const url=reviewImageUrl(photo);return url?`<img src="${esc(url)}" alt="${esc(photo.name||'Hasil kerja murid')}" loading="lazy" referrerpolicy="no-referrer">`:'<span class="small-text">Gunakan pautan Google Drive untuk melihat gambar ini.</span>'}).join('')}
function renderTeacher(){if(!state.demo&&state.token&&sessionExpired())clearTeacherSession('Sesi guru tamat. Sila login semula.');if(!state.token){$('#workspace').innerHTML=heading('Ruang guru','Bimbing setiap misi, raikan setiap pencapaian.')+`<div class="login-layout"><div class="login-info"><span style="font-size:32px">🔑</span><h3>Di sebalik setiap bintang,<br>ada seorang guru.</h3><p>Cipta tugasan, semak hasil kerja murid dan pantau kemajuan kelas dalam satu ruang.</p><span class="small-text">AKSES KHAS GURU · SK TAMAN DAYA</span></div><form id="login" class="panel login-form"><div class="field"><label for="password">Kata laluan guru</label><input type="password" id="password" required placeholder="Masukkan kata laluan" autocomplete="current-password" maxlength="100"></div><div id="login-error" class="inline-error" role="alert">${esc(state.authNotice||'')}</div><button class="btn red full" ${!state.ready?'disabled':''}>Masuk ke ruang guru →</button><span class="small-text">${state.demo?'Mod demo: gunakan kata laluan guru yang diberikan.':'Sesi guru disahkan oleh Apps Script.'}</span></form></div>`;$('#login').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const r=await api('login',{password:$('#password').value});if(state.demo)state.token=r.token;else rememberTeacherSession(r);await loadTeacher();}catch(err){showError($('#login-error'),err);b.disabled=false}};return}
 $('#workspace').innerHTML=heading('Bilik kawalan guru','Urus tugasan dan bantu murid melengkapkan misi.',`<button class="btn light small" id="logout">Log keluar ↗</button>`)+`<nav class="teacher-tabs" aria-label="Ruang guru">${[['create','Cipta tugasan'],['edit','Kemaskini tugasan'],['records','Rekod penghantaran'],['report','Rumusan penghantaran']].map(([v,l])=>`<button data-teachertab="${v}" class="${state.teacherTab===v?'active':''}">${l}</button>`).join('')}</nav><div id="teacher-body"></div>`;$('#logout').onclick=()=>{resetQuickReview();state.token='';clearTeacherSession();state.submissions=[];renderTeacher()};document.querySelectorAll('[data-teachertab]').forEach(b=>b.onclick=async()=>{state.teacherTab=b.dataset.teachertab;await loadTeacher()});if(state.teacherTab==='create')renderCreate();else renderTeacherList();}
async function loadTeacher(){
 if(!state.demo){applyCsvSnapshot(getCsvStore().snapshot());if(state.role==='teacher')renderTeacher();refreshCsv();return}
 try{const data=await api('teacherData');state.tasks=data.tasks;state.submissions=data.submissions;state.submissionsReady=true;if(state.role==='teacher')renderTeacher()}catch(e){toast(e.message)}
}
function taskForm(task={}){return `<div class="form-grid"><div class="field"><label for="task-date">Tarikh tugasan *</label><input type="date" id="task-date" value="${esc(task.date||today())}" required></div><div class="field"><label for="task-class">Kelas *</label><select id="task-class" required>${options(classes(),task.className,'Pilih kelas')}</select></div><div class="field"><label for="task-subject">Subjek *</label><select id="task-subject" required>${options(state.subjects,task.subject,'Pilih subjek')}</select></div><div class="field"><label for="task-teacher">Nama guru *</label><select id="task-teacher" required>${options(state.teachers,task.teacher,'Pilih nama guru')}</select></div><div class="field span2"><label for="task-title">Tajuk tugasan *</label><input id="task-title" required maxlength="200" placeholder="Contoh: Misi tambah dan tolak" value="${esc(task.title||'')}"></div><div class="field span2"><label for="task-instructions">Arahan ringkas *</label><textarea id="task-instructions" required maxlength="6000" placeholder="Taip arahan latihan atau tampal pautan video / kuiz di sini…">${esc(task.instructions||'')}</textarea></div><div class="field span2"><label for="task-message">Pesanan guru</label><textarea id="task-message" maxlength="2000" placeholder="Sedikit kata semangat untuk murid…" style="min-height:70px">${esc(task.message||'')}</textarea></div></div>`}
function readTask(){return {date:$('#task-date').value,className:$('#task-class').value,subject:$('#task-subject').value,teacher:$('#task-teacher').value,title:$('#task-title').value.trim(),instructions:$('#task-instructions').value.trim(),message:$('#task-message').value.trim()}}
function renderCreate(){$('#teacher-body').innerHTML=`<form id="create-task" class="panel">${taskForm()}<div id="create-error" class="inline-error" role="alert"></div><div class="form-actions"><span>* Wajib diisi · Tugasan akan dipaparkan mengikut tarikh dan kelas.</span><button class="btn red">Hantar tugasan <span>→</span></button></div></form>`;const requestId=uuid();$('#create-task').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('createTask',{task:readTask(),requestId});toast(state.demo?'Tugasan demo berjaya dicipta!':'Tugasan berjaya disimpan di Google Sheet!');state.teacherTab='edit';await loadTeacher()}catch(err){showError($('#create-error'),err);b.disabled=false}}}
function filterHTML(){return `<div class="filter-row"><div class="field"><label for="filter-class">Kelas</label><select id="filter-class">${options(classes(),state.filters.className,'Semua kelas')}</select></div><div class="field"><label for="filter-subject">Subjek</label><select id="filter-subject">${options(state.subjects,state.filters.subject,'Semua subjek')}</select></div><div class="field"><label for="filter-date">Tarikh</label><input type="date" id="filter-date" value="${esc(state.filters.date)}"></div><button class="btn light" id="reset-filters">Set semula ↺</button></div>`}
function bindFilters(fn){$('#filter-class').onchange=e=>{state.filters.className=e.target.value;fn()};$('#filter-subject').onchange=e=>{state.filters.subject=e.target.value;fn()};$('#filter-date').onchange=e=>{state.filters.date=e.target.value;fn()};$('#reset-filters').onclick=()=>{state.filters={className:'',subject:'',date:today()};fn()}}
function filteredTasks(){return state.tasks.filter(t=>(!state.filters.className||t.className===state.filters.className)&&(!state.filters.subject||t.subject===state.filters.subject)&&(!state.filters.date||t.date===state.filters.date))}
// Quick review: metadata-only lists, bounded pages, and photos loaded on explicit preview.
const quickReview={page:1,pageSize:12,search:'',status:'all',drafts:new Map(),saving:new Set(),previewId:null,previewOrder:[],previewEpoch:0,previewBusy:false,searchTimer:null,imageTimer:null};
function reviewDraft(record={}){return quickReview.drafts.get(record.id)||{stars:Number(record.stars)||0,marks:String(record.marks??''),feedback:record.feedback||''}}
function reviewRecords(){
 const tasks=new Map(filteredTasks().map(t=>[t.id,t])),search=quickReview.search.trim().toLocaleLowerCase('ms');
 const base=state.submissions.filter(s=>tasks.has(s.taskId)&&(!search||(s.studentName+' '+s.className+' '+tasks.get(s.taskId).title).toLocaleLowerCase('ms').includes(search)));
 const records=base.filter(s=>quickReview.status==='pending'?!s.reviewedAt:quickReview.status==='reviewed'?!!s.reviewedAt:true).sort((a,b)=>a.className.localeCompare(b.className,'ms',{numeric:true})||a.studentName.localeCompare(b.studentName,'ms')||String(a.taskId).localeCompare(String(b.taskId)));
 return {records,tasks,total:base.length,pending:base.filter(s=>!s.reviewedAt).length};
}
function reviewPage(records){const pages=Math.max(1,Math.ceil(records.length/quickReview.pageSize));quickReview.page=Math.max(1,Math.min(pages,quickReview.page));const start=(quickReview.page-1)*quickReview.pageSize;return {pages,start,items:records.slice(start,start+quickReview.pageSize)}}
function resetQuickReview(){quickReview.drafts.clear();quickReview.page=1;quickReview.search='';quickReview.status='all';quickReview.previewId=null;quickReview.previewEpoch++;clearTimeout(quickReview.searchTimer);clearTimeout(quickReview.imageTimer)}
function assessmentForm(record,context='list'){
 const d=reviewDraft(record),busy=quickReview.saving.has(record.id);
 return `<form class="quick-grade-form" data-grade-id="${esc(record.id)}" data-grade-context="${context}"><fieldset ${busy?'disabled':''}><div class="quick-score-row"><div class="quick-stars-field"><span class="quick-label">Bintang</span><div class="review-stars" role="group" aria-label="Bintang untuk ${esc(record.studentName)}">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" class="${n<=d.stars?'selected':''}" aria-label="${n} bintang untuk ${esc(record.studentName)}" aria-pressed="${n===d.stars}">★</button>`).join('')}<button type="button" class="clear-stars" data-clear-stars aria-label="Kosongkan bintang untuk ${esc(record.studentName)}">↺</button></div></div><label class="quick-mark-field"><span class="quick-label">Markah / 100</span><input name="marks" type="number" min="0" max="100" step="any" value="${esc(d.marks)}" placeholder="0–100" aria-label="Markah untuk ${esc(record.studentName)}"></label></div><label class="quick-message-field"><span class="quick-label">Mesej guru <span class="small-text">(pilihan)</span></span><textarea name="feedback" maxlength="3000" rows="2" placeholder="Taip respon ringkas…" aria-label="Mesej guru untuk ${esc(record.studentName)}">${esc(d.feedback)}</textarea></label><div class="quick-grade-error inline-error" role="alert"></div><div class="quick-grade-actions"><span class="quick-draft-state small-text">${busy?'Sedang menyimpan…':quickReview.drafts.has(record.id)?'Belum disimpan':record.reviewedAt?'✓ Penilaian tersimpan':'Sedia untuk dinilai'}</span><button type="submit" class="btn ${context==='preview'?'red':'small'}">${busy?'Menyimpan…':'Simpan penilaian'}</button>${context==='preview'?'<button type="button" class="btn light" data-save-next>Simpan & seterusnya →</button>':''}</div></fieldset></form>`;
}
function rememberReviewDraft(form){
 const id=form.dataset.gradeId,record=state.submissions.find(s=>s.id===id);if(!record)return;
 const stars=Number(form.dataset.stars??reviewDraft(record).stars);
 quickReview.drafts.set(id,{stars,marks:form.elements.marks.value,feedback:form.elements.feedback.value});
 form.querySelector('.quick-draft-state').textContent='Belum disimpan';
 const count=$('#quick-draft-count');if(count)count.textContent=quickReview.drafts.size?`${quickReview.drafts.size} penilaian belum disimpan`:'';
}
function bindAssessmentForms(scope){
 scope.querySelectorAll('.quick-grade-form').forEach(form=>{
  const record=state.submissions.find(s=>s.id===form.dataset.gradeId);form.dataset.stars=String(reviewDraft(record).stars);
  form.querySelectorAll('[data-star]').forEach(button=>button.onclick=()=>{form.dataset.stars=button.dataset.star;form.querySelectorAll('[data-star]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.star)<=Number(button.dataset.star));b.setAttribute('aria-pressed',String(b===button))});rememberReviewDraft(form)});
  form.querySelector('[data-clear-stars]').onclick=()=>{form.dataset.stars='0';form.querySelectorAll('[data-star]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});rememberReviewDraft(form)};
  form.elements.marks.oninput=()=>rememberReviewDraft(form);form.elements.feedback.oninput=()=>rememberReviewDraft(form);
  form.onsubmit=event=>{event.preventDefault();saveQuickReview(form,false)};
  const next=form.querySelector('[data-save-next]');if(next)next.onclick=()=>saveQuickReview(form,true);
 });
}
function renderReviewRecords({restoreSearch=false}={}){
 if(state.role!=='teacher'||state.teacherTab!=='records')return;
 const model=reviewRecords(),page=reviewPage(model.records),wasSearch=restoreSearch,caret=wasSearch?$('#quick-search')?.selectionStart:null;
 const startId=model.records.find(s=>!s.reviewedAt)?.id||model.records[0]?.id;
 $('#teacher-body').innerHTML=filterHTML()+`<div class="quick-review-heading"><div><h3>Semakan pantas</h3><p>Beri bintang dan markah terus di sini. Gambar dibuka apabila Pratonton ditekan.</p></div><button class="btn" id="start-quick-review" ${!startId?'disabled':''}>Mula semakan →</button></div><div class="quick-review-toolbar"><label><span class="quick-label">Cari murid / tugasan</span><input type="search" id="quick-search" placeholder="Taip nama murid…" value="${esc(quickReview.search)}"></label><label><span class="quick-label">Status semakan</span><select id="quick-status"><option value="all" ${quickReview.status==='all'?'selected':''}>Semua penghantaran</option><option value="pending" ${quickReview.status==='pending'?'selected':''}>Menunggu semakan</option><option value="reviewed" ${quickReview.status==='reviewed'?'selected':''}>Sudah disemak</option></select></label><div class="quick-review-count"><strong>${model.total}</strong> penghantaran <span>· ${model.pending} menunggu semakan</span><small id="quick-draft-count">${quickReview.drafts.size?quickReview.drafts.size+' penilaian belum disimpan':''}</small></div></div><div class="quick-review-list">${page.items.length?page.items.map(s=>{const t=model.tasks.get(s.taskId),photos=reviewPhotos(s.photos).length;return `<article class="quick-review-card" data-card-id="${esc(s.id)}"><div class="quick-record-info"><div class="quick-record-top"><span class="quick-avatar" aria-hidden="true">${esc(s.studentName[0]||'M')}</span><div><h4>${esc(s.studentName)}</h4><p>${esc(s.className)} · ${esc(s.subject||t.subject)}</p></div><span class="status ${s.reviewedAt?'done':'review'}">${s.reviewedAt?'✓ Sudah disemak':'Menunggu semakan'}</span></div><strong class="quick-task-title">${esc(t.title)}</strong><span class="small-text">Dihantar ${esc(dateText(s.submittedAt.slice(0,10)))}</span>${s.message?`<details class="quick-student-note"><summary>Mesej murid</summary><p>${esc(s.message)}</p></details>`:'<span class="small-text">Tiada mesej murid.</span>'}<button type="button" class="btn light small preview-work" data-preview-review="${esc(s.id)}">${photos?'▧ Pratonton ('+photos+' gambar)':s.photosPending?'Pratonton lampiran':'Lihat mesej'} ↗</button>${drivePhotoLinks(s.photos,true)}</div><div class="quick-assessment">${assessmentForm(s)}</div></article>`}).join(''):empty('Tiada rekod sepadan','Ubah carian, status semakan atau tapisan kelas dan tarikh.','✉️')}</div><div class="quick-pagination"><span>${model.records.length?`${page.start+1}–${page.start+page.items.length} daripada ${model.records.length}`:'0 rekod'} · Maksimum ${quickReview.pageSize} rekod setiap halaman</span><div><button class="btn light small" id="quick-prev" ${quickReview.page===1?'disabled':''}>← Sebelumnya</button><b>${quickReview.page} / ${page.pages}</b><button class="btn light small" id="quick-next" ${quickReview.page>=page.pages?'disabled':''}>Seterusnya →</button></div></div>`;
 bindFilters(()=>{quickReview.page=1;renderReviewRecords()});bindAssessmentForms($('#teacher-body'));
 $('#quick-search').oninput=event=>{quickReview.search=event.target.value;quickReview.page=1;clearTimeout(quickReview.searchTimer);quickReview.searchTimer=setTimeout(()=>renderReviewRecords({restoreSearch:true}),120)};
 $('#quick-status').onchange=event=>{quickReview.status=event.target.value;quickReview.page=1;renderReviewRecords()};
 $('#quick-prev').onclick=()=>{quickReview.page--;renderReviewRecords()};$('#quick-next').onclick=()=>{quickReview.page++;renderReviewRecords()};
 $('#start-quick-review').onclick=()=>openReviewPreview(startId);
 document.querySelectorAll('[data-preview-review]').forEach(button=>button.onclick=()=>openReviewPreview(button.dataset.previewReview));
 if(wasSearch){$('#quick-search').focus({preventScroll:true});if(caret!=null)$('#quick-search').setSelectionRange(caret,caret)}
}
function validateReview(draft){
 const stars=Number(draft.stars),marks=draft.marks.trim();
 if(!Number.isInteger(stars)||stars<0||stars>5)return 'Pilih antara 0 hingga 5 bintang.';
 if(marks!==''&&(!Number.isFinite(Number(marks))||Number(marks)<0||Number(marks)>100))return 'Markah mestilah antara 0 hingga 100.';
 if(!stars&&marks===''&&!draft.feedback.trim())return 'Pilih bintang, masukkan markah atau tulis mesej sebelum menyimpan.';
 return '';
}
async function saveQuickReview(form,next){
 const id=form.dataset.gradeId;if(quickReview.saving.has(id))return;
 if(!form.reportValidity())return;
 rememberReviewDraft(form);const draft={...quickReview.drafts.get(id)},error=validateReview(draft);
 const errorBox=form.querySelector('.quick-grade-error');errorBox.textContent=error;if(error)return;
 quickReview.saving.add(id);form.querySelector('fieldset').disabled=true;form.querySelector('.quick-draft-state').textContent='Sedang menyimpan…';
 try{
  const result=await api('gradeSubmission',{id,stars:draft.stars,marks:draft.marks.trim(),feedback:draft.feedback.trim()});
  const reviewedAt=result.reviewedAt||new Date().toISOString();
  state.submissions=state.submissions.map(s=>s.id===id?{...s,...draft,feedback:draft.feedback.trim(),reviewedAt}:s);quickReview.drafts.delete(id);quickReview.saving.delete(id);
  toast(state.demo?'Penilaian demo disimpan.':'Penilaian berjaya disimpan.');
  if(quickReview.previewId===id&&$('#modal').open){
   if(next){const nextId=nextUnreviewedId(id);if(nextId)await openReviewPreview(nextId,true);else{$('#modal').close();toast('Semua rekod dalam pilihan ini sudah disemak.')}}
   else{const record=state.submissions.find(s=>s.id===id);$('#preview-assessment').innerHTML=assessmentForm(record,'preview');bindAssessmentForms($('#preview-assessment'));}
  }else{
   const active=document.activeElement;if(active?.matches('input,textarea')&&active.closest('.quick-grade-form')){uiRefreshPending=true;const status=form.querySelector('.quick-draft-state');if(status)status.textContent='✓ Penilaian tersimpan'}else renderDataViews();
  }
 }catch(error){errorBox.textContent=error.message;form.querySelector('.quick-draft-state').textContent='Belum disimpan';}
 finally{quickReview.saving.delete(id);if(form.isConnected)form.querySelector('fieldset').disabled=false;}
}
function nextUnreviewedId(id){const order=quickReview.previewOrder,index=order.indexOf(id),remaining=[...order.slice(index+1),...order.slice(0,Math.max(0,index))];return remaining.find(key=>state.submissions.some(s=>s.id===key&&!s.reviewedAt))}
function reviewPhotos(value){
 const photos=PDPRData.normalizePhotos(value);
 // Authorized backend data URLs stay in memory only; they never enter the CSV cache.
 if(Array.isArray(value))value.slice(0,4).forEach((photo,index)=>{if(photo&&/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(photo.url||'')){let item=photos.find(p=>photo.id&&p.id===photo.id)||photos[index];if(item)item.url=photo.url;else photos.push({name:photo.name||'Gambar '+(index+1),url:photo.url})}});
 return photos.slice(0,4);
}
function reviewImageUrl(photo){return /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(photo?.url||'')?photo.url:PDPRData.photoPreviewUrl(photo)}
function drivePhotoLinks(photos,compact=false){
 const items=reviewPhotos(photos).map((photo,index)=>({photo,index,url:PDPRData.photoDriveLink(photo)})).filter(item=>item.url);
 if(!items.length)return '';
 return `<div class="drive-photo-links ${compact?'compact':''}">${compact?'':'<b>Pautan hasil kerja</b><p>Klik pautan ini jika gambar lambat atau tidak dipaparkan.</p>'}${items.map(({photo,index,url})=>`<a class="work-drive-link btn light small" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(photo.name)}">${items.length===1?'Buka di Google Drive':'Gambar '+(index+1)+' di Google Drive'} ↗</a>`).join('')}</div>`;
}
function previewPhotos(photos,active=0){
 const usable=(photos||[]).map(photo=>({...photo,imageUrl:reviewImageUrl(photo)})).filter(photo=>photo.imageUrl);
 if(!usable.length)return '<div class="preview-placeholder">Pratonton gambar belum tersedia. Gunakan pautan Google Drive yang disediakan untuk melihat hasil kerja.</div>';
 active=Math.min(active,usable.length-1);const selected=usable[active];
 return `<div class="preview-image-tools"><button type="button" class="btn light small" data-zoom-photo>Besarkan gambar ⤢</button></div><div class="preview-load-status small-text" role="status">Memuatkan gambar… Pautan Google Drive boleh dibuka terus.</div><figure class="large-work-preview"><img class="review-main-photo" src="${esc(selected.imageUrl)}" alt="${esc(selected.name||'Hasil kerja murid')}" decoding="async" referrerpolicy="no-referrer"><figcaption>Gambar ${active+1} daripada ${usable.length} · ${esc(selected.name||'Hasil kerja')}</figcaption></figure>${usable.length>1?`<div class="preview-thumbnails">${usable.map((p,i)=>`<button type="button" data-photo-index="${i}" class="${i===active?'active':''}" aria-label="Lihat gambar ${i+1}" aria-pressed="${i===active}"><img src="${esc(p.imageUrl)}" alt="Gambar ${i+1}" decoding="async" referrerpolicy="no-referrer"><span>${i+1}</span></button>`).join('')}</div>`:''}`;
}
function drawReviewPhotos(photos,epoch,active=0){
 const area=$('#preview-images');if(!area||quickReview.previewEpoch!==epoch||!$('#modal').open)return;
 clearTimeout(quickReview.imageTimer);area.innerHTML=previewPhotos(photos,active);area.classList.remove('zoomed');
 area.querySelectorAll('[data-photo-index]').forEach(button=>button.onclick=()=>drawReviewPhotos(photos,epoch,Number(button.dataset.photoIndex)));
 area.querySelectorAll('.preview-thumbnails img').forEach(img=>img.onerror=()=>{img.hidden=true});
 const zoom=area.querySelector('[data-zoom-photo]');if(zoom)zoom.onclick=()=>{const enlarged=area.classList.toggle('zoomed');zoom.textContent=enlarged?'Kecilkan gambar ⤡':'Besarkan gambar ⤢';zoom.setAttribute('aria-pressed',String(enlarged))};
 const img=area.querySelector('.review-main-photo'),status=area.querySelector('.preview-load-status');if(!img)return;
 const loaded=()=>{if(!img.isConnected)return;clearTimeout(quickReview.imageTimer);status.textContent='';status.hidden=true};
 const failed=()=>{if(!img.isConnected)return;clearTimeout(quickReview.imageTimer);img.hidden=true;if(zoom)zoom.hidden=true;status.hidden=false;status.textContent='Gambar tidak dapat dipaparkan di sini. Klik pautan Google Drive yang disediakan untuk melihat hasil kerja.'};
 img.onload=loaded;img.onerror=failed;
 if(img.complete){if(img.naturalWidth)loaded();else failed()}
 else quickReview.imageTimer=setTimeout(()=>{if(quickReview.previewEpoch===epoch&&img.isConnected&&!img.complete){status.textContent='Pratonton mengambil masa. Cikgu boleh klik pautan Google Drive yang disediakan sekarang.';status.hidden=false}},8000);
}
async function openReviewPreview(id,keepOrder=false){
 const record=state.submissions.find(s=>s.id===id);if(!record)return;
 if(!keepOrder)quickReview.previewOrder=reviewRecords().records.map(s=>s.id);
 clearTimeout(quickReview.imageTimer);const epoch=++quickReview.previewEpoch;quickReview.previewId=id;quickReview.previewBusy=false;
 const task=state.tasks.find(t=>t.id===record.taskId),photos=reviewPhotos(record.photos);
 $('#modal-content').innerHTML=modalHead('Pratonton & penilaian',record.studentName+' · '+record.className)+`<div class="review-preview-layout"><div><div class="preview-task-info"><b>${esc(task?.title||'Tugasan murid')}</b><span>${esc(task?.subject||'')}</span></div><div id="preview-links">${drivePhotoLinks(photos)}</div><div id="preview-images" class="preview-images"><div class="preview-placeholder">${photos.length||record.photosPending?'Memuatkan gambar pilihan…':'Tiada pautan gambar dalam lajur photos bagi rekod ini.'}</div></div><div id="preview-image-error" class="inline-error" role="status"></div><div class="preview-student-message"><b>Mesej murid</b><p>${esc(record.message||'Tiada mesej.')}</p></div></div><div id="preview-assessment">${assessmentForm(record,'preview')}</div></div>`;
 $('#modal').classList.add('review-preview-dialog');$('#modal').querySelector('.close').onclick=()=>$('#modal').close();if(!$('#modal').open)$('#modal').showModal();bindAssessmentForms($('#preview-assessment'));
 if(photos.some(photo=>reviewImageUrl(photo)))drawReviewPhotos(photos,epoch);
 // Public Sheet image links are rendered directly, without waiting for Apps Script.
 if(photos.length&&photos.every(photo=>reviewImageUrl(photo)))return;
 if(!photos.length&&!record.photosPending)return;
 quickReview.previewBusy=true;
 try{
  const detail=await api('getSubmission',{id,actor:'teacher'});
  if(quickReview.previewEpoch!==epoch||quickReview.previewId!==id||!$('#modal').open)return;
  const loaded=reviewPhotos(detail.photos),combined=photos.map((photo,index)=>{const match=loaded.find(p=>p.id&&p.id===photo.id)||(!loaded[index]?.id?loaded[index]:null);return match?{...photo,...match}:photo});
  loaded.forEach(photo=>{if(!combined.some(p=>photo.id?p.id===photo.id:p.url===photo.url))combined.push(photo)});
  const gallery=combined.slice(0,4);$('#preview-links').innerHTML=drivePhotoLinks(gallery);drawReviewPhotos(gallery,epoch);
 }catch(error){if(quickReview.previewEpoch===epoch&&quickReview.previewId===id&&$('#modal').open){if(!photos.some(photo=>reviewImageUrl(photo)))$('#preview-images').innerHTML='<div class="preview-placeholder">Pratonton belum tersedia. Gunakan pautan Google Drive yang disediakan jika ada.</div>';$('#preview-image-error').innerHTML=`<p>${esc(error.message)}</p><button type="button" class="btn light small" id="retry-review-image">Cuba muat semula pratonton</button>`;$('#retry-review-image').onclick=()=>{if(!quickReview.saving.has(id))openReviewPreview(id,true)}}}
 finally{if(quickReview.previewEpoch===epoch)quickReview.previewBusy=false}
}
// End quick review.

function renderTeacherList(){if(['records','report'].includes(state.teacherTab)&&!state.submissionsReady){$('#teacher-body').innerHTML=filterHTML()+empty('Rekod penghantaran belum tersedia','Tugasan masih boleh dilihat. Klik Segar semula untuk mendapatkan rekod penghantaran.','✉️');bindFilters(renderTeacherList);return}if(state.teacherTab==='records'){renderReviewRecords();return}const tasks=filteredTasks();const report=state.teacherTab==='report';let html=filterHTML();if(state.teacherTab==='edit'){html+=tasks.length?`<div class="table-wrap"><table><thead><tr><th>TARIKH / KELAS</th><th>SUBJEK / TUGASAN</th><th>GURU</th><th>TINDAKAN</th></tr></thead><tbody>${tasks.map(t=>`<tr><td>${esc(dateText(t.date))}<small>${esc(t.className)}</small></td><td class="title-cell"><b>${esc(t.title)}</b><small>${esc(t.subject)}</small></td><td class="title-cell">${esc(t.teacher)}</td><td><button class="btn light small" data-edit="${esc(t.id)}">Edit</button> <button class="btn danger small" data-delete="${esc(t.id)}">Padam</button></td></tr>`).join('')}</tbody></table></div>`:empty('Tiada tugasan ditemui','Cipta tugasan baharu atau ubah tapisan anda.','📚');}
 else if(report){if(!tasks.length)html+=empty('Tiada tugasan untuk dirumuskan','Pilih kelas, subjek dan tarikh yang mempunyai tugasan.','▦');else{const pupils=state.students.filter(s=>tasks.some(t=>t.className===s.className));html+=`<div class="legend"><b>${pupils.length} murid</b><span>✓ Hantar</span><span>— Tidak hantar</span><button class="btn small light" id="export-report">Muat turun CSV ↓</button></div><div class="table-wrap"><table><thead><tr><th>NAMA MURID</th><th>KELAS</th>${tasks.map(t=>`<th>${esc(t.subject)}<small style="display:block;margin-top:4px">${esc(t.title)} · ${esc(t.date)}</small></th>`).join('')}</tr></thead><tbody>${pupils.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.className)}</td>${tasks.map(t=>t.className!==p.className?'<td class="cell-no">Tidak berkenaan</td>':`<td class="${hasSubmission(t,p)?'cell-yes':'cell-no'}">${hasSubmission(t,p)?'✓ Hantar':'— Tidak hantar'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="table-note">Status diambil daripada rekod penghantaran sebenar. Tugas setiap kelas dipadankan dengan senarai nama murid.</p>`}}
 $('#teacher-body').innerHTML=html;bindFilters(renderTeacherList);document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editTask(b.dataset.edit));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteTask(b.dataset.delete));document.querySelectorAll('[data-review]').forEach(b=>b.onclick=async()=>{const label=b.textContent;b.disabled=true;b.textContent='Membuka…';try{await reviewModal(b.dataset.review)}finally{if(b.isConnected){b.disabled=false;b.textContent=label}}});if($('#export-report'))$('#export-report').onclick=()=>exportReport(tasks);}
function editTask(id){const task=state.tasks.find(t=>t.id===id);modal(modalHead('Kemaskini tugasan',task.title)+`<form id="edit-task">${taskForm(task)}<div class="inline-error" id="edit-error" role="alert"></div><div class="form-actions"><span>Perubahan turut dipaparkan kepada murid.</span><button class="btn red">Simpan perubahan →</button></div></form>`);$('#edit-task').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('updateTask',{task:{...readTask(),id}});$('#modal').close();toast('Tugasan berjaya dikemas kini.');await loadTeacher()}catch(err){showError($('#edit-error'),err);b.disabled=false}}}
function deleteTask(id){const t=state.tasks.find(t=>t.id===id);modal(modalHead('Padam tugasan?',t.title)+`<p class="sub-message">Tugasan ini akan dikeluarkan daripada paparan murid dan rumusan. Rekod penghantaran terdahulu dikekalkan dalam Sheet untuk rujukan.</p><div class="inline-error" id="delete-error"></div><div class="form-actions"><button class="btn light" id="cancel-delete">Batal</button><button class="btn danger" id="confirm-delete">Ya, padam tugasan</button></div>`);$('#cancel-delete').onclick=()=>$('#modal').close();$('#confirm-delete').onclick=async e=>{e.target.disabled=true;try{await api('deleteTask',{id});$('#modal').close();toast('Tugasan dipadam daripada paparan.');await loadTeacher()}catch(err){showError($('#delete-error'),err);e.target.disabled=false}}}
async function reviewModal(id){return openReviewPreview(id)}
function exportReport(tasks){const rows=[['Nama murid','Kelas',...tasks.map(t=>t.subject+' - '+t.title+' ('+t.date+')')],...state.students.filter(p=>tasks.some(t=>t.className===p.className)).map(p=>[p.name,p.className,...tasks.map(t=>t.className!==p.className?'Tidak berkenaan':hasSubmission(t,p)?'Hantar':'Tidak hantar')])];const cell=v=>'"'+String(/^[=+@\-]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';download('rumusan-penghantaran.csv','\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8')}
function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function renderSummary(){const tasks=filteredTasks(),cls=state.filters.className?[state.filters.className]:classes(),subjects=state.filters.subject?[state.filters.subject]:state.subjects,active=new Set(tasks.map(t=>t.className)).size;$('#workspace').innerHTML=heading('Peta misi setiap kelas','Pantau subjek yang sudah memberikan tugasan kepada murid.',`<span class="level-badge">▦ &nbsp; PEMANTAUAN KELAS</span>`)+filterHTML()+`<div class="summary-top"><div class="stat"><span class="stat-icon">🏫</span><div><strong>${cls.length}</strong><small>Kelas dipantau</small></div></div><div class="stat"><span class="stat-icon">▤</span><div><strong>${tasks.length}</strong><small>Tugasan diberikan</small></div></div><div class="stat"><span class="stat-icon">⚑</span><div><strong>${active}</strong><small>Kelas ada tugasan</small></div></div></div>`+(!state.ready?empty('Data CSV belum tersedia','Data sedang dibaca daripada Google Sheet. Klik Segar semula untuk mencuba lagi.','▦'):`<div class="legend"><b>✓ Ada tugasan</b><span>— Belum ada tugasan</span><span>Nombor menunjukkan bilangan tugasan.</span></div><div class="table-wrap"><table><thead><tr><th>KELAS</th>${subjects.map(s=>`<th>${esc(s)}</th>`).join('')}<th>JUMLAH</th></tr></thead><tbody>${cls.map(c=>`<tr><td><b>${esc(c)}</b></td>${subjects.map(s=>{const count=tasks.filter(t=>t.className===c&&t.subject===s).length;return `<td class="${count?'cell-yes':'cell-no'}">${count?'✓ '+count:'—'}</td>`}).join('')}<td><b>${tasks.filter(t=>t.className===c).length}</b></td></tr>`).join('')}</tbody></table></div><p class="table-note">Rumusan ini menunjukkan tugasan yang <b>diberikan oleh guru</b>. Untuk status penghantaran setiap murid, buka Saya guru → Rumusan penghantaran.<br>“Belum ada tugasan” merujuk kepada rekod dalam sistem bagi tapisan dipilih, bukan jadual waktu kelas.</p>`);bindFilters(renderSummary)}
async function setRole(role){
 loadVersion++;state.role=role;
 if(!state.demo){applyCsvSnapshot(getCsvStore().snapshot());render();refreshCsv();return}
 render();if(role==='student'&&state.name&&state.ready)await loadStudent();if(role==='teacher'&&state.token)await loadTeacher();if(role==='summary'&&state.ready){try{state.tasks=(await api('summary')).tasks;if(state.role==='summary')renderSummary()}catch(e){toast(e.message)}}
}
function settings(){modal(modalHead('Tetapan sambungan','Baca data daripada CSV dan simpan melalui Apps Script.')+`<form id="settings-form" class="modal-form"><div class="field"><label for="api-url">URL Apps Script — login, simpanan dan gambar</label><input id="api-url" type="url" required value="${esc(localStorage.getItem('pdpr-api')||DEFAULT_API)}"><span class="small-text">Gunakan URL yang berakhir dengan /exec. Kod backend disediakan dalam fail Code.gs.</span></div><div class="field"><label for="tasks-csv-url">CSV tugasan</label><input id="tasks-csv-url" type="url" required value="${esc(csvConfig().tasksUrl)}"></div><div class="field"><label for="submissions-csv-url">CSV penghantaran</label><input id="submissions-csv-url" type="url" required value="${esc(csvConfig().submissionsUrl)}"><span class="small-text">CSV mesti diterbitkan daripada Sheet yang sama dengan destinasi simpanan Apps Script.</span></div><div class="notice">${state.demo?'Mod demo aktif. Rekod demo disimpan pada pelayar ini sahaja.':'Tugasan dan penghantaran dibaca terus daripada CSV. Rekod yang telah dimuatkan dipaparkan segera dan dikemas kini di latar. Simpanan serta gambar menggunakan Apps Script.'}</div><div id="settings-error" class="inline-error"></div><button class="btn">Simpan & sambung semula →</button><div class="toggle-row"><button type="button" id="demo-mode" class="btn light small">Cuba mod demo</button><button type="button" id="reset-demo" class="btn light small">Kosongkan rekod demo</button></div></form>`);$('#settings-form').onsubmit=async e=>{e.preventDefault();const url=$('#api-url').value.trim();if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)){$('#settings-error').textContent='Gunakan URL Web App rasmi script.google.com/macros/s/…/exec.';return}const tasksUrl=$('#tasks-csv-url').value.trim(),submissionsUrl=$('#submissions-csv-url').value.trim();const validCsv=v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='docs.google.com'&&/^\/spreadsheets\/d\/e\/[^/]+\/pub$/.test(u.pathname)&&u.searchParams.get('output')==='csv'&&/^\d+$/.test(u.searchParams.get('gid')||'')}catch(_){return false}};if(!validCsv(tasksUrl)||!validCsv(submissionsUrl)){$('#settings-error').textContent='Gunakan pautan CSV Google Sheet diterbitkan yang mempunyai gid dan output=csv.';return}localStorage.setItem('pdpr-tasks-csv',tasksUrl);localStorage.setItem('pdpr-submissions-csv',submissionsUrl);localStorage.setItem('pdpr-api',url);resetQuickReview();csvStore=undefined;state.demo=false;state.ready=false;state.token='';state.tasks=[];state.submissions=[];clearTeacherSession();$('#modal').close();connection('Membaca CSV Google Sheet…');await initialize()};$('#demo-mode').onclick=async()=>{$('#modal').close();await enableDemo()};$('#reset-demo').onclick=()=>{localStorage.removeItem('pdpr-demo-v1');if(state.demo){state.tasks=[];state.submissions=[];render()}toast('Rekod demo dikosongkan.')};}
$('#refresh-data').onclick=()=>refreshVisibleData();
$('#modal').addEventListener('close',()=>{clearTimeout(quickReview.imageTimer);quickReview.previewId=null;quickReview.previewEpoch++;$('#modal').classList.remove('review-preview-dialog');if(!state.demo)renderDataViews();else if(state.role==='teacher'&&state.teacherTab==='records')renderReviewRecords()});
document.addEventListener('focusout',()=>{if(uiRefreshPending)setTimeout(()=>{if(uiRefreshPending)renderDataViews()},0)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.demo)refreshCsv()});
setInterval(()=>{if(!document.hidden&&!state.demo&&csvStore){refreshCsv();refreshRoster()}},60000);
updateSoundButton();$('#sound-toggle').onclick=toggleSound;
$('#today-label').textContent='▦  '+new Date().toLocaleDateString('ms-MY',{weekday:'long',day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'});document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>setRole(b.dataset.role));$('#settings').onclick=settings;$('#try-demo').onclick=enableDemo;$('.brand').onclick=e=>{e.preventDefault();setRole('student')};$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close()}});render();initialize();
