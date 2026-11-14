import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase project configuration. The browser key is a publishable key; never put a service_role key here.
const SUPABASE_URL = 'https://qmtjslgfmfeuanphybrs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c_d9uUTuG5AIzVPQX44KFA_-J4HwqDZ';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let customers = [], appointments = [], services = [], staff = [], currentUser = null;
let calendarDate = new Date();
let calendarView = 'week';
let editingAppointmentId = null, editingCustomerId = null, editingServiceId = null, editingStaffId = null;
let loading = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = localDateKey(new Date());
const money = value => value == null || value === '' ? '–' : new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(value));
const parseNumber = value => value.trim() === '' ? null : Number(value);
const fmtTime = value => value ? new Date(value).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '–';
const fmtDate = value => value ? new Date(value).toLocaleDateString('de-DE') : '–';
const localDateTime = (date,time) => new Date(`${date}T${time}:00`);
function showMessage(message, bad=false){ const el=$('appMessage'); if(!el)return; el.textContent=message; el.className=bad?'message error':'message'; }
function showLoginMessage(message,bad=false){$('loginMessage').textContent=message;$('loginMessage').className=bad?'message error':'message';}
function goPage(name){document.querySelectorAll('.page').forEach(el=>el.classList.toggle('show',el.id===name));document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('.nav').forEach(button=>button.addEventListener('click',()=>goPage(button.dataset.page)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>goPage(button.dataset.go)));
$('todayLabel').textContent = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
$('apptDate').value = today;

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  showLoginMessage('Anmeldung läuft …');
  const {error} = await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
  if(error){showLoginMessage('Anmeldung fehlgeschlagen: '+error.message,true);return;}
  await startApp();
});
$('logoutBtn').addEventListener('click', async()=>{await supabase.auth.signOut();currentUser=null;location.reload();});

async function startApp(){
  const {data:{user},error} = await supabase.auth.getUser();
  if(error){$('loginScreen').hidden=false;$('appShell').hidden=true;showLoginMessage(error.message,true);return;}
  if(!user){$('loginScreen').hidden=false;$('appShell').hidden=true;return;}
  currentUser=user;
  const {data:membership,error:memberError} = await supabase.from('cutstyle_members').select('member_role').eq('user_id',user.id).maybeSingle();
  if(memberError || !membership){$('loginScreen').hidden=false;$('appShell').hidden=true;showLoginMessage('Dieses Konto ist noch nicht als CutStyle-Mitglied freigeschaltet. Bitte die Mitgliedschaft in Supabase prüfen.',true);await supabase.auth.signOut();return;}
  $('loginScreen').hidden=true;$('appShell').hidden=false;$('connectionStatus').textContent='Cloud verbunden';
  await loadCloudData();
}

async function loadCloudData(){
  if(loading)return; loading=true; showMessage('Daten werden synchronisiert …');
  const results = await Promise.all([
    supabase.from('customers').select('*').order('last_name').order('first_name'),
    supabase.from('appointments').select('*').order('start_at'),
    supabase.from('services').select('*').order('category').order('name'),
    supabase.from('staff').select('*').order('name')
  ]);
  loading=false;
  const failed=results.find(result=>result.error);
  if(failed){showMessage('Daten konnten nicht geladen werden: '+failed.error.message,true);$('connectionStatus').textContent='Verbindungsfehler';return;}
  customers=(results[0].data||[]).map(c=>({...c,name:[c.first_name,c.last_name].filter(Boolean).join(' '),phone:c.phone||'',email:c.email||'',notes:c.hair_notes||c.general_notes||'',formula:c.color_formula||''}));
  appointments=(results[1].data||[]).map(a=>({...a,duration:a.end_at&&a.start_at?Math.round((new Date(a.end_at)-new Date(a.start_at))/60000):60}));
  services=results[2].data||[]; staff=results[3].data||[];
  $('connectionStatus').textContent='Cloud verbunden';
  renderAll(); showMessage('Alle Daten sind synchronisiert.');
}

