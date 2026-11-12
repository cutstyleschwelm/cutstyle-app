import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qmtjslgfmfeuanphybrs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c_d9uUTuG5AIzVPQX44KFA_-J4HwqDZ';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let customers = [], appointments = [], services = [], staff = [], currentUser = null;
let calendarDate = new Date(); let calendarView = 'week';
let editingAppointmentId = null;

const DEFAULT_SERVICES = [
['Damen','Trockenschnitt','25 €','40 €'],['Damen','Waschen & Schneiden & Föhnen','35 €','50 €'],['Damen','Föhnen','25 €','35 €'],['Damen','Locken - Hochsteckfrisur','ab 45 €','ab 45 €'],['Damen','Kinderhaarschnitt','20 €','25 €'],['Damen','Foliensträhnchen pro Folie','3,50 €','7 €'],['Damen','Strähnen Paket Komplettpaket Schneiden (bis 25 Folien)','ab 85 €','ab 120 €'],['Damen','Färbepaket komplett mit Schneiden','85 €','99 €'],['Damen','Ansatzfarbe komplett mit Schneiden','45 €','60 €'],['Damen','Haubensträhnen','45 €','45 €'],['Damen','Glossing Tönung & Kur','35 €','35 €'],['Damen','Dauerwelle Paket','70 €','90 €'],['Damen','Ombre / Balayage','ab 99 €','ab 120 €'],
['Kosmetik','Oberlippezupfen','5 €',''],['Kosmetik','Augenbraunzupfen','10 €',''],['Kosmetik','Augenbraunzupfen + Färben','20 €',''],['Kosmetik','Wimpernfärben','10 €',''],['Kosmetik','Augenbrauenfärben','10 €',''],
['Herren','Trockenschnitt (Schneiden)','20 €',''],['Herren','Waschen Schneiden Föhnen','25 €',''],['Herren','Haar & Bart','35 €',''],['Herren','Haarfarben','30 €',''],['Herren','Maschinenschnitt','10 €',''],['Herren','Bartrasur','20 €',''],['Herren','Herren Dauerwelle Paket','65 €',''],['Herren','Bart Konturen','10 €',''],['Herren','Bartrasur mit Maschine','10 €',''],['Herren','Augenbraunzupfen','10 €',''],['Herren','Heiß Wachs','5 €',''],['Herren','Föhnen','10 €',''],['Herren','Waschen','5 €',''],['Herren','Trimmersauber','5 €',''],['Herren','Haarmuster','ab 5 €','']
];
const today = new Date().toLocaleDateString('en-CA');
$('today').textContent = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
$('apptDate').value = today;
// Einfache, fingerfreundliche Uhrzeitauswahl in 15-Minuten-Schritten
const timeSlots = $('timeSlots');
for(let h=8;h<=19;h++){
  for(let m of [0,15,30,45]){
    const value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    const b=document.createElement('button');b.type='button';b.className='time-slot';b.textContent=value;b.dataset.time=value;
    b.addEventListener('click',()=>{
      $('apptTime').value=value;$('timePickerValue').textContent=value;
      document.querySelectorAll('.time-slot').forEach(x=>x.classList.toggle('selected',x.dataset.time===value));
      $('timePickerPanel').hidden=true;$('timePickerToggle').setAttribute('aria-expanded','false');
    });
    timeSlots.appendChild(b);
  }
}
$('timePickerToggle').addEventListener('click',()=>{
  const panel=$('timePickerPanel');panel.hidden=!panel.hidden;
  $('timePickerToggle').setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden){const current=$('apptTime').value;document.querySelectorAll('.time-slot').forEach(x=>x.classList.toggle('selected',x.dataset.time===current));}
});

const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showMessage(message, bad=false){ const el=$('appMessage'); el.textContent=message; el.className=bad?'message error':'message'; }
function page(p){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('show',x.id===p));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>page(b.dataset.page));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>page(b.dataset.go));

$('loginForm').addEventListener('submit', async e=>{
  e.preventDefault(); $('loginMessage').textContent='Anmeldung läuft …'; $('loginMessage').className='message';
  const {error}=await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
  if(error){const el=$('loginMessage');el.textContent='Anmeldung fehlgeschlagen: '+error.message;el.className='message error';return;}
  await startApp();
});
$('logoutBtn').onclick=async()=>{await supabase.auth.signOut();location.reload();};
$('refreshDataBtn').addEventListener('click',()=>loadCloudData());

