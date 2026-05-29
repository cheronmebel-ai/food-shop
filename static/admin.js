try { document.getElementById("diag").textContent = "admin.js executing..."; } catch(e){}

let TOKEN='cookie', allOrders=[], editProdId=null, newImages=[], existImages=[], pushHist=[], allZones=[], currentOrderId=null, ordersFilter='';

function logout() { document.cookie='at=; Path=/; Max-Age=0'; location.href='/admin-login'; }



// ── API ───────────────────────────────────────────────────────────────────
const api = (p,o={}) => fetch(p,{...o,credentials:'include',headers:{...o.headers}});

// ── Nav ───────────────────────────────────────────────────────────────────
function goPage(name,btn) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.querySelectorAll('.nav-item,.mob-nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll(`[data-page="${name}"]`).forEach(b=>b.classList.add('active'));
  if(name==='dashboard') loadDashboard();
  if(name==='orders')    loadOrders();
  if(name==='products')  loadProducts();
  if(name==='push')      loadPushPage();
  if(name==='analytics') loadAnalytics();
  if(name==='settings')  loadSettings();
}

// ── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  const r=await api('/api/admin/stats'); const d=await r.json();
  document.getElementById('d-new').textContent  = d.newOrders;
  document.getElementById('d-today').textContent= d.todayOrders;
  document.getElementById('d-trev').textContent = fmtMoney(d.todayRevenue);
  document.getElementById('d-rev').textContent  = fmtMoney(d.revenue);
  document.getElementById('d-users').textContent= d.users;
  document.getElementById('d-subs').textContent = d.subscribers;
  const nb=document.getElementById('nb'); nb.textContent=d.newOrders; nb.style.display=d.newOrders>0?'flex':'none';
  const r2=await api('/api/admin/orders'); allOrders=await r2.json();
  document.getElementById('dash-orders').innerHTML=allOrders.slice(0,5).map(o=>`
    <tr style="cursor:pointer" onclick="openOrder(${o.id})">
      <td><code style="font-size:12px">${esc(o.number)}</code></td>
      <td>${esc(o.name)}</td>
      <td>${fmtMoney(o.total)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--gray);font-size:12px">${fmtDate(o.created_at)}</td>
    </tr>`).join('')||'<tr><td colspan="5" class="empty">Заказов нет</td></tr>';
}