function renderAll(){renderStats();renderAppointmentControls();renderAppointments();renderCalendar();renderCustomers();renderServices();renderStaff();}
function renderStats(){
  $('statToday').textContent=appointments.filter(a=>a.status==='booked'&&a.start_at&&localDateKey(new Date(a.start_at))===today).length;
  $('statCustomers').textContent=customers.length;
  $('statStaff').textContent=staff.filter(s=>s.active).length;
  $('statServices').textContent=services.filter(s=>s.active).length;
  const todays=appointments.filter(a=>a.status==='booked'&&a.start_at&&localDateKey(new Date(a.start_at))===today).sort((a,b)=>a.start_at.localeCompare(b.start_at));
  $('todayList').innerHTML=todays.length?todays.map(a=>{const c=customers.find(x=>x.id===a.customer_id);return `<div class="today-row"><strong>${fmtTime(a.start_at)}</strong><span><b>${esc(c?.name||'Kunde')}</b><small>${esc(a.service_name||'Leistung nicht angegeben')}</small></span><span>${esc(a.staff_id?staff.find(x=>x.id===a.staff_id)?.name||'':'')}</span></div>`}).join(''):'<div class="empty">Noch keine Termine für heute.</div>';
}
function renderAppointmentControls(){
  $('apptCustomer').innerHTML='<option value="">Kunde auswählen</option>'+customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('apptService').innerHTML='<option value="">Leistung auswählen</option>'+services.filter(s=>s.active).map(s=>`<option value="${esc(s.id)}">${esc(s.category||'')} · ${esc(s.name)}</option>`).join('');
  $('apptStaff').innerHTML='<option value="">Mitarbeiter auswählen</option>'+staff.filter(s=>s.active).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
}
$('apptService').addEventListener('change',()=>{const service=services.find(s=>String(s.id)===$('apptService').value);if(!service)return;if(service.duration_minutes)$('apptDuration').value=service.duration_minutes;if(service.price_from!=null)$('apptPrice').value=service.price_from;});