async function startApp(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){$('loginScreen').hidden=false;$('appShell').hidden=true;return;}
  currentUser=user;
  const {data:membership,error:memberError}=await supabase.from('cutstyle_members').select('member_role').eq('user_id',user.id).maybeSingle();
  if(memberError || !membership){showMessage('Dieses Konto ist noch kein CutStyle-Mitglied. Bitte den Saloninhaber kontaktieren.',true);await supabase.auth.signOut();return;}
  $('loginScreen').hidden=true;$('appShell').hidden=false;$('signedInAs').textContent=user.email||'';
  $('connectionStatus').textContent='Cloud verbunden';
  await loadCloudData();
}
async function loadCloudData(){
  showMessage('Daten werden synchronisiert …');
  const results=await Promise.all([
    supabase.from('customers').select('*').order('last_name').order('first_name'),
    supabase.from('appointments').select('*').order('start_at'),
    supabase.from('services').select('*').eq('active',true).order('category').order('name'),
    supabase.from('staff').select('*').eq('active',true).order('name')
  ]);
  const err=results.find(r=>r.error)?.error;
  if(err){showMessage('Daten konnten nicht geladen werden: '+err.message,true);return;}
  customers=results[0].data.map(c=>({...c,name:[c.first_name,c.last_name].filter(Boolean).join(' '),phone:c.phone||'',email:c.email||'',notes:c.hair_notes||c.general_notes||'',formula:c.color_formula||''}));
  appointments=results[1].data.map(a=>{const d=new Date(a.start_at);return {...a,date:d.toLocaleDateString('en-CA'),time:d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),customerId:a.customer_id,staffId:a.staff_id,service:a.service_name||'',price:a.price==null?'':String(a.price)+' €',duration:a.end_at?Math.round((new Date(a.end_at)-d)/60000):90,note:a.notes||''};});
  services=results[2].data.map(s=>({...s,short:s.price_note||(s.price_from!=null?`${s.price_from} €`:''),long:s.price_to!=null?`${s.price_to} €`:''}));
  staff=results[3].data;
  if(services.length===0){
    const rows=DEFAULT_SERVICES.map(([category,name,short,long])=>({category,name,price_note:short,price_from:null,price_to:null,active:true}));
    const {error}=await supabase.from('services').insert(rows);
    if(error){showMessage('Leistungen konnten nicht initialisiert werden: '+error.message,true);return;}
    const {data}=await supabase.from('services').select('*').eq('active',true).order('category').order('name');
    services=data||[];
  }
  render();showMessage('Alle Daten sind mit der CutStyle-Cloud synchronisiert.');
}

