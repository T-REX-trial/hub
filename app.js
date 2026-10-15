/* T-REX Trial Hub — page logic. Content lives in data.js. */
(function(){
  const $ = (id) => document.getElementById(id);
  const fmt = (d) => d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const D = window.TREX || {};
  const L = D.links || {};

  /* ---------- Tabs ---------- */
  const PANELS = ['overview','visits','instructions','contacts'];
  function showTab(id, focus){
    if (!PANELS.includes(id)) id = 'overview';
    PANELS.forEach(p=>{ $(p).hidden = p!==id; const t=$('tab-'+p); t.setAttribute('aria-selected', String(p===id)); t.tabIndex = p===id ? 0 : -1; });
    try { localStorage.setItem('trex-tab', id); } catch(_){}
    if (focus) window.scrollTo({top:0});
  }
  PANELS.forEach(p=> $('tab-'+p).addEventListener('click', (e)=>{ e.preventDefault(); showTab(p, true); try{ history.replaceState(null,'','#'+p); }catch(_){} }));
  const ALIAS = { coordinators:'instructions', followup:'visits', calendars:'visits', team:'contacts' };
  window.addEventListener('hashchange', ()=>{ let h=location.hash.slice(1); h = ALIAS[h] || h; if (PANELS.includes(h)) showTab(h); });
  (function(){ let h = location.hash.slice(1); h = ALIAS[h] || h; if (!PANELS.includes(h)) { try { h = localStorage.getItem('trex-tab') || 'overview'; } catch(_){ h='overview'; } } showTab(h); })();


  /* ---------- Coordinator guides ---------- */
  const GUIDES = { randomisation:'Randomisation', crf:'Ledidi (eCRF)' };
  let curGuide = 'randomisation';
  function inline(text, el){
    const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g; let last = 0, m;
    while ((m = re.exec(text))){
      if (m.index > last) el.append(document.createTextNode(text.slice(last, m.index)));
      if (m[1] !== undefined){ const b=document.createElement('strong'); b.textContent=m[1]; el.append(b); }
      else if (m[2] !== undefined){ const c=document.createElement('code'); c.textContent=m[2]; el.append(c); }
      else { const a=document.createElement('a'); a.href=m[4]; a.target='_blank'; a.rel='noopener'; a.textContent=m[3]; el.append(a); }
      last = re.lastIndex;
    }
    if (last < text.length) el.append(document.createTextNode(text.slice(last)));
    return el;
  }
  function renderGuideText(src){
    const body = $('gd-body'); body.textContent=''; const toc = $('gd-toc'); toc.textContent='';
    let list = null, listType = '', hn = 0;
    const close = ()=>{ list=null; listType=''; };
    String(src||'').split('\n').forEach(raw=>{
      const line = raw.replace(/\s+$/,'');
      let m;
      if (!line.trim()){ close(); return; }
      if ((m = /^##\s+(.*)$/.exec(line))){ close(); const h=document.createElement('h3'); h.id='gd-h'+(++hn); inline(m[1], h); body.append(h); const a=document.createElement('a'); a.href='#'+h.id; a.textContent=h.textContent; a.addEventListener('click',(e)=>{ e.preventDefault(); h.scrollIntoView({behavior:'smooth',block:'start'}); }); toc.append(a); return; }
      if ((m = /^###\s+(.*)$/.exec(line))){ close(); body.append(inline(m[1], document.createElement('h4'))); return; }
      if ((m = /^\d+[.)]\s+(.*)$/.exec(line))){ if (listType!=='ol'){ list=document.createElement('ol'); listType='ol'; body.append(list); } const li=document.createElement('li'); li.append(inline(m[1], document.createElement('span'))); list.append(li); return; }
      if ((m = /^[-*]\s+(.*)$/.exec(line))){ if (listType!=='ul'){ list=document.createElement('ul'); listType='ul'; body.append(list); } const li=document.createElement('li'); li.append(inline(m[1], document.createElement('span'))); list.append(li); return; }
      if ((m = /^([!>])\s*(.*)$/.exec(line))){ close(); const d=document.createElement('div'); d.className='callout ' + (m[1]==='!'?'warn':'note'); d.append(inline(m[2], document.createElement('span'))); body.append(d); return; }
      close(); body.append(inline(line, document.createElement('p')));
    });
    toc.hidden = !toc.children.length;
  }

  const guideData = D.guides || {};
  function renderGuide(){
    $('gd-title').textContent = GUIDES[curGuide];
    document.querySelectorAll('#gd-switch button').forEach(b=> b.setAttribute('aria-pressed', String(b.dataset.g===curGuide)));
    $('gd-act-rand').hidden = curGuide!=='randomisation';
    $('gd-act-crf').hidden = curGuide!=='crf';
    $('gd-flow').hidden = curGuide!=='crf';
    const t = guideData[curGuide];
    if (t) renderGuideText(t);
    else { $('gd-body').innerHTML='<div class="empty">This guide has not been written yet.</div>'; $('gd-toc').textContent=''; }
    $('gd-meta').textContent = 'Step-by-step instructions maintained by the coordinating team.';
  }
  document.querySelectorAll('#gd-switch button').forEach(b=> b.addEventListener('click', ()=>{ curGuide = b.dataset.g; renderGuide(); }));
  if (L.form) $('gd-form-link').href = L.form;
  if (L.edc) $('gd-ledidi-link').href = L.edc;
  renderGuide();

  /* ---------- Quick links + links table ---------- */
  const LINKS = [
    {k:'edc', label:'Ledidi eCRF (personal accounts)'},
    {k:'drive', label:'T-REX shared folder (OneDrive)'},
    {k:'form', label:'Airtable randomisation form'},
    {k:'airtable', label:'Airtable: T-REX randomisation base'},
    {k:'protocol', label:'Protocol v1.1 and amendments'},
    {k:'isf', label:'Investigator Site File templates'},
    {k:'brand', label:'Logo files and slide templates'}
  ];
  const q = $('quicklinks');
  [['edc','Ledidi'],['protocol','Protocol'],['drive','Shared folder'],['form','Randomisation form']].forEach(([k,t])=>{
    if (!L[k]) return;
    const a=document.createElement('a'); a.className='qbtn'; a.href=L[k]; a.target='_blank'; a.rel='noopener'; a.textContent=t+' ↗'; q.append(a);
  });
  const lb = $('links-body');
  LINKS.forEach(x=>{
    const tr=document.createElement('tr'); const a=document.createElement('td'); a.textContent=x.label; a.style.fontWeight='600';
    const b=document.createElement('td');
    if (L[x.k]){ const l=document.createElement('a'); l.href=L[x.k]; l.target='_blank'; l.rel='noopener'; l.textContent='Open ↗'; b.append(l); }
    else { const h=document.createElement('span'); h.className='hint'; h.textContent='Not set yet'; b.append(h); }
    tr.append(a,b); lb.append(tr);
  });

  /* ---------- Updates ---------- */
  const ul = $('upd-list'); const ups = D.updates || [];
  if (!ups.length){ ul.innerHTML='<div class="empty">No announcements at the moment.</div>'; }
  ups.forEach(u=>{
    const row=document.createElement('div'); row.className='upd';
    const box=document.createElement('div'); box.style.flex='1'; box.style.minWidth='0';
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=(u.author||'Coordinating team') + (u.date ? ' · ' + fmt(new Date(u.date)) : '');
    const p=document.createElement('p'); p.textContent=u.text||'';
    box.append(meta,p); row.append(box); ul.append(row);
  });

  /* ---------- Sites (status from content, counts from Airtable) ---------- */
  const statusPill = (s)=> s==='Recruiting'?'p-ok' : (s==='Closed'||s==='To confirm'||!s)?'p-neutral' : 'p-warn';
  let siteDocs = (D.sites||[]).map(x=>({ id:x.name, data:()=>x }));
  function renderSites(){
    const sb = $('sites-body'); sb.textContent='';
    siteDocs.forEach(d=>{
      const s=d.data(); const cnt = (typeof AT!=='undefined' && AT.bySite) ? AT.bySite[norm(s.name)] : null;
      const tr=document.createElement('tr');
      [s.name, s.country, s.lead].forEach((v,i)=>{ const td=document.createElement('td'); td.textContent=v||'–'; if(!i) td.style.fontWeight='600'; tr.append(td); });
      const td=document.createElement('td'); const p=document.createElement('span'); p.className='pill '+statusPill(s.status); p.textContent=s.status||'To confirm'; td.append(p); tr.append(td);
      const n=document.createElement('td'); n.className='num'; n.style.fontWeight='600'; n.textContent = cnt ? cnt.n : 0; tr.append(n);
      const ac=document.createElement('td'); ac.className='num'; ac.textContent = cnt ? cnt.as+' · '+cnt.crt : '0 · 0'; tr.append(ac);
      sb.append(tr);
    });
    $('g-sites').textContent = siteDocs.filter(d=>d.data().status==='Recruiting').length;
    if (typeof renderCalendar==='function' && typeof cal!=='undefined') renderCalendar();
  }

  /* ---------- Team ---------- */
  const tl = $('team-list');
  (D.team||[]).slice().sort((a,b)=> String(a.last).localeCompare(String(b.last),'en',{sensitivity:'base'})).forEach(r=>{
    const m=document.createElement('div'); m.className='member';
    const role=document.createElement('div'); role.className='role'; role.textContent=r.role||'';
    const name=document.createElement('div'); name.className='name'; name.textContent=[r.first,r.last].filter(Boolean).join(' ');
    m.append(role,name);
    if (r.email){
      const mail=document.createElement('div'); mail.className='mail';
      const a=document.createElement('a'); a.href='mailto:'+r.email; a.textContent=r.email; a.style.overflow='hidden'; a.style.textOverflow='ellipsis';
      mail.append(a); m.append(mail);
    }
    tl.append(m);
  });

  /* ---------- Airtable (live, viewer's own credentials) ---------- */
  const F = { pid:'fld5OnRlgnKUqfwN1', country:'fldwVIZA2itGyhKg4', site:'fldTUz1LqLHkNsD6q', arm:'fldzcs7s9CLfqGvB4', alo:'fldlPS6TtS0ajk6DD', rand:'fldnSvyeUHJyqfMAu', status:'fldLwysBskRTGZiT8', next:'fldwhNE4xhS5oZlcK' };
  const MV = [[3,'fld7BZbJ5OVKEGQjb','fldrvOxFcGCNdfpp6'],[6,'fldfXSOb0YILTwJ2A','fldjmclqiO1QERBTF'],[9,'fldiQJy00rf5fDn2b','fldps6xjVry3NehvM'],[12,'fldpstbeRS7ujkfcB','fld4i4ZBTwAmKNZOW'],[15,'fldPrcIvYom4gzhyL','fld9royPModHXDcxR'],[18,'fldUz9aXk9J2PMuGe','fldjpu8YlVwbnbqvL'],[21,'fldilexThndsBbYCF','fldAj8IikikvjrJ56'],[24,'fldn9phksCI7lh9BG','fldQXVwxEKiIWyC6f'],[30,'fldM8sIQsJ9BtIUly','fld8Xl1v1uqej1Ety'],[36,'fldaVRQNmQ1jgMkFM','fldFHftFF5YEYQuHB'],[42,'fldVYIYMuXohYTv6H','fld7GFrGf91yrbCIe'],[48,'fldRykAIviRgn5Q34','fldOyaZnvbRUnsiVI'],[54,'fldylYOI20uY2vTDS','fldFXoSylz8Qpipk4'],[60,'fldzWZ7kqAmhGQY6c','fldM7mFmtuNFD0mA3']];
  const AT = { loaded:false, rows:[], bySite:{} };
  const norm = (s)=> String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
  function cellText(v){
    if (v==null) return '';
    if (typeof v==='string' || typeof v==='number') return String(v);
    if (Array.isArray(v)) return v.map(cellText).filter(Boolean).join(', ');
    if (typeof v==='object'){
      if ('name' in v) return String(v.name);
      if (v.valuesByLinkedRecordId) return Object.values(v.valuesByLinkedRecordId).map(cellText).join(', ');
      if ('value' in v) return cellText(v.value);
    }
    return '';
  }
  function armOf(c){ const t = (cellText(c[F.alo]) || cellText(c[F.arm])).toLowerCase(); return t.includes('chemo') ? 'CRT' : t.includes('surveil') ? 'AS' : ''; }
  function parseDMY(s){ s = String(s||'').trim(); let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return new Date(+m[3], +m[2]-1, +m[1]); m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (m) return new Date(+m[1], +m[2]-1, +m[3]); const d = s ? new Date(s) : null; return d && !isNaN(d) ? d : null; }
  function ingest(records){
    AT.rows = records.map(r=>{
      const c = r.cellValuesByFieldId || r.fields || {};
      const randIso = cellText(c[F.rand]) || r.createdTime || '';
      return { pid: cellText(c[F.pid]), site: cellText(c[F.site]), country: cellText(c[F.country]), arm: armOf(c),
        rand: randIso ? new Date(randIso) : null, status: cellText(c[F.status]), next: parseDMY(cellText(c[F.next])),
        visits: MV.map(([m,est,act])=>{ const a = parseDMY(cellText(c[act])); const e = parseDMY(cellText(c[est])); const d = a || e; return d ? {m, date:d, kind: a ? (a < startOfToday() ? 'done' : 'booked') : 'est'} : null; }).filter(Boolean) };
    });
    AT.bySite = {};
    let as=0, crt=0;
    AT.rows.forEach(r=>{ const k=norm(r.site); const b = AT.bySite[k] || (AT.bySite[k]={n:0,as:0,crt:0}); b.n++; if(r.arm==='AS'){b.as++;as++;} if(r.arm==='CRT'){b.crt++;crt++;} });
    AT.loaded = true;
    const total = AT.rows.length;
    $('g-rand').textContent = total;
    $('g-bar').style.width = Math.min(100, total/480*100) + '%'; $('g-meter').setAttribute('aria-valuenow', total);
    const sp = $('g-split'); sp.innerHTML='';
    const a=document.createElement('span'); a.className='a'; a.textContent='Surveillance ' + as; const b=document.createElement('span'); b.className='c'; b.textContent='CRT ' + crt; sp.append(a,b);
    // site filter options
    const sel = $('fu-site'); const cur = sel.value; sel.length = 1;
    [...new Set(AT.rows.map(r=>r.site).filter(Boolean))].sort().forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sel.append(o); });
    sel.value = cur;
    renderSites(); renderFollowUp(); renderCalendar();
  }
  function startOfToday(){ const t = new Date(); t.setHours(0,0,0,0); return t; }

  /* ---------- Site calendars ---------- */
  const cal = { site: null, month: (()=>{ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })() };
  const ymd = (d)=> d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function activeSites(){
    const names = new Map();
    siteDocs.forEach(d=>{ const s=d.data(); if (s.status==='Recruiting') names.set(norm(s.name), s.name); });
    AT.rows.forEach(r=>{ if (r.site && !names.has(norm(r.site))) names.set(norm(r.site), r.site); });
    return [...names.entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  }
  function renderCalendar(){
    const sites = activeSites();
    if (cal.site !== '' && !sites.some(([k])=>k===cal.site)) cal.site = sites.length ? sites[0][0] : '';
    const tabs = $('cal-tabs'); tabs.textContent='';
    const mk = (key, label, count)=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('aria-pressed', String(cal.site===key)); b.textContent=label; const c=document.createElement('span'); c.className='c'; c.textContent=count; b.append(c); b.addEventListener('click', ()=>{ cal.site=key; renderCalendar(); }); tabs.append(b); };
    if (sites.length > 1) mk('', 'All active sites', AT.rows.length);
    sites.forEach(([k,n])=> mk(k, n, AT.rows.filter(r=>norm(r.site)===k).length));
    $('cal-title').textContent = cal.month.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
    const grid = $('cal-grid'); grid.textContent='';
    const agenda = $('cal-agenda'); agenda.textContent='';
    if (!sites.length){
      tabs.innerHTML = '<span class="hint">' + (AT.loaded ? 'No active sites yet. Sites appear here once they are set to Recruiting or randomise their first participant.' : 'Calendars appear once Airtable data loads.') + '</span>';
    }
    // events for this month
    const y = cal.month.getFullYear(), mo = cal.month.getMonth();
    const byDay = {};
    AT.rows.filter(r=> cal.site==='' ? true : norm(r.site)===cal.site).forEach(r=>{
      r.visits.forEach(v=>{ if (v.date.getFullYear()===y && v.date.getMonth()===mo){ (byDay[ymd(v.date)] ||= []).push({r, v}); } });
    });
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{ const h=document.createElement('div'); h.className='dow'; h.textContent=d; grid.append(h); });
    const first = new Date(y, mo, 1); const lead = (first.getDay()+6)%7;
    const start = new Date(y, mo, 1-lead);
    const weeks = Math.ceil((lead + new Date(y, mo+1, 0).getDate())/7);
    const todayKey = ymd(new Date());
    const evEl = (e)=>{ const el=document.createElement('button'); el.type='button'; el.className='ev '+e.v.kind; attachTip(el, e.r, e.v); const dot=document.createElement('i'); dot.className='dot '+(e.r.arm==='AS'?'as':'crt'); el.append(dot, document.createTextNode('PID ' + (e.r.pid||'?') + ' · M' + e.v.m + (cal.site===''&&e.r.site?' · '+e.r.site:''))); el.setAttribute('aria-label', 'PID ' + e.r.pid + ', month ' + e.v.m + ' follow-up, ' + (e.v.kind==='est'?'estimated':e.v.kind==='booked'?'date entered':'past entered date') + (e.r.site?', '+e.r.site:'')); return el; };
    for (let i=0;i<weeks*7;i++){
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate()+i);
      const cell=document.createElement('div'); cell.className='day' + (d.getMonth()!==mo?' out':'') + (ymd(d)===todayKey?' today':'');
      const dn=document.createElement('span'); dn.className='dn num'; dn.textContent=d.getDate(); cell.append(dn);
      const evs = d.getMonth()===mo ? (byDay[ymd(d)]||[]) : [];
      evs.slice(0,3).forEach(e=>cell.append(evEl(e)));
      if (evs.length>3){ const m=document.createElement('div'); m.className='more'; m.textContent='+'+(evs.length-3)+' more'; cell.append(m); }
      grid.append(cell);
    }
    const keys = Object.keys(byDay).sort();
    if (!keys.length){ const p=document.createElement('div'); p.className='hint'; p.textContent='No follow-up visits this month.'; agenda.append(p); }
    keys.forEach(k=> byDay[k].forEach(e=>{ const row=document.createElement('div'); row.className='ag'; const b=document.createElement('b'); b.className='num'; b.textContent=fmt(e.v.date).slice(0,6); row.append(b, evEl(e)); agenda.append(row); }));
  }
  $('cal-prev').addEventListener('click', ()=>{ cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth()-1, 1); renderCalendar(); });
  $('cal-next').addEventListener('click', ()=>{ cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth()+1, 1); renderCalendar(); });
  $('cal-today').addEventListener('click', ()=>{ const d=new Date(); cal.month = new Date(d.getFullYear(), d.getMonth(), 1); renderCalendar(); });
  renderCalendar();
  function renderFollowUp(){
    const body = $('fu-body'); body.textContent='';
    const today = new Date(); today.setHours(0,0,0,0);
    const site = $('fu-site').value, arm = $('fu-arm').value, q = $('fu-q').value.trim();
    const rows = AT.rows.filter(r=> (!site || r.site===site) && (!arm || r.arm===arm) && (!q || r.pid===q || r.pid.includes(q)))
      .sort((x,y)=> (x.next?x.next:Infinity) - (y.next?y.next:Infinity));
    const days = (d)=> Math.round((d - today)/86400000);
    const in14 = AT.rows.filter(r=>r.next && days(r.next)>=0 && days(r.next)<=14).length;
    const in30 = AT.rows.filter(r=>r.next && days(r.next)>=0 && days(r.next)<=30).length;
    const ch = $('fu-chips'); ch.innerHTML='';
    [[AT.rows.length,'participants'],[in14,'visits in the next 14 days'],[in30,'in the next 30 days']].forEach(([n,t])=>{ const d=document.createElement('div'); const s=document.createElement('strong'); s.className='num'; s.textContent=n; d.append(s, document.createTextNode(t)); ch.append(d); });
    if (!rows.length){ body.innerHTML='<tr><td colspan="7" class="hint">No participants match these filters.</td></tr>'; return; }
    rows.forEach(r=>{
      const tr=document.createElement('tr');
      const dd = r.next ? days(r.next) : null;
      if (dd!==null && dd<=14) tr.className='soon';
      const add=(text, cls)=>{ const td=document.createElement('td'); if (cls) td.className=cls; if (text instanceof Node) td.append(text); else td.textContent=text; tr.append(td); };
      add(r.pid || '–', 'num'); tr.lastChild.style.fontWeight='600';
      add(r.site || '–');
      const p=document.createElement('span'); p.className='pill ' + (r.arm==='AS'?'p-as':r.arm==='CRT'?'p-crt':'p-neutral'); p.textContent = r.arm==='AS'?'Surveillance':r.arm==='CRT'?'CRT':'–'; add(p);
      add(r.rand ? fmt(r.rand) : '–', 'num');
      add(r.status || '–');
      if (r.next){ const nv = nextVisit(r); const w=document.createElement('span'); w.style.cssText='display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap'; w.append(document.createTextNode(fmt(r.next))); if (nv){ const b=document.createElement('button'); b.type='button'; b.className='vbtn'; b.textContent='M'+nv.m; b.setAttribute('aria-label','Month '+nv.m+' visit: show assessments'); attachTip(b, r, nv); w.append(b); } add(w,'num'); } else add('–','num');
      add(dd===null ? '–' : dd<0 ? Math.abs(dd)+' d ago' : dd===0 ? 'today' : dd+' d', 'num');
      body.append(tr);
    });
  }
  /* ---------- Visit schedule + tooltips ---------- */
  const ITEMS = [
    ['exam','Clinical examination','CRF 7.1'],['cea','CEA','CRF 7.1'],['labs','Blood tests','CRF 7.1'],['recto','Rectoscopy','CRF 7.1'],['colo','Colonoscopy','CRF 7.1'],
    ['mri','Pelvic MRI','CRF 7.1'],['pct','Pelvic CT','CRF 7.1'],['ct','CT thorax / abdomen','CRF 7.1'],
    ['lars','LARS questionnaire','CRF 7.4'],['qol','EORTC QLQ-C30 + CR29','CRF 7.2, 7.3'],['tox','CRT toxicity (CTCAE)','CRF 6.2']
  ];
  const B3=['exam','cea','recto'], B6=['exam','cea','recto','mri'];
  const SCHED = {
    AS: { 3:B3, 6:B6, 9:B3, 12:['exam','cea','colo','mri','ct','lars','qol'], 15:B3, 18:B6, 21:B3, 24:['exam','cea','recto','mri','ct','lars'], 30:B6, 36:['exam','cea','recto','mri','ct','lars','qol'], 42:B6, 48:['exam','cea','colo','mri','ct','lars'], 54:B6, 60:['exam','cea','recto','mri','ct','lars','qol'] },
    CRT:{ post:['exam','labs','cea','recto','mri','tox'], 3:['tox'], 6:B6, 12:['exam','cea','colo','mri','ct','lars','qol'], 18:B6, 24:['exam','cea','recto','mri','ct','lars'], 30:B6, 36:['exam','cea','recto','mri','ct','lars','qol','tox'], 42:['exam','cea','recto','pct'], 48:['exam','cea','colo','pct','ct','lars'], 54:['exam','cea','recto','pct'], 60:['exam','cea','recto','pct','ct','lars','qol'] }
  };
  let schArm = 'AS';
  function renderSchedule(){
    document.querySelectorAll('#sch-switch button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.arm===schArm)));
    const sch = SCHED[schArm]; const cols = Object.keys(sch).sort((a,b)=> (a==='post'?0.5:+a) - (b==='post'?0.5:+b));
    const used = ITEMS.filter(it=> cols.some(c=>sch[c].includes(it[0])));
    const t = $('sch-table'); t.textContent='';
    const thead=document.createElement('thead'); const hr=document.createElement('tr');
    const h0=document.createElement('th'); h0.textContent='Assessment'; hr.append(h0);
    const h1=document.createElement('th'); h1.textContent='CRF'; hr.append(h1);
    cols.forEach(c=>{ const th=document.createElement('th'); th.textContent = c==='post' ? 'Post-CRT +1 mo' : 'M'+c; th.className='num'; hr.append(th); });
    thead.append(hr); t.append(thead);
    const tb=document.createElement('tbody');
    used.forEach(([k,label,crf])=>{
      const tr=document.createElement('tr'); const td=document.createElement('td'); td.textContent=label; tr.append(td);
      const tc=document.createElement('td'); tc.className='crf'; tc.textContent=crf; tr.append(tc);
      cols.forEach(c=>{ const d=document.createElement('td'); if (sch[c].includes(k)){ d.className='y'; d.setAttribute('aria-label','yes'); } else { d.className='blank'; d.textContent='·'; d.setAttribute('aria-label','no'); } tr.append(d); });
      tb.append(tr);
    });
    t.append(tb);
  }
  document.querySelectorAll('#sch-switch button').forEach(b=>b.addEventListener('click', ()=>{ schArm=b.dataset.arm; renderSchedule(); }));
  renderSchedule();

  function nextVisit(r){
    const t0 = startOfToday();
    const vs = (r.visits||[]).slice().sort((a,b)=>a.date-b.date);
    if (r.next){ const same = vs.find(v=> ymd(v.date)===ymd(r.next)); if (same) return same; }
    return vs.find(v=> v.date >= t0) || null;
  }
  const tip = $('tip'); let tipFor = null;
  function showTip(el, r, v){
    const arm = r.arm || '';
    const list = (SCHED[arm]||{})[v.m];
    tip.textContent='';
    const b=document.createElement('b'); b.textContent = 'PID ' + (r.pid||'?') + ' · Month ' + v.m;
    const sub=document.createElement('span'); sub.className='sub'; sub.textContent = (arm==='AS'?'Active surveillance':arm==='CRT'?'Chemoradiotherapy':'Arm unknown') + ' · ' + fmt(v.date) + ' · ' + (v.kind==='est'?'estimated':v.kind==='booked'?'date entered':'past entered date') + (r.site?' · '+r.site:'');
    tip.append(b, sub);
    if (list){
      const ul=document.createElement('ul');
      list.forEach(k=>{ const it=ITEMS.find(x=>x[0]===k); const li=document.createElement('li'); const n=document.createElement('span'); n.textContent=it[1]; const c=document.createElement('i'); c.textContent=it[2]; li.append(n,c); ul.append(li); });
      tip.append(ul);
    } else {
      const p=document.createElement('span'); p.textContent = arm ? 'Not a scheduled visit for this arm in the protocol. Check the date in Airtable.' : 'Arm not available, so the assessments cannot be shown.'; tip.append(p);
    }
    tip.hidden=false; tipFor=el;
    const r0 = el.getBoundingClientRect(); const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(Math.max(8, r0.left), window.innerWidth - tw - 8);
    let y = r0.bottom + 8; if (y + th > window.innerHeight - 8) y = Math.max(8, r0.top - th - 8);
    tip.style.left = x+'px'; tip.style.top = y+'px';
    el.setAttribute('aria-describedby','tip');
  }
  function hideTip(){ tip.hidden=true; if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor=null; }
  function attachTip(el, r, v){
    el.addEventListener('mouseenter', ()=>showTip(el,r,v));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', ()=>showTip(el,r,v));
    el.addEventListener('blur', hideTip);
    el.addEventListener('click', (e)=>{ e.stopPropagation(); if (tipFor===el && !tip.hidden) hideTip(); else showTip(el,r,v); });
  }
  document.addEventListener('click', hideTip);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, {passive:true});

  ['fu-site','fu-arm'].forEach(id=>$(id).addEventListener('change', renderFollowUp));
  $('fu-q').addEventListener('input', renderFollowUp);

  /* ---------- Start: data baked in by the hourly build ---------- */
  const AR = window.TREX_AT || { records: [], fetchedAt: null };
  ingest(AR.records || []);
  const fmtT = (d)=> d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  if (AR.fetchedAt){
    const t = new Date(AR.fetchedAt);
    $('fu-state').textContent = 'Updated ' + fmtT(t);
    $('g-note').textContent = 'From Airtable · updated ' + fmtT(t);
  } else { $('fu-state').textContent = 'No data yet'; $('fu-state').className='pill p-neutral'; $('g-note').textContent = 'Waiting for the first automatic update.'; }
  $('fu-foot').textContent = 'Record visits in Airtable (M… FUP date fields). This page is rebuilt automatically every hour.';
  $('f-upd').textContent = D.updated ? fmt(new Date(D.updated)) : '';
})();