$('appointmentForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const service=services.find(s=>String(s.id)===$('apptService').value), staffId=$('apptStaff').value, customerId=$('apptCustomer').value;
  const date=$('apptDate').value,time=$('apptTime').value,duration=Number($('apptDuration').value);
  if(!service||!customerId||!staffId||!date||!time||!Number.isFinite(duration)||duration<5){showMessage('Bitte Kunde, Leistung, Mitarbeiter, Datum, Uhrzeit und eine gültige Dauer angeben.',true);return;}
  const start=localDateTime(date,time),end=new Date(start.getTime()+duration*60000);
  const conflict=appointments.find(a=>String(a.id)!==String(editingAppointmentId||'')&&String(a.staff_id)===String(staffId)&&a.status==='booked'&&new Date(a.start_at)<end&&new Date(a.end_at)>start);
  if(conflict){const who=customers.find(c=>c.id===conflict.customer_id);showMessage(`Zeitkonflikt: ${staff.find(s=>s.id===staffId)?.name||'Dieser Mitarbeiter'} hat bereits einen Termin von ${fmtTime(conflict.start_at)} bis ${fmtTime(conflict.end_at)}${who?' mit '+who.name:''}.`,true);return;}
  const row={customer_id:customerId,staff_id:staffId,service_id:service.id,service_name:service.name,price:parseNumber($('apptPrice').value),start_at:start.toISOString(),end_at:end.toISOString(),status:'booked',notes:$('apptNote').value.trim()||null};
  const result=editingAppointmentId?await supabase.from('appointments').update(row).eq('id',editingAppointmentId):await supabase.from('appointments').insert(row);
  if(result.error){showMessage('Termin konnte nicht gespeichert werden: '+result.error.message,true);return;}
  resetAppointmentForm();await loadCloudData();showMessage('Termin wurde gespeichert.');
});
function resetAppointmentForm(){editingAppointmentId=null;$('appointmentForm').reset();$('apptDate').value=today;$('apptDuration').value=60;$('appointmentFormTitle').textContent='Neuen Termin anlegen';$('appointmentSubmitBtn').textContent='Termin speichern';$('cancelAppointmentEdit').hidden=true;$('cancelAppointmentEdit2').hidden=true;}
$('cancelAppointmentEdit').addEventListener('click',resetAppointmentForm);$('cancelAppointmentEdit2').addEventListener('click',resetAppointmentForm);$('newAppointmentBtn').addEventListener('click',()=>{resetAppointmentForm();$('appointmentEditor').scrollIntoView({behavior:'smooth'});});
window.editAppointment=id=>{
  const a=appointments.find(x=>String(x.id)===String(id));if(!a)return;
  editingAppointmentId=String(a.id);$('apptCustomer').value=String(a.customer_id||'');$('apptService').value=String(a.service_id||'');$('apptStaff').value=String(a.staff_id||'');
  $('apptDate').value=localDateKey(new Date(a.start_at));$('apptTime').value=fmtTime(a.start_at);$('apptDuration').value=a.duration||60;$('apptPrice').value=a.price??'';$('apptNote').value=a.notes||'';
  $('appointmentFormTitle').textContent='Termin bearbeiten';$('appointmentSubmitBtn').textContent='Änderungen speichern';$('cancelAppointmentEdit').hidden=false;$('cancelAppointmentEdit2').hidden=false;
  $('appointmentEditor').scrollIntoView({behavior:'smooth'});
};
window.cancelAppointment=async id=>{if(!confirm('Diesen Termin stornieren? Er bleibt gespeichert.'))return;const {error}=await supabase.from('appointments').update({status:'cancelled'}).eq('id',id);if(error){showMessage('Termin konnte nicht storniert werden: '+error.message,true);return;}await loadCloudData();};
window.restoreAppointment=async id=>{const a=appointments.find(x=>String(x.id)===String(id));if(!a)return;const conflict=appointments.find(x=>String(x.id)!==String(id)&&String(x.staff_id)===String(a.staff_id)&&x.status==='booked'&&new Date(x.start_at)<new Date(a.end_at)&&new Date(x.end_at)>new Date(a.start_at));if(conflict){showMessage('Der Termin kann nicht reaktiviert werden, weil der Mitarbeiter inzwischen einen anderen Termin hat.',true);return;}const {error}=await supabase.from('appointments').update({status:'booked'}).eq('id',id);if(error){showMessage(error.message,true);return;}await loadCloudData();};
function renderAppointments(){
  const filter=$('appointmentFilter').value;const rows=appointments.filter(a=>filter==='all'||a.status===filter).slice().sort((a,b)=>a.start_at.localeCompare(b.start_at));
  $('appointmentList').innerHTML=rows.length?`<table><thead><tr><th>Datum / Zeit</th><th>Kunde</th><th>Leistung</th><th>Team</th><th>Status</th><th>Aktionen</th></tr></thead><tbody>${rows.map(a=>{const c=customers.find(x=>x.id===a.customer_id),s=staff.find(x=>x.id===a.staff_id),cancelled=a.status==='cancelled';return `<tr class="${cancelled?'muted-row':''}"><td>${fmtDate(a.start_at)}<br><b>${fmtTime(a.start_at)}–${fmtTime(a.end_at)}</b></td><td>${esc(c?.name||'–')}</td><td>${esc(a.service_name||'–')}<small>${money(a.price)}</small></td><td>${esc(s?.name||'–')}</td><td><span class="status-pill ${cancelled?'is-cancelled':'is-booked'}">${cancelled?'Storniert':'Gebucht'}</span></td><td class="action-cell">${cancelled?`<button class="small-btn" onclick="restoreAppointment('${a.id}')">Reaktivieren</button>`:`<button class="small-btn" onclick="editAppointment('${a.id}')">Bearbeiten</button><button class="small-btn danger" onclick="cancelAppointment('${a.id}')">Stornieren</button>`}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty">Keine Termine in dieser Auswahl.</div>';
}
$('appointmentFilter').addEventListener('change',renderAppointments);