// ── Orders ────────────────────────────────────────────────────────────────
async function loadOrders() {
  const url=ordersFilter?`/api/admin/orders?status=${ordersFilter}`:'/api/admin/orders';
  const r=await api(url); allOrders=await r.json();
  document.getElementById('orders-body').innerHTML=allOrders.map(o=>`
    <tr style="cursor:pointer" onclick="openOrder(${o.id})">
      <td><code style="font-size:12px">${esc(o.number)}</code></td>
      <td>${esc(o.name)}</td>
      <td><a href="tel:${esc(o.phone)}" style="color:var(--black)">${esc(o.phone)}</a></td>
      <td style="font-weight:600">${fmtMoney(o.total)}</td>
      <td style="font-size:12px;color:var(--gray)">${o.payment==='online'?'💳':'💵'}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:12px;color:var(--gray);white-space:nowrap">${fmtDate(o.created_at)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openOrder(${o.id})">Открыть</button></td>
    </tr>`).join('')||'<tr><td colspan="8"><div class="empty"><div class="icon">📭</div>Нет заказов</div></td></tr>';
}
function filterOrders(btn,s) { document.querySelectorAll('.st-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); ordersFilter=s; loadOrders(); }

function openOrder(id) {
  const o=allOrders.find(x=>x.id===id); if(!o) return;
  currentOrderId=id;
  document.getElementById('om-num').textContent    = o.number;
  document.getElementById('om-name').textContent   = o.name;
  document.getElementById('om-phone').textContent  = o.phone;
  document.getElementById('om-addr').textContent   = o.address||'Самовывоз';
  document.getElementById('om-date').textContent   = fmtDate(o.created_at);
  document.getElementById('om-pay').textContent    = o.payment==='online'?'💳 Онлайн':'💵 Наличные';
  document.getElementById('om-comment').textContent= o.comment||'—';
  document.getElementById('om-status').value       = o.status;
  const items=o.items||[];
  document.getElementById('om-items').innerHTML=[
    ...items.map(i=>`<div class="oi"><span>${esc(i.name)} × ${i.qty}</span><span>${fmtMoney(i.price*i.qty)}</span></div>`),
    `<div class="oi"><span>Доставка</span><span>${fmtMoney(o.delivery_price||0)}</span></div>`,
    `<div class="oi"><span>Итого</span><span>${fmtMoney(o.total)}</span></div>`
  ].join('');
  document.getElementById('order-modal').classList.add('open');
}
function closeOrderModal() { document.getElementById('order-modal').classList.remove('open'); }
async function saveOrderStatus() {
  const status=document.getElementById('om-status').value;
  await api(`/api/admin/orders/${currentOrderId}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  closeOrderModal(); loadOrders(); loadDashboard();
}

// ── Products ──────────────────────────────────────────────────────────────
async function loadProducts() {
  const r=await api('/api/admin/products'); const prods=await r.json();
  document.getElementById('products-body').innerHTML=prods.map(p=>`
    <tr>
      <td><div class="td-img">${p.images?.[0]?`<img src="${p.images[0]}" alt=""/>`:'🍕'}</div></td>
      <td style="font-weight:600">${esc(p.name)}</td>
      <td style="font-size:12px;color:var(--blue)">${esc(p.category)}</td>
      <td style="font-weight:600">${fmtMoney(p.price)}${p.old_price?`<br><span style="font-size:11px;color:var(--gray);text-decoration:line-through">${fmtMoney(p.old_price)}</span>`:''}</td>
      <td style="color:var(--gray);font-size:12px">${esc(p.weight||'')}</td>
      <td><span style="color:${p.in_stock?'var(--green)':'var(--red)'};font-size:12px;font-weight:600">${p.in_stock?'✓ Есть':'✗ Нет'}</span></td>
      <td><div class="td-actions">
        <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn btn-red btn-sm" onclick="delProduct(${p.id},'${esc(p.name)}')">🗑</button>
      </div></td>
    </tr>`).join('')||'<tr><td colspan="7"><div class="empty"><div class="icon">🍕</div>Товаров нет</div></td></tr>';
}

function openProductForm() {
  editProdId=null; newImages=[]; existImages=[];
  document.getElementById('pf-modal-title').textContent='Добавить товар';
  ['pf-name','pf-desc','pf-comp','pf-price','pf-old','pf-weight','pf-cat','pf-cal','pf-prot','pf-fat','pf-carb','pf-tags'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pf-sort').value='0'; document.getElementById('pf-stock').value='1';
  document.getElementById('pf-images').value=''; document.getElementById('pf-preview').innerHTML='';
  document.getElementById('prod-modal').classList.add('open');
}

async function editProduct(id) {
  const r=await api('/api/admin/products'); const all=await r.json();
  const p=all.find(x=>x.id===id); if(!p) return;
  editProdId=id; newImages=[]; existImages=[...(p.images||[])];
  document.getElementById('pf-modal-title').textContent='Редактировать товар';
  document.getElementById('pf-name').value   = p.name||'';
  document.getElementById('pf-desc').value   = p.description||'';
  document.getElementById('pf-comp').value   = p.composition||'';
  document.getElementById('pf-price').value  = p.price||'';
  document.getElementById('pf-old').value    = p.old_price||'';
  document.getElementById('pf-weight').value = p.weight||'';
  document.getElementById('pf-cat').value    = p.category||'';
  document.getElementById('pf-cal').value    = p.nutrition?.cal||'';
  document.getElementById('pf-prot').value   = p.nutrition?.prot||'';
  document.getElementById('pf-fat').value    = p.nutrition?.fat||'';
  document.getElementById('pf-carb').value   = p.nutrition?.carb||'';
  document.getElementById('pf-tags').value   = (p.tags||[]).join(', ');
  document.getElementById('pf-sort').value   = p.sort||0;
  document.getElementById('pf-stock').value  = p.in_stock?'1':'0';
  document.getElementById('pf-images').value='';
  renderExistImages();
  document.getElementById('prod-modal').classList.add('open');
}

function renderExistImages() {
  document.getElementById('pf-preview').innerHTML=existImages.map(url=>`
    <div class="img-thumb"><img src="${url}"/><button class="del-img" onclick="removeExistImg('${url}')">✕</button></div>`).join('');
}
function removeExistImg(url) { existImages=existImages.filter(u=>u!==url); renderExistImages(); }

function prevImages(e) {
  newImages=Array.from(e.target.files);
  const exist=existImages.map(url=>`<div class="img-thumb"><img src="${url}"/><button class="del-img" onclick="removeExistImg('${url}')">✕</button></div>`).join('');
  const news=newImages.map(f=>`<div class="img-thumb"><img src="${URL.createObjectURL(f)}"/></div>`).join('');
  document.getElementById('pf-preview').innerHTML=exist+news;
}

async function saveProduct() {
  const name=document.getElementById('pf-name').value.trim();
  if(!name){alert('Введите название');return;}
  const btn=document.getElementById('pf-save-btn');
  btn.disabled=true; btn.innerHTML='<span class="spin"></span> Сохранение…';
  const fd=new FormData();
  ['name','desc','comp','price','old','weight','cat','cal','prot','fat','carb','tags','sort'].forEach(k=>{
    const map={name:'name',desc:'description',comp:'composition',price:'price',old:'old_price',weight:'weight',cat:'category',cal:'cal',prot:'prot',fat:'fat',carb:'carb',tags:'tags',sort:'sort'};
    fd.append(map[k], document.getElementById('pf-'+k).value);
  });
  fd.append('in_stock', document.getElementById('pf-stock').value);
  newImages.forEach(f=>fd.append('images',f));
  const url=editProdId?`/api/admin/products/${editProdId}`:'/api/admin/products';
  const method=editProdId?'PUT':'POST';
  try {
    const r=await fetch(url,{method,headers:{'Authorization':'Bearer '+TOKEN},body:fd});
    if(!r.ok) throw new Error((await r.json()).error||'Ошибка');
    closeProdModal(); loadProducts();
  } catch(e){alert(e.message);}
  btn.disabled=false; btn.textContent='Сохранить';
}
function closeProdModal() { document.getElementById('prod-modal').classList.remove('open'); }

async function delProduct(id,name) {
  if(!confirm(`Удалить «${name}»?`)) return;
  await api(`/api/admin/products/${id}`,{method:'DELETE'});
  loadProducts();
}

// ── Push ──────────────────────────────────────────────────────────────────
async function loadPushPage() {
  const r=await api('/api/admin/subscribers'); const subs=await r.json();
  document.getElementById('subs-body').innerHTML=subs.length?subs.map(s=>`
    <tr>
      <td><code style="font-size:11px;color:var(--gray)">${s.id}</code></td>
      <td style="font-size:12px">${parseUA(s.user_agent)}</td>
      <td style="font-size:12px;color:var(--gray)">${s.user_id?'#'+s.user_id:'Гость'}</td>
      <td>${s.unread>0?`<span class="unread-dot">${s.unread}</span>`:'<span style="color:var(--gray)">—</span>'}</td>
      <td style="font-size:12px;color:var(--gray)">${fmtDate(s.created_at)}</td>
      <td style="font-size:12px;color:var(--gray)">${timeAgo(s.last_seen)}</td>
      <td><div class="td-actions">
        <button class="btn btn-outline btn-sm" onclick="pushToOne('${s.id}')">📤</button>
        <button class="btn btn-red btn-sm" onclick="delSub('${s.id}')">✕</button>
      </div></td>
    </tr>`).join('')
  :'<tr><td colspan="7"><div class="empty"><div class="icon">📭</div>Нет подписчиков</div></td></tr>';
}

async function sendPushAll() {
  const title=document.getElementById('push-title').value||'🔔';
  const body=document.getElementById('push-body').value;
  const url=document.getElementById('push-url').value||'/';
  const btn=document.getElementById('btn-send-all');
  btn.disabled=true; btn.innerHTML='<span class="spin"></span> Отправка…';
  try {
    const r=await api('/api/admin/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body,url})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'Ошибка');
    showPushResult(`✓ Отправлено: ${d.sent}, ошибок: ${d.failed}`,d.failed===0?'ok':'err');
    addHist(`Отправлено всем — ${d.sent} ok, ${d.failed} err`,d.failed===0?'ok':'err');
    loadPushPage();
  } catch(e){showPushResult(e.message,'err');addHist('Ошибка: '+e.message,'err');}
  btn.disabled=false; btn.textContent='Отправить всем';
}

async function pushToOne(id) {
  const body=prompt('Текст уведомления:','Персональное предложение!'); if(!body) return;
  const r=await api(`/api/admin/push/send-to/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'📣 Сообщение',body})});
  const d=await r.json();
  addHist(d.ok?`✓ → ${id}`:`✗ → ${id}: ${d.error}`,d.ok?'ok':'err');
  loadPushPage();
}
async function delSub(id) { if(!confirm('Удалить?')) return; await api(`/api/admin/subscribers/${id}`,{method:'DELETE'}); loadPushPage(); }

