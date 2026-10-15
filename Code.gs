/**
 * TUGASAN PDPR SK TAMAN DAYA — Google Apps Script V8
 * Salin ke Code.gs. Tiada pemasangan dibuat secara automatik.
 * Jalankan setup() sekali sebagai pemilik, kemudian deploy Web app.
 */
const PDPR = Object.freeze({
  SPREADSHEET_ID: '1n2p-QRxv9qGD8toXZuNNxGWjI2wpIt0qhIOg4eGnIcE',
  FOLDER_ID: '14HeylvuhjmbhF4E3EaOcJ-wDzMoM5L2U',
  STUDENTS_CSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRTHK4KM1pGmIf8dqmVJpLjEhdjZFE516IF8m2R2zVEFSduSV_6AUgT8IePr70SJnMsNv3N5WnFCwnR/pub?gid=288612582&single=true&output=csv',
  TEACHERS_CSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRTHK4KM1pGmIf8dqmVJpLjEhdjZFE516IF8m2R2zVEFSduSV_6AUgT8IePr70SJnMsNv3N5WnFCwnR/pub?gid=0&single=true&output=csv',
  TASK_SHEET: 'PDPR_Tugasan', SUB_SHEET: 'PDPR_Penghantaran', SESSION_SECONDS: 21600,
  SUBJECTS: ['Bahasa Melayu','Bahasa Inggeris','Matematik','Sains','Pendidikan Islam','Pendidikan Moral','Bahasa Arab','Pendidikan Jasmani dan Kesihatan','Pendidikan Seni Visual','Pendidikan Muzik','Sejarah','Reka Bentuk dan Teknologi']
});
const TASK_FIELDS = ['id','date','className','subject','teacher','title','instructions','message','createdAt','updatedAt','deleted','requestId'];
const SUB_FIELDS = ['id','taskId','className','studentName','message','photos','submittedAt','stars','marks','feedback','reviewedAt','requestId'];

function setup() {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    sheet_(PDPR.TASK_SHEET, TASK_FIELDS); sheet_(PDPR.SUB_SHEET, SUB_FIELDS);
    const folder = DriveApp.getFolderById(PDPR.FOLDER_ID);
    folder.getName(); // Pastikan akaun pemilik boleh mengakses folder.
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('TEACHER_PASSWORD')) props.setProperty('TEACHER_PASSWORD','JBA1077');
    const roster = roster_();
    return {ok:true,classes:[...new Set(roster.students.map(s=>s.className))].length,students:roster.students.length,teachers:roster.teachers.length};
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  // Optional: serve Index.html from the SAME project for google.script.run transport.
  if (!p.action) {
    try { return HtmlService.createHtmlOutputFromFile('Index').setTitle('Tugasan PdPR · SK Taman Daya').addMetaTag('viewport','width=device-width,initial-scale=1'); }
    catch (_) { return json_(api({action:'health'})); }
  }
  if (!['health','init','studentData','summary'].includes(p.action)) return json_({ok:false,error:'Tindakan ini memerlukan POST.'});
  return json_(api(p));
}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 8500000) throw new Error('Saiz permintaan tidak dibenarkan.');
    return json_(api(JSON.parse(raw)));
  } catch (err) { return json_({ok:false,error:err.message || 'Permintaan tidak sah.'}); }
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }

/** Public RPC entrypoint; google.script.run.api(...) uses the same authorization. */
function api(input) {
  try {
    const p = input || {}, action = String(p.action || '');
    let data;
    if (action === 'health') data = {service:'pdpr-sktd',version:1,time:new Date().toISOString()};
    else if (action === 'init') data = {...roster_(),subjects:PDPR.SUBJECTS,tasks:activeTasks_()};
    else if (action === 'summary') data = {tasks:activeTasks_()};
    else if (action === 'login') data = login_(p.password);
    else if (action === 'studentData') {
      student_(p.className,p.studentName);
      data = {submissions:submissions_().filter(s=>s.className===p.className && s.studentName===p.studentName)};
    } else if (action === 'getSubmission') data = submissionDetail_(p);
    else if (action === 'submitTask') data = submit_(p);
    else {
      requireTeacher_(p.token);
      if (action === 'teacherData') data = {tasks:activeTasks_(),submissions:submissions_()};
      else if (action === 'createTask') data = mutateTask_('create',p);
      else if (action === 'updateTask') data = mutateTask_('update',p);
      else if (action === 'deleteTask') data = mutateTask_('delete',p);
      else if (action === 'gradeSubmission') data = grade_(p);
      else throw new Error('Tindakan tidak dikenali.');
    }
    return {ok:true,data:data};
  } catch (err) { return {ok:false,error:err.message || 'Ralat pelayan. Sila cuba lagi.'}; }
}

