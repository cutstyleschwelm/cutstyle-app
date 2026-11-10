import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qmtjslgfmfeuanphybrs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c_d9uUTuG5AIzVPQX44KFA_-J4HwqDZ';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let customers = [], appointments = [], services = [], staff = [], currentUser = null;

const DEFAULT_SERVICES = [
['Damen','Trockenschnitt','25 €','40 €'],['Damen','Waschen & Schneiden & Föhnen','35 €','50 €'],['Damen','Föhnen','25 €','35 €'],['Damen','Locken - Hochsteckfrisur','ab 45 €','ab 45 €'],['Damen','Kinderhaarschnitt','20 €','25 €'],['Damen','Foliensträhnchen pro Folie','3,50 €','7 €'],['Damen','Strähnen Paket Komplettpaket Schneiden (bis 25 Folien)','ab 85 €','ab 120 €'],['Damen','Färbepaket komplett mit Schneiden','85 €','99 €'],['Damen','Ansatzfarbe komplett mit Schneiden','45 €','60 €'],['Damen','Haubensträhnen','45 €','45 €'],['Damen','Glossing Tönung & Kur','35 €','35 €'],['Damen','Dauerwelle Paket','70 €','90 €'],['Damen','Ombre / Balayage','ab 99 €','ab 120 €'],
['Kosmetik','Oberlippezupfen','5 €',''],['Kosmetik','Augenbraunzupfen','10 €',''],['Kosmetik','Augenbraunzupfen + Färben','20 €',''],['Kosmetik','Wimpernfärben','10 €',''],['Kosmetik','Augenbrauenfärben','10 €',''],
['Herren','Trockenschnitt (Schneiden)','20 €',''],['Herren','Waschen Schneiden Föhnen','25 €',''],['Herren','Haar & Bart','35 €',''],['Herren','Haarfarben','30 €',''],['Herren','Maschinenschnitt','10 €',''],['Herren','Bartrasur','20 €',''],['Herren','Herren Dauerwelle Paket','65 €',''],['Herren','Bart Konturen','10 €',''],['Herren','Bartrasur mit Maschine','10 €',''],['Herren','Augenbraunzupfen','10 €',''],['Herren','Heiß Wachs','5 €',''],['Herren','Föhnen','10 €',''],['Herren','Waschen','5 €',''],['Herren','Trimmersauber','5 €',''],['Herren','Haarmuster','ab 5 €','']
];
const today = new Date().toLocaleDateString('en-CA');
$('today').textContent = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
$('apptDate').value = today;
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
  customers=results[0].data.map(c=>({...c,name:[c.first_name,c.last_name].filter(Boolean).join(' '),phone:c.phone||'',notes:c.hair_notes||c.general_notes||'',formula:c.color_formula||''}));
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