function dateStartOfWeek(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function renderCalendar(){
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth();let start,end,label;
  if(calendarView==='day'){start=new Date(calendarDate);start.setHours(0,0,0,0);end=new Date(start);end.setDate(end.getDate()+1);label=start.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});}
  else if(calendarView==='week'){start=dateStartOfWeek(calendarDate);end=new Date(start);end.setDate(end.getDate()+7);const last=new Date(end);last.setDate(last.getDate()-1);label=`${start.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})} – ${last.toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}`;}
  else if(calendarView==='month'){start=new Date(y,m,1);end=new Date(y,m+1,1);label=calendarDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'});}
  else{start=new Date(y,0,1);end=new Date(y+1,0,1);label=String(y);}
  $('calLabel').textContent=label;document.querySelectorAll('[data-calview]').forEach(b=>b.classList.toggle('active',b.dataset.calview===calendarView));
  const visible=appointments.filter(a=>a.status==='booked'&&new Date(a.start_at)>=start&&new Date(a.start_at)<end);
  if(calendarView==='year'){$('calendarView').innerHTML='<div class="year-grid">'+Array.from({length:12},(_,i)=>{const count=visible.filter(a=>new Date(a.start_at).getMonth()===i).length;return `<button class="year-month" data-month="${i}"><b>${new Date(y,i,1).toLocaleDateString('de-DE',{month:'long'})}</b><span>${count} Termine</span></button>`}).join('')+'</div>';$('calendarView').querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{calendarDate=new Date(y,Number(b.dataset.month),1);calendarView='month';renderCalendar();});return;}
  const days=[];if(calendarView==='month'){const first=dateStartOfWeek(start);const last=dateStartOfWeek(new Date(y,m+1,0));for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1))days.push(new Date(d));}else{for(let d=new Date(start);d<end;d.setDate(d.getDate()+1))days.push(new Date(d));}
  $('calendarView').innerHTML=days.map(d=>{const key=localDateKey(d),items=visible.filter(a=>localDateKey(new Date(a.start_at))===key).sort((a,b)=>a.start_at.localeCompare(b.start_at));return `<section class="calendar-day ${calendarView==='month'?'month-day':''}"><div class="calendar-day-head"><b>${d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:calendarView==='month'?'short':undefined})}</b><span>${items.length}</span></div>${items.map(a=>{const c=customers.find(x=>x.id===a.customer_id),s=staff.find(x=>x.id===a.staff_id);return `<button class="calendar-event" onclick="editAppointment('${a.id}')"><strong>${fmtTime(a.start_at)}</strong><b>${esc(c?.name||'Kunde')}</b><small>${esc(a.service_name||'')} · ${esc(s?.name||'')}</small></button>`}).join('')||'<div class="calendar-empty">–</div>'}</section>`}).join('');
}
document.querySelectorAll('[data-calview]').forEach(b=>b.addEventListener('click',()=>{calendarView=b.dataset.calview;renderCalendar();}));
$('calPrev').addEventListener('click',()=>{if(calendarView==='day')calendarDate.setDate(calendarDate.getDate()-1);else if(calendarView==='week')calendarDate.setDate(calendarDate.getDate()-7);else if(calendarView==='month')calendarDate.setMonth(calendarDate.getMonth()-1);else calendarDate.setFullYear(calendarDate.getFullYear()-1);renderCalendar();});
$('calNext').addEventListener('click',()=>{if(calendarView==='day')calendarDate.setDate(calendarDate.getDate()+1);else if(calendarView==='week')calendarDate.setDate(calendarDate.getDate()+7);else if(calendarView==='month')calendarDate.setMonth(calendarDate.getMonth()+1);else calendarDate.setFullYear(calendarDate.getFullYear()+1);renderCalendar();});
$('calToday').addEventListener('click',()=>{calendarDate=new Date();renderCalendar();});