function login_(password) {
  const configured = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD');
  if (!configured) throw new Error('Pemilik perlu menjalankan setup() terlebih dahulu.');
  if (String(password || '') !== configured) throw new Error('Kata laluan tidak tepat.');
  const token = Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put('session:'+token,'teacher',PDPR.SESSION_SECONDS);
  return {token:token,expiresIn:PDPR.SESSION_SECONDS};
}
function teacher_(token) { return typeof token==='string' && token.length < 100 && CacheService.getScriptCache().get('session:'+token)==='teacher'; }
function requireTeacher_(token) { if (!teacher_(token)) throw new Error('Sesi guru tamat. Sila login semula.'); }

function roster_() {
  const cache = CacheService.getScriptCache(), cached = cache.get('roster:v1');
  if (cached) return JSON.parse(cached);
  const fetchCsv = url => {
    const response = UrlFetchApp.fetch(url,{followRedirects:true,muteHttpExceptions:true});
    if (response.getResponseCode()!==200) throw new Error('Senarai Google Sheet tidak dapat diambil. Pastikan CSV diterbitkan.');
    const text = response.getContentText('UTF-8').replace(/^\uFEFF/,'');
    if (/^\s*</.test(text)) throw new Error('Pautan senarai nama memulangkan HTML, bukan CSV.');
    return Utilities.parseCsv(text);
  };
  const rows = fetchCsv(PDPR.STUDENTS_CSV), headers = rows.shift().map(s=>s.trim().toUpperCase());
  const ci = headers.indexOf('KELAS'), ni = headers.indexOf('NAMA MURID');
  if (ci<0 || ni<0) throw new Error('CSV murid memerlukan lajur KELAS dan NAMA MURID.');
  const seen = new Set();
  const students = rows.map(r=>({className:String(r[ci]||'').trim(),name:String(r[ni]||'').trim()})).filter(s=>{
    const key=s.className+'\n'+s.name;
    if (!s.className || !s.name || seen.has(key)) return false; seen.add(key);return true;
  });
  const tr = fetchCsv(PDPR.TEACHERS_CSV), th = tr.shift().map(s=>s.trim().toUpperCase()), ti = th.indexOf('NAMA GURU');
  if (ti<0) throw new Error('CSV guru memerlukan lajur NAMA GURU.');
  const teachers = [...new Set(tr.map(r=>String(r[ti]||'').trim()).filter(Boolean))];
  if (!students.length || !teachers.length) throw new Error('Senarai murid atau guru kosong.');
  const result={students:students,teachers:teachers}, serialized=JSON.stringify(result);
  if (Utilities.newBlob(serialized).getBytes().length < 95000) cache.put('roster:v1',serialized,300);
  return result;
}
function student_(className,name) {
  if (!roster_().students.some(s=>s.className===className && s.name===name)) throw new Error('Nama murid dan kelas tidak sepadan dengan senarai sekolah.');
}
function sheet_(name,fields) {
  const ss=SpreadsheetApp.openById(PDPR.SPREADSHEET_ID);
  let sh=ss.getSheetByName(name);
  if (!sh) sh=ss.insertSheet(name);
  if (sh.getLastRow()===0) {
    sh.getRange(1,1,1,fields.length).setValues([fields]);sh.setFrozenRows(1);
    sh.getRange(1,1,1,fields.length).setBackground('#174d39').setFontColor('#ffffff').setFontWeight('bold');
  }
  const header=sh.getRange(1,1,1,fields.length).getDisplayValues()[0];
  if (header.join('|')!==fields.join('|')) throw new Error('Struktur lajur '+name+' tidak sepadan. Jangan ubah tajuk lajur sistem.');
  return sh;
}
function read_(name,fields) {
  const sh=sheet_(name,fields);
  if (sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,fields.length).getDisplayValues().map((r,i)=>{
    const o={_row:i+2};fields.forEach((f,j)=>o[f]=r[j]);return o;
  }).filter(r=>r.id);
}
function publicTask_(t) { const o={};TASK_FIELDS.filter(f=>!['requestId','deleted'].includes(f)).forEach(f=>o[f]=t[f]);return o; }
function activeTasks_() { return read_(PDPR.TASK_SHEET,TASK_FIELDS).filter(t=>t.deleted!=='true').map(publicTask_); }
function submissions_() {
  return read_(PDPR.SUB_SHEET,SUB_FIELDS).map(s=>{
    const o={};SUB_FIELDS.filter(f=>f!=='requestId').forEach(f=>o[f]=s[f]);
    try{o.photos=JSON.parse(o.photos||'[]');}catch(_){o.photos=[];}
    return o;
  });
}
// Prevent formulas from being evaluated when users submit text to Sheets.
function cell_(v) { const s=String(v==null?'':v); return /^[=+@\-\t\r]/.test(s)?"'"+s:s; }
function write_(name,fields,obj,row) {
  const sh=sheet_(name,fields),target=row||sh.getLastRow()+1;
  sh.getRange(target,1,1,fields.length).setNumberFormat('@').setValues([fields.map(f=>cell_(obj[f]))]);
  SpreadsheetApp.flush();
}
function text_(value,max,label,required) {
  const s=String(value==null?'':value).trim();
  if (required && !s) throw new Error(label+' wajib diisi.');
  if (s.length>max) throw new Error(label+' terlalu panjang.');return s;
}
function validTask_(t) {
  if (!t || typeof t!=='object') throw new Error('Tugasan tidak sah.');
  const out={date:text_(t.date,10,'Tarikh',true),className:text_(t.className,100,'Kelas',true),subject:text_(t.subject,100,'Subjek',true),teacher:text_(t.teacher,200,'Nama guru',true),title:text_(t.title,200,'Tajuk',true),instructions:text_(t.instructions,6000,'Arahan',true),message:text_(t.message,2000,'Pesanan',false)};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date) || isNaN(Date.parse(out.date+'T12:00:00Z')) || new Date(out.date+'T12:00:00Z').toISOString().slice(0,10)!==out.date) throw new Error('Tarikh tidak sah.');
  const roster=roster_();
  if (!roster.students.some(s=>s.className===out.className)) throw new Error('Kelas tidak sah.');
  if (!roster.teachers.includes(out.teacher)) throw new Error('Nama guru tidak sah.');
  if (!PDPR.SUBJECTS.includes(out.subject)) throw new Error('Subjek tidak sah.');return out;
}
function mutateTask_(kind,p) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const rows=read_(PDPR.TASK_SHEET,TASK_FIELDS),now=new Date().toISOString();
    if (kind==='create') {
      const requestId=text_(p.requestId,100,'ID permintaan',true),existing=rows.find(t=>t.requestId===requestId);
      if (existing) return publicTask_(existing);
      const t={...validTask_(p.task),id:Utilities.getUuid(),createdAt:now,updatedAt:now,deleted:'false',requestId:requestId};
      write_(PDPR.TASK_SHEET,TASK_FIELDS,t);return publicTask_(t);
    }
    const id=kind==='delete'?p.id:p.task&&p.task.id;
    const old=rows.find(t=>t.id===id && t.deleted!=='true');
    if (!old) throw new Error('Tugasan tidak ditemui atau telah dipadam.');
    if (kind==='delete') {old.deleted='true';old.updatedAt=now;write_(PDPR.TASK_SHEET,TASK_FIELDS,old,old._row);return {deleted:true};}
    const updated=validTask_(p.task);
    if (updated.className!==old.className && submissions_().some(s=>s.taskId===id)) throw new Error('Kelas tidak boleh ditukar selepas penghantaran diterima.');
    const task={...old,...updated,updatedAt:now};write_(PDPR.TASK_SHEET,TASK_FIELDS,task,old._row);return publicTask_(task);
  } finally {lock.releaseLock();}
}
function submit_(p) {
  student_(p.className,p.studentName);
  const message=text_(p.message,3000,'Mesej',false),photos=p.photos||[];
  if (!Array.isArray(photos) || photos.length>4) throw new Error('Maksimum 4 gambar sahaja.');
  if (!message && !photos.length) throw new Error('Sila sertakan mesej atau gambar hasil kerja.');
  const prepared=photos.map(photo=>{
    const name=text_(photo.name,180,'Nama gambar',true).replace(/[^a-zA-Z0-9._ -]/g,'_');
    const match=String(photo.data||'').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[2].length>2000000) throw new Error('Format atau saiz gambar tidak sah.');
    const bytes=Utilities.base64Decode(match[2]);
    const b=i=>(bytes[i]+256)%256;
    const valid=match[1]==='image/jpeg'?b(0)===255&&b(1)===216&&b(2)===255:match[1]==='image/png'?b(0)===137&&b(1)===80&&b(2)===78&&b(3)===71:b(0)===82&&b(1)===73&&b(2)===70&&b(3)===70&&b(8)===87&&b(9)===69&&b(10)===66&&b(11)===80;
    if (!valid) throw new Error('Kandungan gambar tidak sah.');
    return {name:name,mime:match[1],bytes:bytes};
  });
  const lock=LockService.getScriptLock();lock.waitLock(30000);const uploaded=[];
  try {
    const task=activeTasks_().find(t=>t.id===p.taskId && t.className===p.className);
    if (!task) throw new Error('Tugasan tidak ditemui untuk kelas ini.');
    if (submissions_().some(s=>s.taskId===p.taskId&&s.className===p.className&&s.studentName===p.studentName)) throw new Error('Tugasan ini sudah dihantar. Penghantaran berulang tidak dibenarkan.');
    const id=Utilities.getUuid(),folder=DriveApp.getFolderById(PDPR.FOLDER_ID);
    const files=prepared.map((photo,i)=>{
      const file=folder.createFile(Utilities.newBlob(photo.bytes,photo.mime,id+'_'+(i+1)+'_'+photo.name));
      uploaded.push(file);
      // Keep Drive files private. Photos are returned through authorized getSubmission.
      return {id:file.getId(),name:photo.name,mimeType:photo.mime};
    });
    const sub={id:id,taskId:task.id,className:p.className,studentName:p.studentName,message:message,photos:JSON.stringify(files),submittedAt:new Date().toISOString(),stars:'',marks:'',feedback:'',reviewedAt:'',requestId:text_(p.requestId,100,'ID permintaan',false)};
    write_(PDPR.SUB_SHEET,SUB_FIELDS,sub);return {id:id,submittedAt:sub.submittedAt};
  } catch(err) {uploaded.forEach(f=>{try{f.setTrashed(true);}catch(_){}});throw err;}
  finally {lock.releaseLock();}
}
function submissionDetail_(p) {
  const sub=submissions_().find(s=>s.id===p.id);
  if (!sub) throw new Error('Rekod tidak ditemui.');
  if (!teacher_(p.token)) {
    student_(p.className,p.studentName);
    if (sub.className!==p.className || sub.studentName!==p.studentName) throw new Error('Tiada kebenaran melihat rekod ini.');
  }
  return {...sub,photos:sub.photos.map(photo=>{
    try {const blob=DriveApp.getFileById(photo.id).getBlob();return {...photo,url:'data:'+blob.getContentType()+';base64,'+Utilities.base64Encode(blob.getBytes())};}
    catch(_) {return {...photo,url:'',error:'Gambar tidak dapat dibaca.'};}
  })};
}
function grade_(p) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const row=read_(PDPR.SUB_SHEET,SUB_FIELDS).find(s=>s.id===p.id);
    if (!row) throw new Error('Rekod penghantaran tidak ditemui.');
    const stars=Number(p.stars),marks=p.marks===''||p.marks==null?'':Number(p.marks);
    if (!Number.isInteger(stars)||stars<0||stars>5) throw new Error('Bintang mestilah antara 0 hingga 5.');
    if (marks!==''&&(!Number.isFinite(marks)||marks<0||marks>100)) throw new Error('Markah mestilah antara 0 hingga 100.');
    row.stars=stars;row.marks=marks;row.feedback=text_(p.feedback,3000,'Respon guru',false);row.reviewedAt=new Date().toISOString();
    write_(PDPR.SUB_SHEET,SUB_FIELDS,row,row._row);return {id:row.id,reviewedAt:row.reviewedAt};
  } finally {lock.releaseLock();}
}