async function testLocal() {
  const body=document.getElementById('test-body').value||'Тест';
  if(!('serviceWorker' in navigator)){alert('SW нет');return;}
  const reg=await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sw=reg.active||reg.installing||reg.waiting;
  if(sw){sw.postMessage({type:'SHOW_NOTIFICATION',title:'🧪 Admin тест',body});addHist('Локальный тест','ok');}
}

function showPushResult(msg,type) {
  const el=document.getElementById('push-result');
  el.textContent=msg; el.className='push-result '+type;
  clearTimeout(el._t); el._t=setTimeout(()=>el.className='push-result',6000);
}
function addHist(msg,type='') {
  const t=new Date().toLocaleTimeString('ru',{hour12:false});
  pushHist.unshift({t,msg,type}); if(pushHist.length>30) pushHist.pop();
  document.getElementById('push-hist').innerHTML=pushHist.map(e=>`
    <div class="hist-entry"><span class="hist-time">${e.t}</span><span class="hist-msg ${e.type}">${esc(e.msg)}</span></div>`).join('');
}

// ── Analytics ─────────────────────────────────────────────────────────────
async function loadAnalytics() {
  const r=await api('/api/admin/analytics'); const d=await r.json();
  // Chart
  const days=d.days||[]; const maxRev=Math.max(...days.map(x=>x.revenue),1);
  document.getElementById('chart-wrap').innerHTML=days.map(day=>`
    <div class="bar-col">
      <div class="bar" style="height:${Math.round((day.revenue/maxRev)*140)}px" title="${fmtMoney(day.revenue)}"></div>
      <div class="bar-label">${day.date.slice(5)}</div>
    </div>`).join('');
  // Top
  document.getElementById('top-prods').innerHTML=(d.topProducts||[]).map(p=>`
    <tr><td>${esc(p.name)}</td><td style="font-weight:600">${p.qty}</td><td>${fmtMoney(p.revenue)}</td></tr>`).join('')||'<tr><td colspan="3">Нет данных</td></tr>';
  // Summary
  const totalRev=days.reduce((s,x)=>s+x.revenue,0);
  const totalOrd=days.reduce((s,x)=>s+x.orders,0);
  document.getElementById('analytics-summary').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:14px;font-size:14px">
      <div><span style="color:var(--gray)">Выручка за 30 дней</span><br><strong style="font-size:22px">${fmtMoney(totalRev)}</strong></div>
      <div><span style="color:var(--gray)">Заказов за 30 дней</span><br><strong style="font-size:22px">${totalOrd}</strong></div>
      <div><span style="color:var(--gray)">Средний чек</span><br><strong style="font-size:22px">${totalOrd?fmtMoney(Math.round(totalRev/totalOrd)):'—'}</strong></div>
    </div>`;
}

// ── Settings ──────────────────────────────────────────────────────────────
async function loadSettings() {
  const r=await api('/api/admin/settings'); const s=await r.json();
  document.getElementById('s-name').value  = s.shop_name||'';
  document.getElementById('s-phone').value = s.phone||'';
  document.getElementById('s-addr').value  = s.address||'';
  document.getElementById('s-hours').value = s.working_hours||'';
  document.getElementById('s-wa').value    = s.whatsapp||'';
  document.getElementById('s-tg').value    = s.telegram||'';
  document.getElementById('s-min').value   = s.min_order||'';
  document.getElementById('s-free').value  = s.free_delivery_from||'';
  if (s.logo_url) document.getElementById('logo-preview').innerHTML=`<img src="${s.logo_url}" style="max-height:60px;margin-top:8px;border:1px solid var(--border)"/>`;
  if (s.favicon_url) document.getElementById('fav-preview').innerHTML=`<img src="${s.favicon_url}" style="max-height:32px;margin-top:8px;border:1px solid var(--border)"/>`;
  allZones = s.delivery_zones||[];
  renderZones();
}

function renderZones() {
  document.getElementById('zones-editor').innerHTML=allZones.map((z,i)=>`
    <div class="zone-item">
      <div class="zone-inputs">
        <div class="field"><label>Название</label><input value="${esc(z.name)}" oninput="allZones[${i}].name=this.value"/></div>
        <div class="field"><label>Цена (₽)</label><input type="number" value="${z.price}" oninput="allZones[${i}].price=+this.value"/></div>
        <div class="field"><label>Мин. заказ (₽)</label><input type="number" value="${z.min_order}" oninput="allZones[${i}].min_order=+this.value"/></div>
        <div class="field"><label>Время</label><input value="${esc(z.time)}" oninput="allZones[${i}].time=this.value"/></div>
      </div>
      <button class="btn btn-red btn-sm" onclick="removeZone(${i})">✕</button>
    </div>`).join('');
}
function addZone() { allZones.push({id:Date.now(),name:'Новая зона',price:200,min_order:800,time:'60 мин'}); renderZones(); }
function removeZone(i) { allZones.splice(i,1); renderZones(); }

async function saveSettings() {
  const fd=new FormData();
  fd.append('shop_name',    document.getElementById('s-name').value);
  fd.append('phone',        document.getElementById('s-phone').value);
  fd.append('address',      document.getElementById('s-addr').value);
  fd.append('working_hours',document.getElementById('s-hours').value);
  fd.append('whatsapp',     document.getElementById('s-wa').value);
  fd.append('telegram',     document.getElementById('s-tg').value);
  fd.append('min_order',    document.getElementById('s-min').value);
  fd.append('free_delivery_from', document.getElementById('s-free').value);
  fd.append('delivery_zones', JSON.stringify(allZones));
  const logo=document.getElementById('s-logo').files[0];
  const fav =document.getElementById('s-fav').files[0];
  if (logo) fd.append('logo',logo);
  if (fav)  fd.append('favicon',fav);
  try {
    const r=await fetch('/api/admin/settings',{method:'POST',headers:{'Authorization':'Bearer '+TOKEN},body:fd});
    if(!r.ok) throw new Error('Ошибка');
    const msg=document.getElementById('settings-msg');
    msg.textContent='✓ Настройки сохранены'; msg.style.color='var(--green)';
    setTimeout(()=>msg.textContent='',3000);
  } catch(e){alert(e.message);}
}

// ── Helpers ────────────────────────────────────────────────────────────────
function statusBadge(s) {
  const m={new:'badge-new',processing:'badge-processing',delivery:'badge-delivery',done:'badge-done',cancelled:'badge-cancelled'};
  const l={new:'Новый',processing:'Готовится',delivery:'В доставке',done:'Выполнен',cancelled:'Отменён'};
  return `<span class="badge ${m[s]||'badge-new'}">${l[s]||s}</span>`;
}
function fmtMoney(n) { return Number(n).toLocaleString('ru')+' ₽'; }
function fmtDate(iso) { if(!iso) return '—'; return new Date(iso).toLocaleString('ru',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function timeAgo(iso) { if(!iso) return '—'; const d=Date.now()-new Date(iso).getTime(); if(d<60000) return 'только что'; if(d<3600000) return Math.floor(d/60000)+' мин назад'; if(d<86400000) return Math.floor(d/3600000)+' ч назад'; return Math.floor(d/86400000)+' д назад'; }
function parseUA(ua) { if(!ua||ua==='unknown') return 'Неизв.'; if(/iPhone|iPad/.test(ua)) return '🍎 iOS'; if(/Android/.test(ua)) return '🤖 Android'; if(/Windows/.test(ua)) return '🖥 Win'; if(/Mac/.test(ua)) return '🖥 Mac'; return ua.slice(0,30); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }


loadDashboard();

try { document.getElementById("diag").textContent = "admin.js OK! goPage=" + typeof goPage; } catch(e){}