$('customerForm').addEventListener('submit',async event=>{
  event.preventDefault();const row={first_name:$('customerFirstName').value.trim(),last_name:$('customerLastName').value.trim()||null,phone:$('customerPhone').value.trim()||null,email:$('customerEmail').value.trim()||null,hair_notes:$('customerNotes').value.trim()||null,color_formula:$('customerFormula').value.trim()||null};
  const result=editingCustomerId?await supabase.from('customers').update(row).eq('id',editingCustomerId):await supabase.from('customers').insert(row);
  if(result.error){showMessage('Kundenkarte konnte nicht gespeichert werden: '+result.error.message,true);return;}resetCustomerForm();await loadCloudData();showMessage('Kundenkarte gespeichert.');
});
function resetCustomerForm(){editingCustomerId=null;$('customerForm').reset();$('customerFormTitle').textContent='Neuen Kunden anlegen';$('customerSubmitBtn').textContent='Kundenkarte speichern';$('cancelCustomerEdit').hidden=true;$('cancelCustomerEdit2').hidden=true;}
window.editCustomer=id=>{const c=customers.find(x=>String(x.id)===String(id));if(!c)return;editingCustomerId=String(id);$('customerFirstName').value=c.first_name||'';$('customerLastName').value=c.last_name||'';$('customerPhone').value=c.phone||'';$('customerEmail').value=c.email||'';$('customerNotes').value=c.hair_notes||'';$('customerFormula').value=c.color_formula||'';$('customerFormTitle').textContent='Kundenkarte bearbeiten';$('customerSubmitBtn').textContent='Änderungen speichern';$('cancelCustomerEdit').hidden=false;$('cancelCustomerEdit2').hidden=false;$('customerForm').scrollIntoView({behavior:'smooth'});};
$('cancelCustomerEdit').addEventListener('click',resetCustomerForm);$('cancelCustomerEdit2').addEventListener('click',resetCustomerForm);$('customerSearch').addEventListener('input',renderCustomers);
function renderCustomers(){const q=$('customerSearch').value.trim().toLocaleLowerCase('de-DE');const list=customers.filter(c=>(c.name+' '+c.phone+' '+c.email).toLocaleLowerCase('de-DE').includes(q));$('customerList').innerHTML=list.length?`<table><thead><tr><th>Kunde</th><th>Telefon / E-Mail</th><th>Haarhinweise</th><th>Farbformel</th><th>Aktion</th></tr></thead><tbody>${list.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}<small>${esc(c.email)}</small></td><td>${esc(c.hair_notes||'–')}</td><td>${esc(c.color_formula||'–')}</td><td><button class="small-btn" onclick="editCustomer('${c.id}')">Bearbeiten</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Keine Kunden gefunden.</div>';}

$('serviceForm').addEventListener('submit',async event=>{
  event.preventDefault();const row={category:$('serviceCategory').value,name:$('serviceName').value.trim(),price_from:parseNumber($('servicePriceFrom').value),price_to:parseNumber($('servicePriceTo').value),price_note:$('servicePriceNote').value.trim()||null,duration_minutes:parseNumber($('serviceDuration').value),active:$('serviceActive').checked};
  const result=editingServiceId?await supabase.from('services').update(row).eq('id',editingServiceId):await supabase.from('services').insert(row);
  if(result.error){showMessage('Leistung konnte nicht gespeichert werden: '+result.error.message,true);return;}resetServiceForm();await loadCloudData();showMessage('Leistung gespeichert.');
});
function resetServiceForm(){editingServiceId=null;$('serviceForm').reset();$('serviceActive').checked=true;$('serviceFormTitle').textContent='Neue Leistung anlegen';$('serviceSubmitBtn').textContent='Leistung speichern';$('cancelServiceEdit').hidden=true;$('cancelServiceEdit2').hidden=true;}
window.editService=id=>{const s=services.find(x=>String(x.id)===String(id));if(!s)return;editingServiceId=String(id);$('serviceCategory').value=s.category||'Damen';$('serviceName').value=s.name||'';$('servicePriceFrom').value=s.price_from??'';$('servicePriceTo').value=s.price_to??'';$('serviceDuration').value=s.duration_minutes??'';$('servicePriceNote').value=s.price_note||'';$('serviceActive').checked=!!s.active;$('serviceFormTitle').textContent='Leistung bearbeiten';$('serviceSubmitBtn').textContent='Änderungen speichern';$('cancelServiceEdit').hidden=false;$('cancelServiceEdit2').hidden=false;$('serviceForm').scrollIntoView({behavior:'smooth'});};
$('cancelServiceEdit').addEventListener('click',resetServiceForm);$('cancelServiceEdit2').addEventListener('click',resetServiceForm);$('showInactiveServices').addEventListener('change',renderServices);
function renderServices(){const list=services.filter(s=>$('showInactiveServices').checked||s.active);$('serviceList').innerHTML=list.length?`<table><thead><tr><th>Leistung</th><th>Preis</th><th>Dauer</th><th>Status</th><th>Aktion</th></tr></thead><tbody>${list.map(s=>`<tr class="${s.active?'':'muted-row'}"><td><small>${esc(s.category||'')}</small><b>${esc(s.name)}</b></td><td>${s.price_from==null?'–':money(s.price_from)}${s.price_to!=null&&s.price_to!==s.price_from?' – '+money(s.price_to):''}<small>${esc(s.price_note||'')}</small></td><td>${s.duration_minutes?esc(s.duration_minutes)+' Min.':'<span class="warning-text">Nicht festgelegt</span>'}</td><td><span class="status-pill ${s.active?'is-booked':'is-cancelled'}">${s.active?'Aktiv':'Inaktiv'}</span></td><td><button class="small-btn" onclick="editService('${s.id}')">Bearbeiten</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Keine Leistungen in dieser Auswahl.</div>';}

$('staffForm').addEventListener('submit',async event=>{event.preventDefault();const row={name:$('staffName').value.trim(),active:$('staffActive').checked};const result=editingStaffId?await supabase.from('staff').update(row).eq('id',editingStaffId):await supabase.from('staff').insert(row);if(result.error){showMessage('Mitarbeiter konnte nicht gespeichert werden: '+result.error.message,true);return;}resetStaffForm();await loadCloudData();showMessage('Mitarbeiter gespeichert.');});
function resetStaffForm(){editingStaffId=null;$('staffForm').reset();$('staffActive').checked=true;$('staffFormTitle').textContent='Mitarbeiter hinzufügen';$('staffSubmitBtn').textContent='Mitarbeiter speichern';$('cancelStaffEdit').hidden=true;$('cancelStaffEdit2').hidden=true;}
window.editStaff=id=>{const s=staff.find(x=>String(x.id)===String(id));if(!s)return;editingStaffId=String(id);$('staffName').value=s.name||'';$('staffActive').checked=!!s.active;$('staffFormTitle').textContent='Mitarbeiter bearbeiten';$('staffSubmitBtn').textContent='Änderungen speichern';$('cancelStaffEdit').hidden=false;$('cancelStaffEdit2').hidden=false;$('staffForm').scrollIntoView({behavior:'smooth'});};
$('cancelStaffEdit').addEventListener('click',resetStaffForm);$('cancelStaffEdit2').addEventListener('click',resetStaffForm);$('showInactiveStaff').addEventListener('change',renderStaff);
function renderStaff(){const list=staff.filter(s=>$('showInactiveStaff').checked||s.active);$('staffList').innerHTML=list.length?`<table><thead><tr><th>Mitarbeiter</th><th>Status</th><th>Aktion</th></tr></thead><tbody>${list.map(s=>`<tr class="${s.active?'':'muted-row'}"><td><b>${esc(s.name)}</b></td><td><span class="status-pill ${s.active?'is-booked':'is-cancelled'}">${s.active?'Aktiv':'Inaktiv'}</span></td><td><button class="small-btn" onclick="editStaff('${s.id}')">Bearbeiten</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Keine Mitarbeiter in dieser Auswahl.</div>';}

supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session?.user&&!currentUser)setTimeout(startApp,0);if(event==='SIGNED_OUT'){currentUser=null;$('appShell').hidden=true;$('loginScreen').hidden=false;}});
startApp();
