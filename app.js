/* T-REX Trial Hub — page logic. Runs after sign-in with the decrypted package for one country (or all). */
window.TREX_START = function(PKG){
  const $ = (id) => document.getElementById(id);
  const fmt = (d) => d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const D = PKG.content || {};
  const L = D.links || {};
  const WHO = PKG.who || 'all';
  const ALLV = WHO === 'all';
  $('who-name').textContent = ALLV ? 'All countries' : WHO;
  function formEmbed(u){ const m=/^https:\/\/airtable\.com\/(?:embed\/)?(app[A-Za-z0-9]+\/(?:pag|shr)[A-Za-z0-9]+(?:\/form)?)/.exec(u||''); return m ? 'https://airtable.com/embed/'+m[1] : ''; }
  function openForm(url, title, prefill){
    const dlg=$('formdlg'); const eu=formEmbed(url);
    $('formdlg-title').textContent=title;
    const fr=$('formdlg-frame'), msg=$('formdlg-msg');
    if (!eu){ fr.hidden=true; msg.hidden=false; msg.textContent='The form is being set up. Until then, send the details to the coordinating team' + (L.coordEmail ? ' ('+L.coordEmail+')' : '') + '.'; }
    else { let u=eu+'?backgroundColor=teal'; Object.entries(prefill||{}).forEach(([k,v])=>{ u+='&prefill_'+encodeURIComponent(k)+'='+encodeURIComponent(v)+'&hide_'+encodeURIComponent(k)+'=true'; }); fr.hidden=false; msg.hidden=true; fr.src=u; }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
  }
  $('formdlg-close').addEventListener('click', ()=>{ $('formdlg').close(); $('formdlg-frame').src='about:blank'; });

  /* ---------- Tabs ---------- */
  const PANELS = ['overview','visits','instructions','documents','contacts'];
  function showTab(id, focus){
    if (!PANELS.includes(id)) id = 'overview';
    PANELS.forEach(p=>{ $(p).hidden = p!==id; const t=$('tab-'+p); t.setAttribute('aria-selected', String(p===id)); t.tabIndex = p===id ? 0 : -1; });
    try { localStorage.setItem('trex-tab', id); } catch(_){}
    if (focus) window.scrollTo({top:0});
  }
  PANELS.forEach(p=> $('tab-'+p).addEventListener('click', (e)=>{ e.preventDefault(); showTab(p, true); try{ history.replaceState(null,'','#'+p); }catch(_){} }));
  const ALIAS = { coordinators:'instructions', followup:'visits', calendars:'visits', team:'contacts', docs:'documents' };
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
      if ((m = /^!\[([^\]]*)\]\((data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\/=]+|https:\/\/[^)\s]+)\)$/.exec(line))){ close(); const fg=document.createElement('figure'); fg.className='gimg'; const im=document.createElement('img'); im.src=m[2]; im.alt=m[1]; im.loading='lazy'; fg.append(im); if (m[1]){ const fc=document.createElement('figcaption'); fc.textContent=m[1]; fg.append(fc); } body.append(fg); return; }
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
    {k:'protocol', label:'Protocol v1.2'},
    {k:'isf', label:'Investigator Site File templates'},
    {k:'brand', label:'Logo files and slide templates'}
  ];
  const q = $('quicklinks');
  [['edc','Ledidi'],['protocol','Protocol'],['drive','Shared folder'],['form','Randomisation form']].forEach(([k,t])=>{
    if (!L[k]) return;
    const a=document.createElement('a'); a.className='qbtn'; a.href=L[k]; a.target='_blank'; a.rel='noopener'; a.textContent=t+' ↗'; q.append(a);
  });
  const LGROUPS = [
    ['Daily work', [['edc','Ledidi eCRF','personal account'],['form','Randomisation form','Airtable']]],
    ['Documents', [['protocol','Protocol','v1.2'],['drive','T-REX shared folder','OneDrive'],['isf','Investigator Site File','templates']]],
    ['Identity', [['brand','Logo and slide templates','T-REX visual identity']]]
  ];
  const lg = $('link-groups');
  LGROUPS.forEach(([title, items])=>{
    const box=document.createElement('div'); box.className='lgroup';
    const h=document.createElement('h3'); h.textContent=title; box.append(h);
    items.forEach(([k,label,sub])=>{
      const el=document.createElement('a'); el.className='lnk'+(L[k]?'':' off');
      if (L[k]){ el.href=L[k]; el.target='_blank'; el.rel='noopener'; } else { el.setAttribute('aria-disabled','true'); }
      const t1=document.createElement('div'); t1.textContent=label; const s=document.createElement('span'); s.textContent = L[k] ? sub : 'link coming soon'; t1.append(document.createElement('br'), s);
      const ar=document.createElement('b'); ar.textContent = L[k] ? '↗' : '';
      el.append(t1, ar); box.append(el);
    });
    lg.append(box);
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
  const ALLSITES = (D.sites||[]).map(x=>({ id:x.name, data:()=>x }));
  let siteDocs = ALLV ? ALLSITES : ALLSITES.filter(d=>d.data().country===WHO);
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
    $('g-sites').textContent = ALLSITES.filter(d=>d.data().status==='Recruiting').length;
    renderRecruited();
    renderMap();
    if (typeof renderCalendar==='function' && typeof cal!=='undefined') renderCalendar();
  }

  /* ---------- Map ---------- */
  function renderMap(){
    const P = window.TREX_PROJ; const g = $('map-pins'); if (!P || !g) return;
    const NS='http://www.w3.org/2000/svg'; g.textContent='';
    const xy = (lon,lat)=>{ const l=lon*Math.PI/180, f=lat*Math.PI/180; return [P.scale*l + P.translate[0], -P.scale*Math.log(Math.tan(Math.PI/4+f/2)) + P.translate[1]]; };
    const LEFT = new Set(['Ghent','Limoges','Barcelona','Basel','Paris','Nantes']);
    ALLSITES.map(d=>d.data()).filter(s=>typeof s.lat==='number').sort((a,b)=> (a.status==='Recruiting') - (b.status==='Recruiting')).forEach(s=>{
      const [x,y]=xy(s.lon,s.lat); const on = s.status==='Recruiting';
      const cnt = (typeof AT!=='undefined' && AT.bySite && AT.bySite[norm(s.name)]) ? AT.bySite[norm(s.name)].n : 0;
      const grp=document.createElementNS(NS,'g'); grp.setAttribute('class','site'); grp.setAttribute('tabindex','0');
      grp.setAttribute('aria-label', s.name+', '+(s.country||'')+': '+(s.status||'To confirm')+', '+cnt+' randomised');
      const tt=document.createElementNS(NS,'title'); tt.textContent = s.name+' ('+(s.country||'')+') · '+(s.status||'To confirm')+' · '+cnt+' randomised' + (s.lead ? ' · Lead: '+s.lead : ''); grp.append(tt);
      if (on){ const h=document.createElementNS(NS,'circle'); h.setAttribute('class','halo'); h.setAttribute('cx',x); h.setAttribute('cy',y); h.setAttribute('r',18); grp.append(h); }
      const c=document.createElementNS(NS,'circle'); c.setAttribute('class','pinc'+(on?' on':'')); c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r',8); grp.append(c);
      const left = LEFT.has(s.name);
      const lb=document.createElementNS(NS,'text'); lb.setAttribute('class','plbl'); lb.setAttribute('x', left ? x-14 : x+14); lb.setAttribute('y', y+5); lb.setAttribute('text-anchor', left?'end':'start'); lb.textContent=s.name; grp.append(lb);
      if (on){ const ct=document.createElementNS(NS,'text'); ct.setAttribute('class','pcount'); ct.setAttribute('x', left ? x-14 : x+14); ct.setAttribute('y', y+21); ct.setAttribute('text-anchor', left?'end':'start'); ct.textContent = cnt+' randomised'; grp.append(ct); }
      g.append(grp);
    });
  }

  /* ---------- Team ---------- */
  const RTYPES = { lead:['Trial leadership','r-lead','e-lead'], inv:['Site PI / investigator','r-inv','e-inv'], coord:['Coordinator / study staff','r-coord','e-coord'], admin:['Administration','r-pm','e-pm'], data:['Data & statistics','r-data','e-data'], pm:['ECOPOP project management','r-blue2','e-blue2'] };
  const leg = $('role-legend');
  Object.values(RTYPES).forEach(([lbl,cls])=>{ const c=document.createElement('span'); c.className='rchip '+cls; c.textContent=lbl; leg.append(c); });
  function person(r, compact){
    const t = RTYPES[r.type] || RTYPES.inv;
    const p=document.createElement('div'); p.className='person2 '+t[2];
    const nm=document.createElement('div'); nm.className='nm'; nm.textContent=[r.first,r.last].filter(Boolean).join(' ');
    const rl=document.createElement('div'); rl.className='rl';
    const chip=document.createElement('span'); chip.className='rchip '+t[1]; chip.textContent=r.role||t[0]; rl.append(chip);
    if (r.sitePI && !compact){ const c2=document.createElement('span'); c2.className='rchip r-inv'; c2.textContent='Site PI · '+r.sitePI; rl.append(c2); }
    if (!compact && r.site){ const s=document.createElement('span'); s.textContent=r.site; rl.append(s); }
    p.append(nm, rl);
    if (r.email){ const a=document.createElement('a'); a.href='mailto:'+r.email; a.textContent=r.email; p.append(a); }
    if (r.phone){ const a=document.createElement('a'); a.href='tel:'+r.phone.replace(/[^+\d]/g,''); a.textContent=r.phone; p.append(a); }
    return p;
  }
  const byLast = (x,y)=> String(x.last).localeCompare(String(y.last),'en',{sensitivity:'base'});
  const TEAM = (D.team||[]).slice();
  const RTYPE_OF = { 'Site PI':'inv', 'Local co-PI':'inv', 'Investigator':'inv', 'Site coordinator':'coord', 'Study nurse':'coord', 'Data manager':'coord', 'Administration':'admin', 'Other':'coord' };
  (D.teamAdded||[]).forEach(m=>{ const parts=m.name.split(/\s+/); TEAM.push({ first: parts.slice(0,-1).join(' ') || m.name, last: parts.length>1 ? parts[parts.length-1] : '', role: m.role || 'Team member', site: m.site || 'Other', email: m.email, phone: m.phone, type: RTYPE_OF[m.role] || 'coord' }); });
  const tg = $('team-groups');
  function group(title, sub, node){ const g=document.createElement('div'); g.className='tgroup'; const h=document.createElement('h3'); h.textContent=title; if (sub){ const s=document.createElement('small'); s.textContent=sub; h.append(s); } g.append(h, node); tg.append(g); }
  // leadership
  const leadGrid=document.createElement('div'); leadGrid.className='pgrid';
  const ORDER = { 'Principal investigator':0, 'Co-principal investigator':1, 'Study coordinator':2 };
  TEAM.filter(r=>r.type==='lead').sort((x,y)=>(ORDER[x.role]??9)-(ORDER[y.role]??9) || byLast(x,y)).forEach(r=>leadGrid.append(person(r)));
  group('Trial leadership', 'principal investigators and the coordinating team', leadGrid);
  // sites
  const siteGrid=document.createElement('div'); siteGrid.className='sitegrid';
  const sitesMap = {};
  TEAM.filter(r=>r.type==='inv'||r.type==='coord'||r.type==='admin').forEach(r=>{ (sitesMap[r.site||'Other'] ||= []).push(r); });
  TEAM.filter(r=>r.type==='lead' && r.sitePI).forEach(r=>{ (sitesMap[r.sitePI] ||= []).push(Object.assign({}, r, {type:'inv', role:'Site PI', _lead:r.role})); });
  (D.sites||[]).forEach(s=>{ const nz=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); const k=Object.keys(sitesMap).find(x=>nz(x)===nz(s.name)); if (!k) sitesMap[s.name]=[]; });
  const RANK = { inv:0, coord:1, admin:2 };
  Object.keys(sitesMap).sort().forEach(site=>{
    const c=document.createElement('div'); c.className='sitecard';
    const hd=document.createElement('header'); const b=document.createElement('b'); b.textContent=site; const sp=document.createElement('span');
    const nrm=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); const ctry = (D.sites||[]).find(s=>nrm(s.name)===nrm(site.split(' (')[0])); sp.textContent = ctry ? ctry.country : (sitesMap[site][0].country||'');
    hd.append(b, sp); c.append(hd);
    const RO={'Site PI':0,'Local co-PI':1,'Investigator':2}; sitesMap[site].sort((x,y)=> (RANK[x.type]-RANK[y.type]) || ((RO[x.role]??5)-(RO[y.role]??5)) || byLast(x,y)).forEach(r=>c.append(person(r,true)));
    if (!sitesMap[site].length){ const e=document.createElement('div'); e.className='tempty'; e.textContent='No team members listed yet.'; c.append(e); }
    const add=document.createElement('button'); add.type='button'; add.className='btn ghost small addm'; add.textContent='+ Add team member'; add.addEventListener('click', ()=>openForm(L.teamForm, 'Add a team member · '+site, {Site: site})); c.append(add);
    siteGrid.append(c);
  });
  group('Site teams', 'site PIs, investigators, coordinators and administration per centre', siteGrid);
  // data + project management
  const dGrid=document.createElement('div'); dGrid.className='pgrid'; TEAM.filter(r=>r.type==='data').sort(byLast).forEach(r=>dGrid.append(person(r)));
  if (dGrid.children.length) group('Data & statistics', '', dGrid);
  const pGrid=document.createElement('div'); pGrid.className='pgrid'; TEAM.filter(r=>r.type==='pm').sort(byLast).forEach(r=>pGrid.append(person(r)));
  if (pGrid.children.length) group('ECOPOP project management', 'Horizon Europe consortium', pGrid);

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
      return { pid: cellText(c[F.pid]), site: cellText(c[F.site]), country: r.country || cellText(c[F.country]), arm: armOf(c),
        rand: randIso ? new Date(randIso) : null, status: cellText(c[F.status]), next: parseDMY(cellText(c[F.next])),
        visits: MV.map(([m,est,act])=>{ const a = parseDMY(cellText(c[act])); const e = parseDMY(cellText(c[est])); const d = a || e; return d ? {m, key:'M'+m, label:'M'+m, date:d, kind: a ? (a < startOfToday() ? 'done' : 'booked') : 'est', types:['FUP with physician'], time:'', other:''} : null; }).filter(Boolean) };
    });
    AT.rows.forEach(r=>{ r.base = r.visits.map(v=>Object.assign({}, v)); r.baseNext = r.next; });
    applyBookings();
    AT.bySite = {};
    let as=0, crt=0, total=0;
    const TOT = (PKG.at && PKG.at.totals) || null;
    if (TOT){ Object.entries(TOT).forEach(([k,b])=>{ AT.bySite[k]=b; total+=b.n; as+=b.as; crt+=b.crt; }); }
    else { AT.rows.forEach(r=>{ const k=norm(r.site); const b = AT.bySite[k] || (AT.bySite[k]={n:0,as:0,crt:0}); b.n++; total++; if(r.arm==='AS'){b.as++;as++;} if(r.arm==='CRT'){b.crt++;crt++;} }); }
    AT.loaded = true;
    if (!ALLV){ const m=$('g-mine'); m.hidden=false; m.textContent = WHO + ': ' + AT.rows.length + ' randomised (' + AT.rows.filter(r=>r.arm==='AS').length + ' surveillance · ' + AT.rows.filter(r=>r.arm==='CRT').length + ' CRT)'; }
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

  /* ---------- Booked visits (Airtable "Visits" table + this browser's just-saved bookings) ---------- */
  const PKEY = 'trex-pending-visits';
  const loadPending = ()=>{ try { return JSON.parse(localStorage.getItem(PKEY)||'[]'); } catch(_){ return []; } };
  const savePending = (a)=>{ try { localStorage.setItem(PKEY, JSON.stringify(a)); } catch(_){} };
  function applyBookings(){
    const fetched = (PKG.at && PKG.at.fetchedAt) ? Date.parse(PKG.at.fetchedAt) : 0;
    const pend = loadPending().filter(x=> x.ts > fetched); savePending(pend);
    const list = [...(((PKG.at||{}).visits)||[]).map(v=>Object.assign({ts: Date.parse(v.created)||0}, v)), ...pend.map(x=>Object.assign({}, x, {pending:true}))].sort((a,b)=>a.ts-b.ts);
    const t0 = startOfToday();
    AT.rows.forEach(r=>{ r.visits = r.base.map(v=>Object.assign({}, v)); r.next = r.baseNext; r.touched = false; });
    const latest = new Map();
    list.forEach(b=>{ const k = String(b.pid).trim() + '|' + (/^M\d+$/.test(b.visit||'') ? b.visit : 'X|' + (b.id || b.ts)); latest.set(k, b); });
    latest.forEach(b=>{
      const r = AT.rows.find(x=> String(x.pid).trim()===String(b.pid).trim()); if (!r) return;
      const d = parseDMY(b.date); if (!d) return;
      const mm = /^M(\d+)$/.exec(b.visit||'');
      r.touched = true;
      if (b.status==='Cancelled') return;
      const info = { date:d, kind: d < t0 ? 'done' : 'booked', types: (b.types&&b.types.length) ? b.types : ['FUP with physician'], time: b.time||'', other: b.other||'', pending: !!b.pending, booked: true };
      if (mm){ const m=+mm[1]; let v = r.visits.find(x=>x.m===m); if (!v){ v = {m, key:'M'+m, label:'M'+m}; r.visits.push(v); } Object.assign(v, info); }
      else r.visits.push(Object.assign({m:null, key:'X|'+(b.id||b.ts), label:'Additional visit', extra:true}, info, {types: b.types||[]}));
    });
    AT.rows.forEach(r=>{ if (r.touched){ const fut = r.visits.filter(v=>v.date>=t0).sort((a,b)=>a.date-b.date)[0]; r.next = fut ? fut.date : r.baseNext; } });
  }
  const typeShort = (v)=> (v.types||[]).filter(t=>t!=='FUP with physician').map(t=> t==='Other' && v.other ? v.other : t).join(', ');
  const vLabel = (v)=> v.m!=null ? 'M'+v.m : (typeShort(v) || 'Visit');

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
    const evEl = (e)=>{ const el=document.createElement('button'); el.type='button'; el.className='ev '+e.v.kind+(e.v.pending?' pend':''); attachTip(el, e.r, e.v, ()=>openBooking(e.r, e.v)); const dot=document.createElement('i'); dot.className='dot '+(e.r.arm==='AS'?'as':'crt'); el.append(dot, document.createTextNode('PID ' + (e.r.pid||'?') + ' · ' + vLabel(e.v) + (e.v.time?' '+e.v.time:'') + (cal.site===''&&e.r.site?' · '+e.r.site:''))); el.setAttribute('aria-label', 'PID ' + e.r.pid + ', ' + (e.v.m!=null?'month '+e.v.m+' follow-up':'additional visit') + ', ' + (e.v.kind==='est'?'estimated date':e.v.kind==='booked'?'booked':'past visit') + (e.r.site?', '+e.r.site:'') + '. Press to book or change.');
      if (e.v.kind!=='done'){ el.draggable = true; el.addEventListener('dragstart', (ev)=>{ hideTip(); DRAG = e; ev.dataTransfer.effectAllowed='move'; try{ ev.dataTransfer.setData('text/plain', e.r.pid+'|'+e.v.key); }catch(_){} el.classList.add('dragging'); }); el.addEventListener('dragend', ()=>{ el.classList.remove('dragging'); document.querySelectorAll('.day.drop').forEach(x=>x.classList.remove('drop')); }); }
      return el; };
    for (let i=0;i<weeks*7;i++){
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate()+i);
      const cell=document.createElement('div'); cell.className='day' + (d.getMonth()!==mo?' out':'') + (ymd(d)===todayKey?' today':'');
      const dk = ymd(d);
      cell.addEventListener('dragover', (ev)=>{ if (!DRAG) return; ev.preventDefault(); ev.dataTransfer.dropEffect='move'; cell.classList.add('drop'); });
      cell.addEventListener('dragleave', ()=> cell.classList.remove('drop'));
      cell.addEventListener('drop', (ev)=>{ ev.preventDefault(); cell.classList.remove('drop'); const e = DRAG; DRAG = null; if (e && dk!==ymd(e.v.date)) openBooking(e.r, e.v, dk); });
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
  let DRAG = null;
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
    if (!rows.length){ body.innerHTML='<tr><td colspan="8" class="hint">No participants match these filters.</td></tr>'; return; }
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
      if (r.next){ const nv = nextVisit(r); const w=document.createElement('span'); w.style.cssText='display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap'; w.append(document.createTextNode(fmt(r.next))); if (nv){ const b=document.createElement('button'); b.type='button'; b.className='vbtn'; b.textContent='M'+nv.m; b.textContent=vLabel(nv); b.setAttribute('aria-label', vLabel(nv)+' visit: book or change the date'); attachTip(b, r, nv, ()=>openBooking(r, nv)); w.append(b); const st=document.createElement('span'); st.className='bk '+(nv.kind==='est'?'est':'ok'); st.textContent = nv.kind==='est' ? 'estimated' : nv.pending ? 'booked · syncing' : 'booked'; w.append(st); } add(w,'num'); } else add('–','num');
      add(dd===null ? '–' : dd<0 ? Math.abs(dd)+' d ago' : dd===0 ? 'today' : dd+' d', 'num');
      const nv2 = r.next ? nextVisit(r) : null;
      const comp=document.createElement('div'); comp.className='comp';
      const list = nv2 ? (nv2.m!=null ? ((SCHED[r.arm]||{})[nv2.m] || null) : null) : null;
      if (list){ list.forEach(k=>{ const it=ITEMS.find(x=>x[0]===k); const s=document.createElement('span'); s.textContent=SHORT[k]||it[1]; if (['colo','mri','pct','ct','lars','qol','tox'].includes(k)) s.className='k'; comp.append(s); }); }
      else comp.textContent = nv2 ? (nv2.m==null ? (typeShort(nv2)||'Additional visit') : 'Not in protocol schedule') : '–';
      add(comp);
      if (nv2){ attachTip(tr, r, nv2, ()=>openBooking(r, nv2)); tr.tabIndex = 0; tr.addEventListener('keydown', (ev)=>{ if (ev.key==='Enter' && ev.target===tr) openBooking(r, nv2); }); }
      else { tr.style.cursor='pointer'; tr.addEventListener('click', ()=>openBooking(r, null)); }
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
  const SHORT = { exam:'Exam', cea:'CEA', labs:'Labs', recto:'Rectoscopy', colo:'Colonoscopy', mri:'Pelvic MRI', pct:'Pelvic CT', ct:'CT thorax/abd.', lars:'LARS', qol:'QoL', tox:'CRT toxicity' };
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
    tipArgs=[el,r,v];
    const arm = r.arm || '';
    const list = v.m!=null ? (SCHED[arm]||{})[v.m] : null;
    tip.textContent='';
    const b=document.createElement('b'); b.textContent = 'PID ' + (r.pid||'?') + ' · ' + (v.m!=null ? 'Month ' + v.m : 'Additional visit');
    const sub=document.createElement('span'); sub.className='sub'; sub.textContent = (arm==='AS'?'Active surveillance':arm==='CRT'?'Chemoradiotherapy':'Arm unknown') + ' · ' + fmt(v.date) + (v.time?' '+v.time:'') + ' · ' + (v.kind==='est'?'estimated, not booked':v.kind==='booked'?(v.pending?'booked (syncing)':'booked'):'past visit') + (r.site?' · '+r.site:'');
    tip.append(b, sub);
    const ty=document.createElement('span'); ty.className='sub'; ty.textContent = 'Visit: ' + ((v.types||[]).map(t=> t==='Other' && v.other ? 'Other ('+v.other+')' : t).join(', ') || 'FUP with physician'); tip.append(ty);
    if (list){ const h=document.createElement('span'); h.className='sub'; h.style.marginTop='4px'; h.textContent='Before or on the day of the visit:'; tip.append(h); }
    if (v.m==null){ const p=document.createElement('span'); p.textContent='Click to change or open the booking.'; tip.append(p); }
    else if (list){
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
  function attachTip(el, r, v, onOpen){
    el.addEventListener('mouseenter', ()=>showTip(el,r,v));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', ()=>showTip(el,r,v));
    el.addEventListener('blur', hideTip);
    el.addEventListener('click', (e)=>{ e.stopPropagation(); hideTip(); if (onOpen) onOpen(); else showTip(el,r,v); });
  }

  /* ---------- Booking dialog ---------- */
  const VTYPES = ['FUP with physician','MRI','CT','Labs','Rectoscopy','Colonoscopy','Other'];
  const bk = { r:null, v:null, draft:null };
  const siteName = (raw)=>{ const s=(D.sites||[]).find(x=>norm(x.name)===norm(raw)); return s ? s.name : (raw||''); };
  (function(){ const box=$('bk-types'); VTYPES.forEach(t=>{ const l=document.createElement('label'); l.className='chkrow'; const i=document.createElement('input'); i.type='checkbox'; i.value=t; i.addEventListener('change', ()=>{ $('bk-other-box').hidden = !box.querySelector('input[value="Other"]').checked; }); l.append(i, document.createTextNode(' '+t)); box.append(l); }); })();
  function visitOptions(r){
    const sel=$('bk-visit'); sel.textContent='';
    const ms = new Set(Object.keys((SCHED[r&&r.arm]||SCHED.AS)).filter(k=>k!=='post').map(Number)); (r?r.visits:[]).forEach(v=>{ if (v.m!=null) ms.add(v.m); });
    [...ms].sort((a,b)=>a-b).forEach(m=>{ const o=document.createElement('option'); o.value='M'+m; const v = r && r.visits.find(x=>x.m===m); o.textContent='M'+m + (v ? ' · ' + fmt(v.date) + (v.kind==='est'?' (estimated)':v.kind==='booked'?' (booked)':' (past)') : ''); sel.append(o); });
    const o=document.createElement('option'); o.value='Additional visit'; o.textContent='Additional visit (not in the schedule)'; sel.append(o);
  }
  function fillFromVisit(keepDate){
    const r=bk.r, key=$('bk-visit').value; const mm=/^M(\d+)$/.exec(key);
    const v = r ? (mm ? r.visits.find(x=>x.m===+mm[1]) : (bk.v && bk.v.extra ? bk.v : null)) : null;
    bk.v = v || null;
    if (!keepDate) $('bk-date').value = v ? ymd(v.date) : ymd(new Date());
    $('bk-time').value = v && v.time ? v.time : '';
    const types = v && v.types && v.types.length ? v.types : (mm ? ['FUP with physician'] : []);
    document.querySelectorAll('#bk-types input').forEach(i=> i.checked = types.includes(i.value));
    $('bk-other').value = v && v.other ? v.other : ''; $('bk-other-box').hidden = !types.includes('Other');
    $('bk-cancelb').hidden = !(v && v.booked && v.kind!=='done');
    const t=$('bk-tests'); t.textContent='';
    const list = mm && r ? (SCHED[r.arm]||{})[+mm[1]] : null;
    if (list){ const h=document.createElement('strong'); h.textContent='Tests the patient should have before or on the day of this visit'; t.append(h); const ul=document.createElement('ul'); list.forEach(k=>{ const it=ITEMS.find(x=>x[0]===k); const li=document.createElement('li'); li.textContent=it[1]; const c=document.createElement('i'); c.textContent=' · '+it[2]; li.append(c); ul.append(li); }); t.append(ul); }
    else if (mm && r && !r.arm) t.textContent='Arm not available, so the protocol tests cannot be shown.';
    else if (!mm) t.textContent='Additional visit: choose what it is for (MRI, CT, labs, rectoscopy, colonoscopy, FUP with physician or other).';
    t.hidden = !t.textContent;
    $('bk-title').textContent = r ? 'PID ' + r.pid + ' · ' + (mm ? key + ' follow-up' : 'Additional visit') : 'Add a visit';
    $('bk-sub').textContent = r ? (siteName(r.site) + ' · ' + (r.arm==='AS'?'Active surveillance':r.arm==='CRT'?'Chemoradiotherapy':'arm unknown') + (v ? ' · currently ' + fmt(v.date) + (v.kind==='est'?' (estimated from randomisation)':v.kind==='booked'?' (booked)':'') : '')) : '';
  }
  function openBooking(r, v, date){
    hideTip();
    bk.r = r; bk.v = v || null;
    const ps=$('bk-pid'); ps.textContent='';
    AT.rows.slice().sort((a,b)=>(parseFloat(a.pid)||0)-(parseFloat(b.pid)||0)).forEach(x=>{ const o=document.createElement('option'); o.value=x.pid; o.textContent='PID '+x.pid+(x.site?' · '+x.site:''); ps.append(o); });
    $('bk-pid-box').hidden = !!r;
    if (!r){ if (!AT.rows.length){ toast('No participants yet.'); return; } bk.r = AT.rows.find(x=>x.pid===ps.value) || AT.rows[0]; }
    ps.value = bk.r.pid;
    visitOptions(bk.r);
    $('bk-visit').value = v ? (v.m!=null ? 'M'+v.m : 'Additional visit') : (r ? ((nextVisit(r)||{}).m!=null ? 'M'+nextVisit(r).m : 'Additional visit') : 'Additional visit');
    if (!v && r){ const nv=nextVisit(r); if (nv && nv.m!=null) bk.v=nv; }
    fillFromVisit(false);
    if (date) $('bk-date').value = date;
    $('bk-step1').hidden=false; $('bk-step2').hidden=true; $('bk-frame').src='about:blank';
    $('bkdlg').showModal();
  }
  $('bk-pid').addEventListener('change', ()=>{ bk.r = AT.rows.find(x=>x.pid===$('bk-pid').value); bk.v=null; visitOptions(bk.r); $('bk-visit').value='Additional visit'; fillFromVisit(false); });
  $('bk-visit').addEventListener('change', ()=>fillFromVisit(false));
  function toForm(status){
    const r=bk.r; if (!r) return;
    const date=$('bk-date').value; if (!date){ $('bk-date').focus(); return; }
    const types=[...document.querySelectorAll('#bk-types input:checked')].map(i=>i.value);
    if (!types.length){ toast('Choose at least one visit type.'); return; }
    const visit=$('bk-visit').value;
    bk.draft = { pid:String(r.pid), site:siteName(r.site), visit, date, time:$('bk-time').value, types, other: types.includes('Other') ? $('bk-other').value.trim() : '', status };
    const u = formEmbed(L.visitForm);
    $('bk-step1').hidden=true; $('bk-step2').hidden=false;
    $('bk-step2-title').textContent = status==='Cancelled' ? 'Confirm cancellation' : 'Confirm booking';
    $('bk-summary').textContent = 'PID ' + r.pid + ' · ' + (visit==='Additional visit'?'Additional visit':visit) + ' · ' + fmt(new Date(date+'T12:00:00')) + (bk.draft.time?' '+bk.draft.time:'') + ' · ' + types.map(t=>t==='Other'&&bk.draft.other?'Other ('+bk.draft.other+')':t).join(', ') + (status==='Cancelled'?' · CANCEL':'');
    if (!u){ $('bk-frame').hidden=true; $('bk-nofm').hidden=false; return; }
    $('bk-frame').hidden=false; $('bk-nofm').hidden=true;
    const P = { 'PID':bk.draft.pid, 'Site':bk.draft.site, 'Visit':visit, 'Date':date, 'Time':bk.draft.time, 'Visit type':types.join(','), 'Other (details)':bk.draft.other, 'Status':status };
    let q = '?backgroundColor=teal'; Object.entries(P).forEach(([k,v])=>{ if (v) q += '&prefill_'+encodeURIComponent(k)+'='+encodeURIComponent(v); q += '&hide_'+encodeURIComponent(k)+'=true'; });
    $('bk-frame').src = u + q;
  }
  $('bk-next').addEventListener('click', ()=>toForm('Booked'));
  $('bk-cancelb').addEventListener('click', ()=>toForm('Cancelled'));
  $('bk-back').addEventListener('click', ()=>{ $('bk-step1').hidden=false; $('bk-step2').hidden=true; $('bk-frame').src='about:blank'; });
  $('bk-close').addEventListener('click', ()=>{ $('bkdlg').close(); $('bk-frame').src='about:blank'; });
  window.addEventListener('message', (e)=>{
    if (e.origin!==location.origin || !e.data || e.data.type!=='trex-saved' || !bk.draft) return;
    const p = loadPending(); p.push(Object.assign({}, bk.draft, {ts: Date.now(), id: e.data.record || ('p'+Date.now())})); savePending(p);
    const was = bk.draft.status; bk.draft=null;
    $('bkdlg').close(); $('bk-frame').src='about:blank';
    applyBookings(); renderFollowUp(); renderCalendar(); renderRecruited();
    toast(was==='Cancelled' ? 'Booking cancelled. Everyone sees the change after the next automatic update.' : 'Visit booked. It shows as booked here now; the rest of the team sees it after the next automatic update.');
  });
  function toast(t){ const el=$('toast'); el.textContent=t; el.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(()=>el.hidden=true, 6000); }
  $('fu-add').addEventListener('click', ()=>openBooking(null, null));
  $('cal-add').addEventListener('click', ()=>openBooking(null, null));
  document.addEventListener('click', hideTip);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') hideTip(); });
  let tipArgs=null;
  window.addEventListener('scroll', ()=>{ if (!tip.hidden && tipArgs && tipFor && tipFor.isConnected) showTip(...tipArgs); }, {passive:true});

  ['fu-site','fu-arm'].forEach(id=>$(id).addEventListener('change', renderFollowUp));
  $('fu-q').addEventListener('input', renderFollowUp);

  /* ---------- Recruited participants per site ---------- */
  function renderRecruited(){
    const grid = $('rc-grid'); if (!grid) return; grid.textContent='';
    $('rc-title').textContent = ALLV ? 'Recruited participants' : 'Recruited participants · ' + WHO;
    $('rc-sub').textContent = (ALLV ? 'Every randomised participant per site, all countries.' : 'Every randomised participant at the ' + WHO + ' sites. Other countries\' participants are not shown with this password.') + ' From Airtable, refreshed every hour.';
    const bySite = new Map();
    siteDocs.forEach(d=>{ const s=d.data(); if (!ALLV || s.status==='Recruiting') bySite.set(norm(s.name), {name:s.name, country:s.country, status:s.status, rows:[]}); });
    AT.rows.forEach(r=>{ const k=norm(r.site)||'unknown'; if (!bySite.has(k)) bySite.set(k, {name:r.site||'Site not set', country:r.country, status:'', rows:[]}); bySite.get(k).rows.push(r); });
    const list = [...bySite.values()].sort((a,b)=> String(a.country).localeCompare(String(b.country)) || (b.rows.length-a.rows.length) || a.name.localeCompare(b.name));
    if (!list.length){ grid.innerHTML='<div class="empty" style="grid-column:1/-1">No participants randomised yet.</div>'; return; }
    let lastC = null;
    list.forEach(s=>{
      if (ALLV && s.country!==lastC){ lastC=s.country; const h=document.createElement('div'); h.className='ctryh'; h.textContent=s.country||'Country not set'; grid.append(h); }
      const card=document.createElement('article'); card.className='rsite';
      const hd=document.createElement('header'); const l=document.createElement('div'); const b=document.createElement('b'); b.textContent=s.name; const sm=document.createElement('small'); sm.textContent=(s.country||'')+(s.status?' · '+s.status:''); l.append(b,sm);
      const n=document.createElement('div'); n.className='rcount num'; n.textContent=s.rows.length; const ns=document.createElement('small'); ns.textContent='randomised'; n.append(ns); hd.append(l,n); card.append(hd);
      if (!s.rows.length){ const e=document.createElement('div'); e.className='none'; e.textContent='No participants randomised yet.'; card.append(e); grid.append(card); return; }
      const sp=document.createElement('div'); sp.className='split';
      const a1=document.createElement('span'); a1.className='pill p-as'; a1.textContent='Surveillance '+s.rows.filter(r=>r.arm==='AS').length;
      const a2=document.createElement('span'); a2.className='pill p-crt'; a2.textContent='CRT '+s.rows.filter(r=>r.arm==='CRT').length; sp.append(a1,a2); card.append(sp);
      const box=document.createElement('div'); box.className='rtable'; const t=document.createElement('table');
      t.innerHTML='<thead><tr><th>PID</th><th>Randomised</th><th>Arm</th><th>Status</th><th>Next FUP</th></tr></thead>';
      const tb=document.createElement('tbody');
      s.rows.slice().sort((x,y)=> (parseFloat(x.pid)||0)-(parseFloat(y.pid)||0) || String(x.pid).localeCompare(String(y.pid))).forEach(r=>{
        const tr=document.createElement('tr');
        const add=(v,cls)=>{ const td=document.createElement('td'); if(cls) td.className=cls; if (v instanceof Node) td.append(v); else td.textContent=v; tr.append(td); };
        add(r.pid||'–','num'); tr.lastChild.style.fontWeight='600';
        add(r.rand?fmt(r.rand):'–','num');
        const p=document.createElement('span'); p.className='pill '+(r.arm==='AS'?'p-as':r.arm==='CRT'?'p-crt':'p-neutral'); p.textContent=r.arm==='AS'?'AS':r.arm||'–'; add(p);
        add(r.status||'–'); add(r.next?fmt(r.next):'–','num');
        tb.append(tr);
      });
      t.append(tb); box.append(t); card.append(box); grid.append(card);
    });
  }

  /* ---------- Documents in local language ---------- */
  const LANG = { Poland:'Polish', Spain:'Spanish', France:'French', Italy:'Italian', Belgium:'Dutch / French', Germany:'German', Switzerland:'German', Norway:'Norwegian', Greece:'Greek', Sweden:'Swedish', Netherlands:'Dutch' };
  const NAT = [['Informed consent form','Patient consent form','signed by the patient before randomisation'],['Patient information','Patient information materials','information sheets and leaflets for patients'],['QoL questionnaire','QoL forms','EORTC QLQ-C30, QLQ-CR29 and LARS, patient-completed']];
  const GENC = ['General (all countries)','All countries (English master)'];
  const isGen = (d)=> ['Protocol','DSMB charter'].includes(d.type) || (GENC.includes(d.country) && !NAT.some(t=>t[0]===d.type));
  const DOCS = PKG.docs || [];
  const kb = (n)=> n>=1048576 ? (n/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(n/1024))+' kB';
  const ext = (f)=> (String(f).split('.').pop()||'').slice(0,4).toUpperCase();
  async function download(d, btn){
    const old = btn.textContent; btn.disabled=true; btn.textContent='Downloading…';
    try {
      const res = await fetch(d.src, {cache:'no-store'});
      if (!res.ok) throw new Error('gone');
      const buf = new Uint8Array(await res.arrayBuffer());
      const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(d.key), c=>c.charCodeAt(0)), 'AES-GCM', false, ['decrypt']);
      const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:buf.slice(0,12)}, key, buf.slice(12));
      const url = URL.createObjectURL(new Blob([plain], {type:d.mime||'application/octet-stream'}));
      const a=document.createElement('a'); a.href=url; a.download=d.filename||'document'; document.body.append(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 30000);
      btn.textContent=old;
    } catch(e){ btn.textContent='Reload the page and try again'; }
    btn.disabled=false;
  }
  function docRow(d){
    const r=document.createElement('div'); r.className='doc'+(d.old?' old':'');
    const ic=document.createElement('div'); ic.className='ic'; ic.textContent=ext(d.filename)||'FILE';
    const m=document.createElement('div'); m.style.minWidth='0';
    const t=document.createElement('div'); t.className='dt'; t.textContent=d.title + (d.parts>1 ? ' (file '+d.part+' of '+d.parts+')' : '');
    const mt=document.createElement('div'); mt.className='dm';
    if (GENC.includes(d.country) && !isGen(d)){ const g=document.createElement('span'); g.className='tag all'; g.textContent='English master'; mt.append(g); }
    else if (ALLV && !GENC.includes(d.country)){ const g=document.createElement('span'); g.className='tag'; g.textContent=d.country; mt.append(g); }
    [d.lang || (isGen(d) ? '' : (LANG[d.country]||'')), d.version ? 'Version '+d.version : '', d.date ? 'dated '+(/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? fmt(new Date(d.date+'T12:00:00')) : d.date) : '', kb(d.size||0), d.by ? 'added by '+d.by : ''].filter(Boolean).forEach(x=>{ const s=document.createElement('span'); s.textContent=x; mt.append(s); });
    if (d.old){ const g=document.createElement('span'); g.className='tag'; g.textContent='Superseded'; mt.prepend(g); }
    m.append(t, mt);
    if (d.notes){ const n=document.createElement('div'); n.className='dn2'; n.textContent=d.notes; m.append(n); }
    const b=document.createElement('button'); b.type='button'; b.className='btn'+(d.old?' ghost':''); b.textContent='Download'; b.setAttribute('aria-label','Download '+d.title); b.addEventListener('click', ()=>download(d,b));
    r.append(ic, m, b); return r;
  }
  function linkRow(title, sub, href, tagText){
    const r=document.createElement('div'); r.className='doc';
    const ic=document.createElement('div'); ic.className='ic'; ic.textContent= href ? 'LINK' : '—';
    const m=document.createElement('div'); m.style.minWidth='0';
    const t=document.createElement('div'); t.className='dt'; t.textContent=title;
    const mt=document.createElement('div'); mt.className='dm'; if (tagText){ const g=document.createElement('span'); g.className='tag'; g.textContent=tagText; mt.append(g); } const s=document.createElement('span'); s.textContent=sub; mt.append(s);
    m.append(t, mt);
    let b;
    if (href){ b=document.createElement('a'); b.className='btn'; b.href=href; b.target='_blank'; b.rel='noopener'; b.textContent='Open ↗'; b.style.textDecoration='none'; }
    else { b=document.createElement('span'); b.className='pill p-neutral'; b.textContent='Not yet available'; }
    r.append(ic, m, b); return r;
  }
  function docGroup(parent, title, sub, ds, extra){
    const box=document.createElement('div'); box.className='dgroup';
    const h=document.createElement('h3'); h.textContent=title; if (sub){ const s=document.createElement('small'); s.textContent=sub; h.append(s); } box.append(h);
    const cur=document.createElement('div'); cur.className='dlist';
    (extra||[]).forEach(x=>cur.append(x));
    ds.filter(d=>!d.old).forEach(d=>cur.append(docRow(d)));
    if (!cur.children.length){ const e=document.createElement('div'); e.className='empty'; e.textContent='Nothing uploaded yet.'; cur.append(e); }
    box.append(cur);
    const olds = ds.filter(d=>d.old);
    if (olds.length){ const det=document.createElement('details'); det.className='dold'; const sm=document.createElement('summary'); sm.textContent='Older versions ('+olds.length+')'; det.append(sm); const dl=document.createElement('div'); dl.className='dlist'; olds.forEach(d=>dl.append(docRow(d))); det.append(dl); box.append(det); }
    parent.append(box);
  }
  const sortD = (a,b)=> (GENC.includes(a.country))-(GENC.includes(b.country)) || String(a.country).localeCompare(String(b.country)) || String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title);
  function embedUrl(u){ const m=/^https:\/\/airtable\.com\/(?:embed\/)?(app[A-Za-z0-9]+\/(?:pag|shr)[A-Za-z0-9]+(?:\/form)?)/.exec(u||''); return m ? 'https://airtable.com/embed/'+m[1] : ''; }
  function renderUpload(){
    const f = ALLV ? $('dc-filter').value : WHO;
    const btn=$('dc-up'), box=$('dc-upbox'), fr=$('dc-frame');
    const eu = embedUrl(L.docsForm);
    if (!eu){ btn.classList.add('off'); btn.setAttribute('aria-disabled','true'); btn.textContent='Upload form coming soon'; $('dc-uphint').textContent='Until the upload form is ready, send the approved file to the coordinating team' + (L.coordEmail ? ' ('+L.coordEmail+')' : '') + '.'; box.hidden=true; return; }
    let u = eu + '?backgroundColor=teal';
    if (f) u += '&prefill_Country=' + encodeURIComponent(f) + (ALLV ? '' : '&hide_Country=true');
    fr.dataset.src = u;
    if (!box.hidden && fr.src !== u) fr.src = u;
  }
  $('dc-up').addEventListener('click', (e)=>{ e.preventDefault(); const box=$('dc-upbox'), fr=$('dc-frame'); if ($('dc-up').classList.contains('off')) return; box.hidden=!box.hidden; $('dc-up').textContent = box.hidden ? 'Upload a document' : 'Close upload form'; $('dc-up').setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden){ if (fr.src !== fr.dataset.src) fr.src = fr.dataset.src; box.scrollIntoView({behavior:'smooth', block:'start'}); } });
  function renderDocs(){
    const f = ALLV ? $('dc-filter').value : WHO;
    $('dc-title').textContent = ALLV ? (f ? 'Documents · '+f : 'Documents') : 'Documents · ' + WHO;
    $('dc-sub').textContent = 'Approved study documents. National-language documents for patients, and general documents for every site. Always use the current version.';
    renderUpload();
    const g=$('dc-groups'); g.textContent='';
    // national language
    const natHead=document.createElement('div'); natHead.className='dsec';
    const h2=document.createElement('h3'); h2.className='dsech'; h2.textContent = 'Documents in national language' + (!ALLV ? ' · ' + (LANG[WHO]||WHO) : (f ? ' · ' + f : '')); natHead.append(h2); g.append(natHead);
    const natDocs = DOCS.filter(d=> !isGen(d) && (!f || d.country===f || GENC.includes(d.country)));
    NAT.forEach(([key,label,sub])=> docGroup(natHead, label, sub, natDocs.filter(d=>d.type===key).sort(sortD)));
    const other = natDocs.filter(d=>!NAT.some(t=>t[0]===d.type));
    if (other.length) docGroup(natHead, 'Other', '', other.sort(sortD));
    // general
    const gen=document.createElement('div'); gen.className='dsec';
    const h3=document.createElement('h3'); h3.className='dsech'; h3.textContent='General'; gen.append(h3); g.append(gen);
    const genDocs = DOCS.filter(isGen);
    const prot = genDocs.filter(d=>d.type==='Protocol'), dsmb = genDocs.filter(d=>d.type==='DSMB charter'), rest = genDocs.filter(d=>d.type!=='Protocol' && d.type!=='DSMB charter');
    docGroup(gen, 'Protocol', 'current version and amendments', prot.sort(sortD), (L.protocol && !prot.some(d=>!d.old)) ? [linkRow('T-REX protocol v1.2', 'current version, in the shared folder', L.protocol, 'OneDrive')] : []);
    docGroup(gen, 'DSMB charter', 'Data and Safety Monitoring Board', dsmb.sort(sortD), (!dsmb.some(d=>!d.old)) ? [linkRow('DSMB charter', 'will be added once approved', L.dsmb||'', '')] : []);
    if (rest.length) docGroup(gen, 'Other general documents', '', rest.sort(sortD));
  }
  if (ALLV){
    $('dc-filter-box').hidden=false;
    const cs = [...new Set([...(PKG.countries||[]), ...DOCS.map(d=>d.country).filter(c=>!GENC.includes(c))])].sort();
    cs.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; $('dc-filter').append(o); });
    $('dc-filter').addEventListener('change', renderDocs);
  }
  renderDocs();

  /* ---------- Start: data baked in by the hourly build ---------- */
  const AR = PKG.at || { records: [], fetchedAt: null };
  ingest(AR.records || []);
  const fmtT = (d)=> d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  if (AR.fetchedAt){
    const t = new Date(AR.fetchedAt);
    $('fu-state').textContent = 'Updated ' + fmtT(t);
    $('g-note').textContent = 'From Airtable · updated ' + fmtT(t);
  } else { $('fu-state').textContent = 'No data yet'; $('fu-state').className='pill p-neutral'; $('g-note').textContent = 'Waiting for the first automatic update.'; }
  $('fu-foot').textContent = 'Record visits in Airtable (M… FUP date fields). This page is rebuilt automatically every hour.';
  $('f-upd').textContent = D.updated ? fmt(new Date(D.updated)) : '';
  if (!ALLV){ const fp=document.querySelector('#followup .shead p'); if (fp) fp.textContent = 'Every randomised participant at the ' + WHO + ' sites with their next follow-up date. Dashed dates are estimated from randomisation; click a participant to book the visit or change the date.'; }
};