$('customerForm').onsubmit=async e=>{e.preventDefault();const full=$('customerName').value.trim().split(/\s+/);const first=full.shift()||'';const last=full.join(' ');const row={first_name:first,last_name:last||null,phone:$('customerPhone').value.trim()||null,email:$('customerEmail').value.trim()||null,hair_notes:$('customerNotes').value.trim()||null,color_formula:$('customerFormula').value.trim()||null};const {error}=await supabase.from('customers').insert(row);if(error){showMessage('Kunde konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
let creatingNewCustomer = false;
let selectedCustomerId = '';
function normalizeCustomerText(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
}
function customerDisplayName(customer){
  return String(customer.name || [customer.first_name,customer.last_name].filter(Boolean).join(' ') || '').replace(/\s+/g,' ').trim();
}
function updateCustomerSuggestions(){
  const typed=normalizeCustomerText($('apptCustomer').value);
  const box=$('customerSuggestions');
  if(!typed){box.innerHTML='';box.hidden=true;return [];}
  const matches=customers.filter(c=>{
    const name=normalizeCustomerText(customerDisplayName(c));
    const first=normalizeCustomerText(c.first_name);
    const last=normalizeCustomerText(c.last_name);
    return name.includes(typed) || first.includes(typed) || last.includes(typed) || normalizeCustomerText(`${first} ${last}`).includes(typed);
  }).slice(0,8);
  box.innerHTML=matches.map(c=>{
    const name=customerDisplayName(c);
    return `<button type="button" class="customer-suggestion" data-customer-id="${esc(c.id)}" data-customer-name="${esc(name)}">${esc(name)}${c.phone?` <small>${esc(c.phone)}</small>`:''}</button>`;
  }).join('');
  box.hidden=matches.length===0;
  return matches;
}
function clearNewCustomerFields(){
  $('newCustomerPhone').value='';$('newCustomerEmail').value='';$('newCustomerNotes').value='';$('newCustomerFormula').value='';
}
$('apptCustomer').addEventListener('focus',()=>{
  if($('apptCustomer').value.trim()) updateCustomerSuggestions();
});
$('apptCustomer').addEventListener('input',()=>{
  const typed=normalizeCustomerText($('apptCustomer').value);
  const matches=updateCustomerSuggestions();
  const exact=customers.find(c=>normalizeCustomerText(customerDisplayName(c))===typed);
  selectedCustomerId=exact?String(exact.id):'';
  // A partial match is an existing customer candidate, never a new-customer form.
  creatingNewCustomer=!!typed && matches.length===0 && !exact;
  $('inlineNewCustomer').hidden=!creatingNewCustomer;
  if(!creatingNewCustomer) clearNewCustomerFields();
});
$('customerSuggestions').addEventListener('mousedown',e=>{
  const item=e.target.closest('.customer-suggestion');
  if(!item)return;
  e.preventDefault();
  $('apptCustomer').value=item.dataset.customerName;
  selectedCustomerId=String(item.dataset.customerId);
  creatingNewCustomer=false;
  $('inlineNewCustomer').hidden=true;
  $('customerSuggestions').hidden=true;
  clearNewCustomerFields();
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.field-block')) $('customerSuggestions').hidden=true;
});
$('appointmentForm').onsubmit=async e=>{
  e.preventDefault();
  const service=services.find(s=>String(s.id)===$('apptService').value);
  const staffId=$('apptStaff').value;
  const date=$('apptDate').value,time=$('apptTime').value;
  if(!service){showMessage('Bitte eine Leistung auswählen.',true);return;}
  if(!staffId){showMessage('Bitte einen Mitarbeiter auswählen.',true);return;}
  if(!date||!time){showMessage('Bitte Datum und Uhrzeit auswählen.',true);return;}
  const start=new Date(`${date}T${time}:00`);
  const end=new Date(start.getTime()+Number($('apptDuration').value||90)*60000);
  const conflict=appointments.find(a=>String(a.id)!==String(editingAppointmentId||'')&&String(a.staff_id)===String(staffId)&&new Date(a.start_at)<end&&new Date(a.end_at)>start&&a.status!=='cancelled');
  if(conflict){const who=customers.find(c=>String(c.id)===String(conflict.customer_id));showMessage(`Zeitkonflikt: Dieser Mitarbeiter hat bereits um ${new Date(conflict.start_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} einen Termin${who?' mit '+who.name:''}. Bitte eine andere Zeit oder einen anderen Mitarbeiter wählen.`,true);return;}
  let customerId=selectedCustomerId;
  if(creatingNewCustomer && !editingAppointmentId){
    const full=$('apptCustomer').value.trim().split(/\s+/);
    const first=full.shift()||'',last=full.join(' ');
    if(!first){showMessage('Bitte den Kundennamen eingeben.',true);$('apptCustomer').focus();return;}
    const customerRow={first_name:first,last_name:last||null,phone:$('newCustomerPhone').value.trim()||null,email:$('newCustomerEmail').value.trim()||null,hair_notes:$('newCustomerNotes').value.trim()||null,color_formula:$('newCustomerFormula').value.trim()||null};
    const {data,error}=await supabase.from('customers').insert(customerRow).select('id').single();
    if(error){showMessage('Kunde konnte nicht gespeichert werden: '+error.message,true);return;}
    customerId=data.id;
  }
  if(!customerId){showMessage('Bitte einen vorhandenen Kunden auswählen oder einen neuen Namen in das Feld „Kunde“ eingeben.',true);$('apptCustomer').focus();return;}
  const row={customer_id:customerId,staff_id:staffId,service_id:service.id,service_name:service.name,price:service.price_from??null,start_at:start.toISOString(),end_at:end.toISOString(),status:'booked',notes:$('apptNote').value.trim()||null};
  const result = editingAppointmentId
    ? await supabase.from('appointments').update(row).eq('id',editingAppointmentId)
    : await supabase.from('appointments').insert(row);
  if(result.error){showMessage((creatingNewCustomer?'Der Kunde wurde bereits gespeichert, aber der Termin konnte nicht gespeichert werden: ':'Termin konnte nicht gespeichert werden: ')+result.error.message,true);return;}
  const wasEditing=!!editingAppointmentId;
  e.target.reset();creatingNewCustomer=false;selectedCustomerId='';editingAppointmentId=null;$('inlineNewCustomer').hidden=true;$('apptDate').value=today;$('apptDuration').value=90;$('appointmentSubmitBtn').textContent='Kunde und Termin speichern';$('cancelEditBtn').hidden=true;
  await loadCloudData();showMessage(wasEditing?'Termin wurde erfolgreich aktualisiert.':'Kunde und Termin wurden erfolgreich gespeichert.');
};
$('serviceForm').onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from('services').insert({category:$('serviceCategory').value,name:$('serviceName').value.trim(),price_note:$('serviceShort').value.trim()||null,price_to:null,active:true});if(error){showMessage('Leistung konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
$('staffForm').onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from('staff').insert({name:$('staffName').value.trim(),active:true});if(error){showMessage('Mitarbeiter konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
$('customerSearch').oninput=render;
window.editAppointment=async id=>{
 const a=appointments.find(x=>String(x.id)===String(id));if(!a)return;
 const c=customers.find(x=>String(x.id)===String(a.customer_id));
 if(!c){showMessage('Der zugehörige Kunde wurde nicht gefunden.',true);return;}
 editingAppointmentId=String(a.id);selectedCustomerId=String(a.customer_id);creatingNewCustomer=false;
 $('apptCustomer').value=c.name;$('inlineNewCustomer').hidden=true;$('customerSuggestions').hidden=true;
 $('apptService').value=String(a.service_id||'');$('apptStaff').value=String(a.staff_id||'');$('apptDate').value=a.date;$('apptTime').value=a.time;$('timePickerValue').textContent=a.time;$('apptDuration').value=a.duration||90;$('apptNote').value=a.note||'';
 $('appointmentSubmitBtn').textContent='Änderungen speichern';$('cancelEditBtn').hidden=false;
 document.querySelectorAll('.time-slot').forEach(x=>x.classList.toggle('selected',x.dataset.time===a.time));
 $('timePickerPanel').hidden=true;$('timePickerToggle').setAttribute('aria-expanded','false');
 $('appointmentForm').scrollIntoView({behavior:'smooth',block:'start'});showMessage('Termin bearbeiten: Änderungen vornehmen und speichern.');
};
$('cancelEditBtn').onclick=()=>{editingAppointmentId=null;creatingNewCustomer=false;selectedCustomerId='';$('appointmentForm').reset();$('apptDate').value=today;$('apptDuration').value=90;$('inlineNewCustomer').hidden=true;$('appointmentSubmitBtn').textContent='Kunde und Termin speichern';$('cancelEditBtn').hidden=true;showMessage('Bearbeitung abgebrochen.');};
window.del=async(table,id)=>{if(!confirm('Diesen Eintrag wirklich löschen?'))return;const {error}=await supabase.from(table).delete().eq('id',id);if(error){showMessage('Löschen fehlgeschlagen: '+error.message,true);return;}await loadCloudData();};
window.cancelAppointment=async id=>{if(!confirm('Diesen Termin wirklich stornieren? Er bleibt in der Kundenhistorie erhalten.'))return;const {error}=await supabase.from('appointments').update({status:'cancelled'}).eq('id',id);if(error){showMessage('Termin konnte nicht storniert werden: '+error.message,true);return;}await loadCloudData();showMessage('Termin wurde storniert. Der Eintrag bleibt gespeichert.');};
window.restoreAppointment=async id=>{const appt=appointments.find(a=>String(a.id)===String(id));if(!appt)return;const start=new Date(appt.start_at),end=new Date(appt.end_at);const conflict=appointments.find(a=>String(a.id)!==String(id)&&String(a.staff_id)===String(appt.staff_id)&&a.status!=='cancelled'&&new Date(a.start_at)<end&&new Date(a.end_at)>start);if(conflict){showMessage('Termin kann nicht reaktiviert werden: Der Mitarbeiter hat inzwischen einen anderen Termin in diesem Zeitraum.',true);return;}if(!confirm('Diesen stornierten Termin wieder aktivieren?'))return;const {error}=await supabase.from('appointments').update({status:'booked'}).eq('id',id);if(error){showMessage('Termin konnte nicht aktiviert werden: '+error.message,true);return;}await loadCloudData();showMessage('Termin wurde wieder aktiviert.');};
function render(){
 $('statAppointments').textContent=appointments.filter(a=>a.date===today&&a.status!=='cancelled').length;$('statCustomers').textContent=customers.length;$('statStaff').textContent=staff.length;
 $('apptService').innerHTML='<option value="">Leistung auswählen</option>'+services.map(s=>`<option value="${s.id}">${esc(s.category)} · ${esc(s.name)} (${esc(s.short||s.long||'Preis auf Anfrage')})</option>`).join('');
 $('apptStaff').innerHTML='<option value="">Mitarbeiter auswählen</option>'+staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 const ap=appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const rows=ap.map(a=>{const c=customers.find(x=>String(x.id)===String(a.customer_id)),s=staff.find(x=>String(x.id)===String(a.staff_id));const cancelled=a.status==='cancelled';const status=cancelled?'<span class="appointment-status cancelled">Storniert</span>':'<span class="appointment-status booked">Gebucht</span>';const action=cancelled?`<button class="smallbtn" onclick="restoreAppointment('${a.id}')">Wieder aktivieren</button>`:`<button class="smallbtn" onclick="editAppointment('${a.id}')">Bearbeiten</button><button class="smallbtn cancelbtn" onclick="cancelAppointment('${a.id}')">Stornieren</button>`;return `<tr class="${cancelled?'cancelled-row':''}"><td>${esc(a.date)}<br>${esc(a.time)}</td><td>${esc(c?.name||'Kunde')}</td><td>${esc(a.service)}<br><small>${esc(a.price||'')}</small></td><td>${esc(a.duration)} Min.</td><td>${esc(s?.name||'–')}</td><td>${status}<div class="appointment-actions">${action}<button class="smallbtn dangerbtn" onclick="del('appointments','${a.id}')">Endgültig löschen</button></div></td></tr>`}).join('');
 $('appointmentList').innerHTML=ap.length?`<table><thead><tr><th>Datum / Zeit</th><th>Kunde</th><th>Leistung</th><th>Dauer</th><th>Mitarbeiter</th><th>Status / Aktion</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Noch keine Termine vorhanden.</div>';
 renderCalendar();
 $('todayList').innerHTML=ap.filter(a=>a.date===today&&a.status!=='cancelled').map(a=>{const c=customers.find(x=>String(x.id)===String(a.customer_id));return `<div class="apptrow">${esc(a.time)} · <b>${esc(c?.name||'Kunde')}</b> · ${esc(a.service)}</div>`}).join('')||'<div class="empty">Für heute sind noch keine Termine eingetragen.</div>';
 const q=($('customerSearch').value||'').toLowerCase();const filtered=customers.filter(c=>(c.name+' '+c.phone+' '+c.email).toLowerCase().includes(q));
 $('customerList').innerHTML=filtered.length?`<table><thead><tr><th>Name / Kontakt</th><th>Hinweise</th><th>Farbformel</th><th></th></tr></thead><tbody>${filtered.map(c=>`<tr><td><b>${esc(c.name)}</b><br>${esc(c.phone)}${c.email?`<br>${esc(c.email)}`:''}</td><td>${esc(c.notes)}</td><td>${esc(c.formula)}</td><td><button class="smallbtn" onclick="del('customers','${c.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Kunden gespeichert.</div>';
 $('serviceList').innerHTML=services.length?`<table><thead><tr><th>Leistung</th><th>Preis / Standard</th><th></th></tr></thead><tbody>${services.map(s=>`<tr><td><small>${esc(s.category||'')}</small><br>${esc(s.name)}</td><td>${esc(s.short||s.long||'–')}</td><td><button class="smallbtn" onclick="del('services','${s.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Leistungen eingetragen.</div>';
 $('staffList').innerHTML=staff.length?`<table><thead><tr><th>Mitarbeiter</th><th></th></tr></thead><tbody>${staff.map(s=>`<tr><td>${esc(s.name)}</td><td><button class="smallbtn" onclick="del('staff','${s.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Mitarbeiter eingetragen.</div>';
}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function startOfWeek(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function renderCalendar(){
 const host=$('calendarView'); if(!host)return; const y=calendarDate.getFullYear(),m=calendarDate.getMonth(); let start,end,label;
 if(calendarView==='day'){start=new Date(calendarDate);start.setHours(0,0,0,0);end=new Date(start);end.setDate(end.getDate()+1);label=start.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});}
 else if(calendarView==='week'){start=startOfWeek(calendarDate);end=new Date(start);end.setDate(end.getDate()+7);const last=new Date(end);last.setDate(last.getDate()-1);label=`${start.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})} – ${last.toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}`;}
 else if(calendarView==='month'){start=new Date(y,m,1);end=new Date(y,m+1,1);label=calendarDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'});}
 else {start=new Date(y,0,1);end=new Date(y+1,0,1);label=String(y);}
 $('calLabel').textContent=label; document.querySelectorAll('[data-calview]').forEach(b=>b.classList.toggle('active',b.dataset.calview===calendarView));
 const visible=appointments.filter(a=>{const d=new Date(a.start_at);return d>=start&&d<end&&a.status!=='cancelled';});
 if(calendarView==='year'){
  host.innerHTML='<div class="year-grid">'+Array.from({length:12},(_,i)=>{const count=visible.filter(a=>new Date(a.start_at).getMonth()===i).length;return `<button type="button" class="year-month" data-month="${i}"><b>${new Date(y,i,1).toLocaleDateString('de-DE',{month:'long'})}</b><span>${count} Termine</span></button>`}).join('')+'</div>';
  host.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{calendarDate=new Date(y,Number(b.dataset.month),1);calendarView='month';renderCalendar();});return;
 }
 const days=[];for(let d=new Date(start);d<end;d.setDate(d.getDate()+1))days.push(new Date(d));
 host.innerHTML=days.map(d=>{const key=dateKey(d);const items=visible.filter(a=>dateKey(new Date(a.start_at))===key).sort((a,b)=>a.start_at.localeCompare(b.start_at));return `<section class="calendar-day"><div class="calendar-day-head"><b>${d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</b><span>${items.length} Termine</span></div>${items.length?items.map(a=>{const c=customers.find(x=>String(x.id)===String(a.customer_id));const st=staff.find(x=>String(x.id)===String(a.staff_id));const tm=new Date(a.start_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});const te=new Date(a.end_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});return `<div class="calendar-event"><strong>${tm}–${te}</strong><b>${esc(c?.name||'Kunde')}</b><span>${esc(a.service)}</span><small>${esc(st?.name||'Mitarbeiter nicht zugeordnet')}</small></div>`}).join(''):'<div class="calendar-empty">Keine Termine</div>'}</section>`}).join('');
}
document.querySelectorAll('[data-calview]').forEach(b=>b.addEventListener('click',()=>{calendarView=b.dataset.calview;renderCalendar();}));
$('calPrev').onclick=()=>{const d=new Date(calendarDate);if(calendarView==='day')d.setDate(d.getDate()-1);else if(calendarView==='week')d.setDate(d.getDate()-7);else if(calendarView==='month')d.setMonth(d.getMonth()-1);else d.setFullYear(d.getFullYear()-1);calendarDate=d;renderCalendar();};
$('calNext').onclick=()=>{const d=new Date(calendarDate);if(calendarView==='day')d.setDate(d.getDate()+1);else if(calendarView==='week')d.setDate(d.getDate()+7);else if(calendarView==='month')d.setMonth(d.getMonth()+1);else d.setFullYear(d.getFullYear()+1);calendarDate=d;renderCalendar();};
$('calToday').onclick=()=>{calendarDate=new Date();renderCalendar();};
supabase.auth.onAuthStateChange((_event,session)=>{if(session && !currentUser) setTimeout(startApp,0);});
startApp();