$('customerForm').onsubmit=async e=>{e.preventDefault();const full=$('customerName').value.trim().split(/\s+/);const first=full.shift()||'';const last=full.join(' ');const row={first_name:first,last_name:last||null,phone:$('customerPhone').value.trim()||null,hair_notes:$('customerNotes').value.trim()||null,color_formula:$('customerFormula').value.trim()||null};const {error}=await supabase.from('customers').insert(row);if(error){showMessage('Kunde konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
$('appointmentForm').onsubmit=async e=>{e.preventDefault();const service=services.find(s=>String(s.id)===$('apptService').value);const customer=customers.find(c=>String(c.id)===$('apptCustomer').value);const date=$('apptDate').value,time=$('apptTime').value;const start=new Date(`${date}T${time}:00`);const end=new Date(start.getTime()+Number($('apptDuration').value||90)*60000);const row={customer_id:customer?.id||null,staff_id:$('apptStaff').value||null,service_id:service?.id||null,service_name:service?.name||'',price:service?.price_from??null,start_at:start.toISOString(),end_at:end.toISOString(),status:'booked',notes:$('apptNote').value.trim()||null};const {error}=await supabase.from('appointments').insert(row);if(error){showMessage('Termin konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();$('apptDate').value=today;$('apptDuration').value=90;await loadCloudData();};
$('serviceForm').onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from('services').insert({category:$('serviceCategory').value,name:$('serviceName').value.trim(),price_note:$('serviceShort').value.trim()||null,price_to:null,active:true});if(error){showMessage('Leistung konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
$('staffForm').onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from('staff').insert({name:$('staffName').value.trim(),active:true});if(error){showMessage('Mitarbeiter konnte nicht gespeichert werden: '+error.message,true);return;}e.target.reset();await loadCloudData();};
$('customerSearch').oninput=render;
window.del=async(table,id)=>{if(!confirm('Diesen Eintrag wirklich löschen?'))return;const {error}=await supabase.from(table).delete().eq('id',id);if(error){showMessage('Löschen fehlgeschlagen: '+error.message,true);return;}await loadCloudData();};
function render(){
 $('statAppointments').textContent=appointments.filter(a=>a.date===today).length;$('statCustomers').textContent=customers.length;$('statStaff').textContent=staff.length;
 $('apptCustomer').innerHTML='<option value="">Kunde auswählen</option>'+customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
 $('apptService').innerHTML='<option value="">Leistung auswählen</option>'+services.map(s=>`<option value="${s.id}">${esc(s.category)} · ${esc(s.name)} (${esc(s.short||s.long||'Preis auf Anfrage')})</option>`).join('');
 $('apptStaff').innerHTML='<option value="">Nicht zugewiesen</option>'+staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 const ap=appointments.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const rows=ap.map(a=>{const c=customers.find(x=>String(x.id)===String(a.customer_id)),s=staff.find(x=>String(x.id)===String(a.staff_id));return `<tr><td>${esc(a.date)}<br>${esc(a.time)}</td><td>${esc(c?.name||'Kunde')}</td><td>${esc(a.service)}<br><small>${esc(a.price||'')}</small></td><td>${esc(a.duration)} Min.</td><td>${esc(s?.name||'–')}</td><td><button class="smallbtn" onclick="del('appointments','${a.id}')">Löschen</button></td></tr>`}).join('');
 $('appointmentList').innerHTML=ap.length?`<table><thead><tr><th>Datum / Zeit</th><th>Kunde</th><th>Leistung</th><th>Dauer</th><th>Mitarbeiter</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Noch keine Termine vorhanden.</div>';
 $('todayList').innerHTML=ap.filter(a=>a.date===today).map(a=>{const c=customers.find(x=>String(x.id)===String(a.customer_id));return `<div class="apptrow">${esc(a.time)} · <b>${esc(c?.name||'Kunde')}</b> · ${esc(a.service)}</div>`}).join('')||'<div class="empty">Für heute sind noch keine Termine eingetragen.</div>';
 const q=($('customerSearch').value||'').toLowerCase();const filtered=customers.filter(c=>(c.name+' '+c.phone).toLowerCase().includes(q));
 $('customerList').innerHTML=filtered.length?`<table><thead><tr><th>Name / Telefon</th><th>Hinweise</th><th>Farbformel</th><th></th></tr></thead><tbody>${filtered.map(c=>`<tr><td><b>${esc(c.name)}</b><br>${esc(c.phone)}</td><td>${esc(c.notes)}</td><td>${esc(c.formula)}</td><td><button class="smallbtn" onclick="del('customers','${c.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Kunden gespeichert.</div>';
 $('serviceList').innerHTML=services.length?`<table><thead><tr><th>Leistung</th><th>Preis / Standard</th><th></th></tr></thead><tbody>${services.map(s=>`<tr><td><small>${esc(s.category||'')}</small><br>${esc(s.name)}</td><td>${esc(s.short||s.long||'–')}</td><td><button class="smallbtn" onclick="del('services','${s.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Leistungen eingetragen.</div>';
 $('staffList').innerHTML=staff.length?`<table><thead><tr><th>Mitarbeiter</th><th></th></tr></thead><tbody>${staff.map(s=>`<tr><td>${esc(s.name)}</td><td><button class="smallbtn" onclick="del('staff','${s.id}')">Löschen</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Noch keine Mitarbeiter eingetragen.</div>';
}
supabase.auth.onAuthStateChange((_event,session)=>{if(session && !currentUser) setTimeout(startApp,0);});
startApp();