/* ---------- Sign-in: the password picks and decrypts one package ---------- */
(function(){
  const B = window.TREX_BOOT || {};
  const $ = (id)=>document.getElementById(id);
  const nrm = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const hex = (u)=> [...u].map(b=>b.toString(16).padStart(2,'0')).join('');
  const KEY = 'trex-auth';
  async function unlock(pw){
    const salt = Uint8Array.from(atob(B.salt), c=>c.charCodeAt(0));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(nrm(pw)), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt, iterations:B.iter}, base, 512));
    const res = await fetch('p/' + hex(bits.slice(32,48)) + '.bin', {cache:'no-store'});
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('net');
    const buf = new Uint8Array(await res.arrayBuffer());
    const key = await crypto.subtle.importKey('raw', bits.slice(0,32), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:buf.slice(0,12)}, key, buf.slice(12));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  function enter(pkg){
    document.body.classList.remove('locked');
    window.TREX_START(pkg);
  }
  function err(t){ const e=$('lerr'); e.textContent=t; e.hidden=!t; }
  $('lform').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const pw = $('lpw').value; if (!pw.trim()) return;
    const btn=$('lbtn'); btn.disabled=true; btn.textContent='Opening…'; err('');
    try {
      const pkg = await unlock(pw);
      if (!pkg){ err('Wrong password. Use the name of your country (for example: poland), or the coordinating team password.'); }
      else {
        try { if ($('lrem').checked) localStorage.setItem(KEY, JSON.stringify({pw, exp: Date.now()+30*864e5})); else localStorage.removeItem(KEY); } catch(_){}
        enter(pkg); return;
      }
    } catch(e){ err('The hub could not be loaded. Check your internet connection and try again.'); }
    btn.disabled=false; btn.textContent='Open'; $('lpw').select();
  });
  $('logout').addEventListener('click', ()=>{ try{ localStorage.removeItem(KEY); }catch(_){} location.reload(); });
  (async ()=>{
    let saved=null; try { saved = JSON.parse(localStorage.getItem(KEY)||'null'); } catch(_){}
    if (saved && saved.pw && saved.exp > Date.now()){
      try { const pkg = await unlock(saved.pw); if (pkg){ enter(pkg); return; } } catch(_){}
      try { localStorage.removeItem(KEY); } catch(_){}
    }
  })();
})();
