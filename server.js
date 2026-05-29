/**
 * Food Shop PWA — Node.js Server
 * Storage: JSON files | Auth: JWT-like (signed tokens) | Push: web-push VAPID
 */
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const PORT       = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const KEYS_FILE  = path.join(__dirname, 'vapid-keys.json');
const DATA       = path.join(__dirname, 'data');
const UPLOADS    = path.join(__dirname, 'uploads');

[DATA, UPLOADS].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); });

// ── DB ────────────────────────────────────────────────────────────────────
const db = {
  read:  n => { try { return JSON.parse(fs.readFileSync(path.join(DATA,n+'.json'),'utf8')); } catch { return []; } },
  write: (n,d) => fs.writeFileSync(path.join(DATA,n+'.json'), JSON.stringify(d,null,2)),
  readObj: n => { try { return JSON.parse(fs.readFileSync(path.join(DATA,n+'.json'),'utf8')); } catch { return {}; } },
  writeObj: (n,d) => fs.writeFileSync(path.join(DATA,n+'.json'), JSON.stringify(d,null,2)),
};
const nextId = arr => arr.length ? Math.max(...arr.map(x=>x.id||0))+1 : 1;

// Seed settings
if (!fs.existsSync(path.join(DATA,'settings.json'))) {
  db.writeObj('settings', {
    shop_name: 'Вкусная доставка',
    phone: '+7 (900) 123-45-67',
    address: 'ул. Пушкина, 1',
    whatsapp: '79001234567',
    telegram: 'foodshop',
    working_hours: '10:00 – 22:00',
    min_order: 500,
    free_delivery_from: 1500,
    logo_url: '',
    favicon_url: '',
    delivery_zones: [
      { id:1, name:'Зона 1 (центр)',   price:0,   min_order:500,  time:'30–45 мин' },
      { id:2, name:'Зона 2 (город)',   price:150, min_order:800,  time:'45–60 мин' },
      { id:3, name:'Зона 3 (пригород)',price:300, min_order:1500, time:'60–90 мин' },
    ]
  });
}

// Seed demo products
if (!fs.existsSync(path.join(DATA,'products.json'))) {
  db.write('products', [
    {id:1,name:'Маргарита',          description:'Томатный соус, моцарелла, базилик',             composition:'Тесто, томатный соус, моцарелла, базилик, оливковое масло',                           nutrition:{cal:220,prot:9,fat:8,carb:28}, weight:'450г', price:590, old_price:null, category:'Пицца',  images:[],tags:['Хит'],     in_stock:1,sort:1},
    {id:2,name:'Пепперони',          description:'Томатный соус, моцарелла, пепперони',            composition:'Тесто, томатный соус, моцарелла, колбаса пепперони, специи',                          nutrition:{cal:280,prot:12,fat:13,carb:27},weight:'480г', price:690, old_price:790, category:'Пицца',  images:[],tags:['Хит'],     in_stock:1,sort:2},
    {id:3,name:'Четыре сыра',        description:'Моцарелла, чеддер, пармезан, горгонзола',        composition:'Тесто, соус бешамель, моцарелла, чеддер, пармезан, горгонзола',                       nutrition:{cal:310,prot:15,fat:16,carb:25},weight:'460г', price:790, old_price:null, category:'Пицца',  images:[],tags:[],          in_stock:1,sort:3},
    {id:4,name:'Калифорния',         description:'Краб, авокадо, огурец, икра тобико',             composition:'Рис, нори, крабовое мясо, авокадо, огурец, сливочный сыр, икра тобико',               nutrition:{cal:180,prot:8,fat:6,carb:24}, weight:'280г', price:490, old_price:null, category:'Роллы',  images:[],tags:['Хит'],     in_stock:1,sort:4},
    {id:5,name:'Спайси тунец',       description:'Тунец, спайси соус, огурец, авокадо',            composition:'Рис, нори, тунец, острый соус, огурец, авокадо, кунжут',                              nutrition:{cal:160,prot:10,fat:5,carb:20},weight:'260г', price:520, old_price:null, category:'Роллы',  images:[],tags:['Острое'],  in_stock:1,sort:5},
    {id:6,name:'Радуга',             description:'Лосось, тунец, угорь, авокадо, огурец',          composition:'Рис, нори, лосось, тунец, угорь, авокадо, огурец, соус унаги',                        nutrition:{cal:200,prot:12,fat:7,carb:22},weight:'300г', price:650, old_price:750, category:'Роллы',  images:[],tags:['Новинка'], in_stock:1,sort:6},
    {id:7,name:'Классик бургер',     description:'Говядина, салат, помидор, огурец, соус',         composition:'Булочка, котлета из говядины 150г, листья салата, помидор, маринованный огурец, соус', nutrition:{cal:520,prot:28,fat:22,carb:48},weight:'320г', price:390, old_price:null, category:'Бургеры', images:[],tags:[],          in_stock:1,sort:7},
    {id:8,name:'Двойной чизбургер',  description:'Две котлеты, двойной сыр, бекон',                composition:'Булочка, две котлеты 150г, двойной чеддер, бекон, лук, соус BBQ',                     nutrition:{cal:720,prot:42,fat:38,carb:46},weight:'420г', price:550, old_price:null, category:'Бургеры', images:[],tags:['Хит'],     in_stock:1,sort:8},
    {id:9,name:'Том Ям',             description:'Острый суп с морепродуктами и грибами',          composition:'Бульон, креветки, кальмар, грибы шиитаке, лемонграсс, кокосовое молоко, лайм, чили',  nutrition:{cal:120,prot:14,fat:4,carb:8},  weight:'400мл',price:420, old_price:null, category:'Супы',   images:[],tags:['Острое'],  in_stock:1,sort:9},
    {id:10,name:'Борщ',              description:'Классический борщ со сметаной',                   composition:'Свёкла, капуста, картофель, говядина, морковь, лук, томатная паста, сметана',          nutrition:{cal:90,prot:6,fat:3,carb:12},  weight:'400мл',price:320, old_price:null, category:'Супы',   images:[],tags:[],          in_stock:1,sort:10},
    {id:11,name:'Сёмга на гриле',    description:'Филе сёмги с овощами гриль',                     composition:'Филе сёмги 200г, цукини, перец болгарский, спаржа, лимон, зелень, соус тартар',       nutrition:{cal:280,prot:32,fat:14,carb:6},weight:'350г', price:680, old_price:null, category:'Горячее', images:[],tags:['Новинка'], in_stock:1,sort:11},
    {id:12,name:'Тирамису',          description:'Классический итальянский десерт',                 composition:'Савоярди, маскарпоне, яйца, сахар, кофе эспрессо, какао',                             nutrition:{cal:380,prot:7,fat:22,carb:40},weight:'150г', price:280, old_price:null, category:'Десерты', images:[],tags:[],          in_stock:1,sort:12},
  ]);
}

// ── VAPID ─────────────────────────────────────────────────────────────────
let VAPID = null;
function loadVapid() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    VAPID = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    console.log('✓ VAPID from env'); return;
  }
  if (fs.existsSync(KEYS_FILE)) { VAPID = JSON.parse(fs.readFileSync(KEYS_FILE,'utf8')); console.log('✓ VAPID loaded'); return; }
  try {
    const wp = require('web-push');
    VAPID = wp.generateVAPIDKeys();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(VAPID,null,2));
    console.log('✓ VAPID generated');
  } catch {
    VAPID = { publicKey:'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U', privateKey:'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls' };
    fs.writeFileSync(KEYS_FILE, JSON.stringify(VAPID,null,2));
    console.log('⚠ Demo VAPID — run npm install web-push');
  }
}

async function sendPush(sub, payload) {
  try {
    const wp = require('web-push');
    wp.setVapidDetails('mailto:admin@foodshop.local', VAPID.publicKey, VAPID.privateKey);
    await wp.sendNotification({ endpoint:sub.endpoint, keys:{ p256dh:sub.p256dh, auth:sub.auth } }, JSON.stringify(payload));
    return { ok:true };
  } catch(e) { return { ok:false, error:e.message, statusCode:e.statusCode }; }
}

// ── JWT-like tokens ────────────────────────────────────────────────────────
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data,'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
function authUser(req) {
  const h = req.headers['authorization']||'';
  const t = h.replace('Bearer ','');
  return t ? verifyToken(t) : null;
}

// ── Multipart ─────────────────────────────────────────────────────────────
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type']||'';
    const m  = ct.match(/boundary=(.+)$/);
    if (!m) { readJSON(req).then(b => resolve({ fields:b, files:[] })); return; }
    const boundary = '--'+m[1];
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf   = Buffer.concat(chunks).toString('binary');
      const parts = buf.split(boundary).slice(1,-1);
      const fields = {}, files = [];
      parts.forEach(part => {
        const sep  = part.indexOf('\r\n\r\n');
        if (sep < 0) return;
        const head = part.slice(0, sep);
        const body = part.slice(sep+4).replace(/\r\n$/, '');
        const nm   = head.match(/name="([^"]+)"/);
        const fn   = head.match(/filename="([^"]+)"/);
        if (!nm) return;
        if (fn) {
          const ext = path.extname(fn[1]).toLowerCase() || '.jpg';
          if (!['.jpg','.jpeg','.png','.webp','.svg','.ico'].includes(ext)) return;
          const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
          fs.writeFileSync(path.join(UPLOADS, filename), Buffer.from(body,'binary'));
          files.push({ field: nm[1], filename, url: `/uploads/${filename}` });
        } else {
          fields[nm[1]] = Buffer.from(body,'binary').toString('utf8');
        }
      });
      resolve({ fields, files });
    });
    req.on('error', reject);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon' };
function serveFile(fp, res) {
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(fp).toLowerCase();
  res.writeHead(200, { 'Content-Type':MIME[ext]||'application/octet-stream', 'Cache-Control': ext==='.html'?'no-cache':'public,max-age=86400' });
  fs.createReadStream(fp).pipe(res);
}
function readJSON(req) {
  return new Promise((res,rej)=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>{ try{res(JSON.parse(d));}catch{res({});} }); req.on('error',rej); });
}
const ok  = (res,d)   => { res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify(d)); };
const err = (res,m,c=400) => { res.writeHead(c,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify({error:m})); };
function genOrderNum() { const d=new Date(); return `ORD-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`; }
function hashPass(p)  { return crypto.createHash('sha256').update(p+JWT_SECRET).digest('hex'); }

// ── Keepalive job (every 14 days) ─────────────────────────────────────────
let lastKeepalive = 0;
async function keepalivePush() {
  if (Date.now()-lastKeepalive < 14*24*60*60*1000) return;
  lastKeepalive = Date.now();
  const subs = db.read('subscribers');
  let expired = [];
  for (const s of subs) {
    const r = await sendPush(s, { title:'', body:'', silent:true, tag:'keepalive' });
    if (r.statusCode===410||r.statusCode===404) expired.push(s.id);
  }
  if (expired.length) { db.write('subscribers', subs.filter(s=>!expired.includes(s.id))); }
}
setInterval(keepalivePush, 60*60*1000);

// ── SERVER ─────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  const m = req.method.toUpperCase();

  if (m==='OPTIONS') { res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}); res.end(); return; }

  // ── AUTH API ──────────────────────────────────────────────────────────
  if (p==='/api/auth/register' && m==='POST') {
    const b = await readJSON(req);
    if (!b.email||!b.password||!b.name) return err(res,'Заполните все поля');
    const users = db.read('users');
    if (users.find(u=>u.email===b.email.toLowerCase())) return err(res,'Email уже зарегистрирован');
    const user = { id:nextId(users), email:b.email.toLowerCase(), password:hashPass(b.password), name:b.name, phone:b.phone||'', created_at:new Date().toISOString() };
    users.push(user);
    db.write('users', users);
    const token = signToken({ id:user.id, email:user.email, exp:Date.now()+30*24*60*60*1000 });
    return ok(res, { token, user:{ id:user.id, email:user.email, name:user.name, phone:user.phone } });
  }

  if (p==='/api/auth/login' && m==='POST') {
    const b = await readJSON(req);
    const users = db.read('users');
    const user = users.find(u=>u.email===b.email?.toLowerCase() && u.password===hashPass(b.password||''));
    if (!user) return err(res,'Неверный email или пароль',401);
    const token = signToken({ id:user.id, email:user.email, exp:Date.now()+30*24*60*60*1000 });
    return ok(res, { token, user:{ id:user.id, email:user.email, name:user.name, phone:user.phone } });
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────
  if (p==='/api/settings' && m==='GET') return ok(res, (()=>{ const s=db.readObj('settings'); delete s.delivery_zones; return {shop_name:s.shop_name,phone:s.phone,address:s.address,whatsapp:s.whatsapp,telegram:s.telegram,working_hours:s.working_hours,min_order:s.min_order,free_delivery_from:s.free_delivery_from,logo_url:s.logo_url,favicon_url:s.favicon_url}; })());

  if (p==='/api/delivery-zones' && m==='GET') return ok(res, db.readObj('settings').delivery_zones||[]);

  if (p==='/api/products' && m==='GET') {
    const cat = u.searchParams.get('category')||'';
    let prods = db.read('products').filter(x=>x.in_stock);
    if (cat) prods = prods.filter(x=>x.category===cat);
    return ok(res, prods.sort((a,b)=>(a.sort||0)-(b.sort||0)));
  }

  if (p.match(/^\/api\/products\/\d+$/) && m==='GET') {
    const pr = db.read('products').find(x=>x.id===parseInt(p.split('/').pop()));
    return pr ? ok(res,pr) : err(res,'Not found',404);
  }

  if (p==='/api/categories' && m==='GET') {
    const cats = [...new Set(db.read('products').filter(x=>x.in_stock&&x.category).map(x=>x.category))];
    return ok(res, cats);
  }

  if (p==='/api/vapid-public-key' && m==='GET') return ok(res, { publicKey:VAPID.publicKey });

  if (p==='/api/subscribe' && m==='POST') {
    const b = await readJSON(req);
    if (!b.subscription?.endpoint) return err(res,'Invalid');
    const user = authUser(req);
    const subs = db.read('subscribers');
    const ex   = subs.find(s=>s.endpoint===b.subscription.endpoint);
    if (!ex) {
      subs.push({ id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), endpoint:b.subscription.endpoint, p256dh:b.subscription.keys.p256dh, auth:b.subscription.keys.auth, user_id:user?.id||null, user_agent:b.userAgent||'', unread:0, created_at:new Date().toISOString(), last_seen:new Date().toISOString() });
    } else { ex.last_seen=new Date().toISOString(); if(user?.id) ex.user_id=user.id; }
    db.write('subscribers',subs);
    return ok(res,{ok:true});
  }

  if (p==='/api/subscribe' && m==='DELETE') {
    const b = await readJSON(req);
    db.write('subscribers', db.read('subscribers').filter(s=>s.endpoint!==b.endpoint));
    return ok(res,{ok:true});
  }

  if (p==='/api/read' && m==='POST') {
    const b = await readJSON(req);
    const subs = db.read('subscribers');
    const s = subs.find(x=>x.endpoint===b.endpoint);
    if (s) { s.unread=0; db.write('subscribers',subs); }
    return ok(res,{ok:true});
  }

  // POST /api/orders
  if (p==='/api/orders' && m==='POST') {
    const b = await readJSON(req);
    if (!b.name||!b.phone||!b.items?.length) return err(res,'Заполните обязательные поля');
    const user   = authUser(req);
    const orders = db.read('orders');
    const number = genOrderNum();
    const total  = b.items.reduce((s,i)=>s+(i.price*i.qty),0);
    const order  = { id:nextId(orders), number, user_id:user?.id||null, name:b.name, phone:b.phone, address:b.address||'', zone:b.zone||'', comment:b.comment||'', items:b.items, subtotal:total, delivery_price:b.delivery_price||0, total:total+(b.delivery_price||0), payment:b.payment||'cash', status:'new', created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
    orders.unshift(order);
    db.write('orders',orders);

    // Save notification for user
    if (user?.id) {
      const notifs = db.read('notifications');
      notifs.unshift({ id:nextId(notifs), user_id:user.id, title:'Заказ принят', body:`Ваш заказ ${number} на сумму ${order.total.toLocaleString('ru')} ₽ принят`, read:false, created_at:new Date().toISOString() });
      db.write('notifications',notifs);
    }

    // Push to admin subscribers
    const subs = db.read('subscribers');
    for (const s of subs) {
      s.unread=(s.unread||0)+1;
      await sendPush(s, { title:'🛍 Новый заказ!', body:`${b.name} — ${order.total.toLocaleString('ru')} ₽`, url:'/admin', unread:s.unread });
    }
    db.write('subscribers',subs);
    return ok(res,{ ok:true, number, total:order.total });
  }

  // ── USER API (requires auth) ──────────────────────────────────────────
  if (p==='/api/user/profile' && m==='GET') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    const u2 = db.read('users').find(x=>x.id===user.id);
    if (!u2) return err(res,'Not found',404);
    return ok(res,{ id:u2.id, email:u2.email, name:u2.name, phone:u2.phone });
  }

  if (p==='/api/user/profile' && m==='PUT') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    const b = await readJSON(req);
    const users = db.read('users');
    const u2 = users.find(x=>x.id===user.id);
    if (!u2) return err(res,'Not found',404);
    if (b.name)  u2.name  = b.name;
    if (b.phone) u2.phone = b.phone;
    if (b.password) u2.password = hashPass(b.password);
    db.write('users',users);
    return ok(res,{ok:true});
  }

  if (p==='/api/user/orders' && m==='GET') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    return ok(res, db.read('orders').filter(o=>o.user_id===user.id));
  }

  if (p==='/api/user/notifications' && m==='GET') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    return ok(res, db.read('notifications').filter(n=>n.user_id===user.id).slice(0,50));
  }

  if (p==='/api/user/notifications/read' && m==='POST') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    const notifs = db.read('notifications');
    notifs.filter(n=>n.user_id===user.id).forEach(n=>n.read=true);
    db.write('notifications',notifs);
    return ok(res,{ok:true});
  }

  if (p==='/api/user/push-status' && m==='GET') {
    const user = authUser(req);
    if (!user) return err(res,'Unauthorized',401);
    const count = db.read('subscribers').filter(s=>s.user_id===user.id).length;
    return ok(res,{ subscribed: count>0 });
  }

  // ── ADMIN API ─────────────────────────────────────────────────────────
  // Accept both Bearer token and cookie for admin
  const authHeader = req.headers['authorization']||'';
  const cookies2 = req.headers.cookie||'';
  const cm2 = cookies2.match(/at=([^;\s]+)/);
  const cookieAdmin = cm2 ? (verifyToken(cm2[1])?.admin===true) : false;
  const isAdmin = authHeader === `Bearer ${ADMIN_PASS}` || cookieAdmin;

  if (p==='/api/admin/stats' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const orders = db.read('orders'), users = db.read('users'), subs = db.read('subscribers'), prods = db.read('products');
    const today  = new Date().toDateString();
    const todayOrders = orders.filter(o=>new Date(o.created_at).toDateString()===today);
    const revenue = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
    const todayRev= todayOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
    const wpOk = (()=>{ try{require('web-push');return true;}catch{return false;} })();
    return ok(res,{ orders:orders.length, newOrders:orders.filter(o=>o.status==='new').length, todayOrders:todayOrders.length, todayRevenue:todayRev, revenue, users:users.length, subscribers:subs.length, products:prods.length, wpOk });
  }

  if (p==='/api/admin/orders' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const status = u.searchParams.get('status')||'';
    let orders = db.read('orders');
    if (status) orders = orders.filter(o=>o.status===status);
    return ok(res, orders);
  }

  if (p.match(/^\/api\/admin\/orders\/\d+\/status$/) && m==='PUT') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const id = parseInt(p.split('/')[4]);
    const b  = await readJSON(req);
    const orders = db.read('orders');
    const order  = orders.find(x=>x.id===id);
    if (!order) return err(res,'Not found',404);
    order.status     = b.status;
    order.updated_at = new Date().toISOString();
    db.write('orders',orders);

    // Push to user + save notification
    const statusLabels = { processing:'⚙️ Готовится', delivery:'🚚 В доставке', done:'✅ Выполнен', cancelled:'❌ Отменён' };
    const label = statusLabels[b.status]||b.status;
    if (order.user_id) {
      const notifs = db.read('notifications');
      notifs.unshift({ id:nextId(notifs), user_id:order.user_id, title:`Заказ ${order.number}`, body:`Статус изменён: ${label}`, read:false, created_at:new Date().toISOString() });
      db.write('notifications',notifs);
      // Push to user's subscriptions
      const userSubs = db.read('subscribers').filter(s=>s.user_id===order.user_id);
      for (const s of userSubs) {
        await sendPush(s, { title:`Заказ ${order.number}`, body:`Статус: ${label}`, url:'/account' });
      }
    }
    return ok(res,{ok:true});
  }

  if (p==='/api/admin/products' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    return ok(res, db.read('products').sort((a,b)=>(a.sort||0)-(b.sort||0)));
  }

  if (p==='/api/admin/products' && m==='POST') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    try {
      const { fields:f, files } = await parseMultipart(req);
      const prods = db.read('products');
      const images = files.filter(x=>x.field==='images').map(x=>x.url);
      prods.push({ id:nextId(prods), name:f.name||'', description:f.description||'', composition:f.composition||'', nutrition:{ cal:parseInt(f.cal)||0, prot:parseInt(f.prot)||0, fat:parseInt(f.fat)||0, carb:parseInt(f.carb)||0 }, weight:f.weight||'', price:parseFloat(f.price)||0, old_price:f.old_price?parseFloat(f.old_price):null, category:f.category||'', images, tags:f.tags?f.tags.split(',').map(t=>t.trim()).filter(Boolean):[], in_stock:f.in_stock==='0'?0:1, sort:parseInt(f.sort)||0, created_at:new Date().toISOString() });
      db.write('products',prods);
      return ok(res,{ok:true});
    } catch(e) { return err(res,e.message,500); }
  }

  if (p.match(/^\/api\/admin\/products\/\d+$/) && m==='PUT') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const id = parseInt(p.split('/').pop());
    try {
      const { fields:f, files } = await parseMultipart(req);
      const prods = db.read('products');
      const pr    = prods.find(x=>x.id===id);
      if (!pr) return err(res,'Not found',404);
      let images = [...(pr.images||[])];
      const newImgs = files.filter(x=>x.field==='images').map(x=>x.url);
      if (newImgs.length) images = [...images,...newImgs];
      if (f.remove_image) { images=images.filter(i=>i!==f.remove_image); const fp2=path.join(UPLOADS,path.basename(f.remove_image)); if(fs.existsSync(fp2))fs.unlinkSync(fp2); }
      Object.assign(pr, { name:f.name||pr.name, description:f.description||pr.description, composition:f.composition||pr.composition, nutrition:{ cal:parseInt(f.cal)||pr.nutrition?.cal||0, prot:parseInt(f.prot)||pr.nutrition?.prot||0, fat:parseInt(f.fat)||pr.nutrition?.fat||0, carb:parseInt(f.carb)||pr.nutrition?.carb||0 }, weight:f.weight||pr.weight, price:parseFloat(f.price)||pr.price, old_price:f.old_price?parseFloat(f.old_price):null, category:f.category||pr.category, images, tags:f.tags?f.tags.split(',').map(t=>t.trim()).filter(Boolean):pr.tags, in_stock:f.in_stock==='0'?0:1, sort:parseInt(f.sort)||pr.sort||0 });
      db.write('products',prods);
      return ok(res,{ok:true});
    } catch(e) { return err(res,e.message,500); }
  }

  if (p.match(/^\/api\/admin\/products\/\d+$/) && m==='DELETE') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const id = parseInt(p.split('/').pop());
    const prods = db.read('products');
    const pr = prods.find(x=>x.id===id);
    if (pr) { (pr.images||[]).forEach(img=>{ const fp2=path.join(UPLOADS,path.basename(img)); if(fs.existsSync(fp2))fs.unlinkSync(fp2); }); }
    db.write('products',prods.filter(x=>x.id!==id));
    return ok(res,{ok:true});
  }

  if (p==='/api/admin/push/send' && m==='POST') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    try { require('web-push'); } catch { return err(res,'web-push not installed',500); }
    const b = await readJSON(req);
    const subs = db.read('subscribers');
    if (!subs.length) return ok(res,{sent:0,failed:0});
    let sent=0,failed=0,expired=[];
    for (const s of subs) {
      s.unread=(s.unread||0)+1;
      const r = await sendPush(s,{ title:b.title||'🔔', body:b.body||'', url:b.url||'/', unread:s.unread });
      if (r.ok) { sent++; } else { s.unread=Math.max(0,s.unread-1); failed++; if(r.statusCode===410||r.statusCode===404) expired.push(s.id); }
    }
    db.write('subscribers', subs.filter(s=>!expired.includes(s.id)));
    return ok(res,{sent,failed});
  }

  if (p==='/api/admin/settings' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    return ok(res, db.readObj('settings'));
  }

  if (p==='/api/admin/settings' && m==='POST') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    try {
      const { fields:f, files } = await parseMultipart(req);
      const s = db.readObj('settings');
      const allowed = ['shop_name','phone','address','whatsapp','telegram','working_hours','min_order','free_delivery_from'];
      allowed.forEach(k => { if (f[k]!==undefined) s[k] = f[k]; });
      if (f.min_order)          s.min_order          = parseFloat(f.min_order)||0;
      if (f.free_delivery_from) s.free_delivery_from = parseFloat(f.free_delivery_from)||0;
      const logo = files.find(x=>x.field==='logo');
      const fav  = files.find(x=>x.field==='favicon');
      if (logo) s.logo_url    = logo.url;
      if (fav)  s.favicon_url = fav.url;
      if (f.delivery_zones) { try { s.delivery_zones = JSON.parse(f.delivery_zones); } catch {} }
      db.writeObj('settings',s);
      return ok(res,{ok:true});
    } catch(e) { return err(res,e.message,500); }
  }

  if (p==='/api/admin/subscribers' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    return ok(res, db.read('subscribers').map(s=>({ id:s.id, user_agent:s.user_agent, unread:s.unread||0, user_id:s.user_id, created_at:s.created_at, last_seen:s.last_seen })));
  }

  if (p.match(/^\/api\/admin\/subscribers\/.+$/) && m==='DELETE') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    db.write('subscribers', db.read('subscribers').filter(s=>s.id!==p.split('/').pop()));
    return ok(res,{ok:true});
  }

  if (p==='/api/admin/analytics' && m==='GET') {
    if (!isAdmin) return err(res,'Unauthorized',401);
    const orders = db.read('orders').filter(o=>o.status!=='cancelled');
    const byDay  = {};
    orders.forEach(o => {
      const day = o.created_at.slice(0,10);
      if (!byDay[day]) byDay[day] = { date:day, orders:0, revenue:0 };
      byDay[day].orders++;
      byDay[day].revenue += o.total;
    });
    const days = Object.values(byDay).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
    const topProducts = {};
    orders.forEach(o => { (o.items||[]).forEach(i => { if(!topProducts[i.name]) topProducts[i.name]={name:i.name,qty:0,revenue:0}; topProducts[i.name].qty+=i.qty; topProducts[i.name].revenue+=i.price*i.qty; }); });
    const top = Object.values(topProducts).sort((a,b)=>b.qty-a.qty).slice(0,10);
    return ok(res,{ days, topProducts:top });
  }

  // ── STATIC ────────────────────────────────────────────────────────────
  if (p.startsWith('/uploads/')) return serveFile(path.join(__dirname,p), res);
  if (p.startsWith('/static/'))  return serveFile(path.join(__dirname,'static',p.slice(8)), res);

  // Admin login page (no JS needed)
  if (p==='/admin-login') {
    if (m==='GET') {
      const hasErr = u.searchParams.get('err');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
      res.end(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Вход — Админ</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f4f4f4;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif}.box{background:#fff;border:2px solid #111;padding:40px;width:100%;max-width:360px}h2{font-size:22px;font-weight:700;margin-bottom:6px;font-family:Georgia,serif}p{font-size:13px;color:#555;margin-bottom:20px}label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:5px;margin-top:12px}input{width:100%;border:1.5px solid #ddd;padding:10px 12px;font-size:14px;outline:none;margin-bottom:16px;border-radius:3px}input:focus{border-color:#111}button{width:100%;background:#111;color:#fff;border:none;padding:11px;font-size:14px;font-weight:600;cursor:pointer;border-radius:3px}.err{color:#c0392b;font-size:13px;margin-top:10px;padding:8px;background:#fef2f2;border:1px solid #fca5a5}</style></head><body><div class="box"><h2>Администратор</h2><p>Введите пароль для входа в панель</p><form method="POST" action="/admin-login"><label>Пароль</label><input type="password" name="pass" autofocus placeholder="Пароль"/><button type="submit">Войти →</button>${hasErr?'<div class="err">Неверный пароль</div>':''}</form></div></body></html>`);
      return;
    }
    if (m==='POST') {
      let body = '';
      await new Promise(r=>{ req.on('data',c=>body+=c); req.on('end',r); });
      const pass = decodeURIComponent((body.match(/pass=([^&]*)/)||[])[1]||'').replace(/\+/g,' ');
      console.log('LOGIN ATTEMPT, pass match:', pass===ADMIN_PASS);
      if (pass === ADMIN_PASS) {
        const token = signToken({ admin:true, exp:Date.now()+8*60*60*1000 });
        res.writeHead(302,{ 'Location':'/admin', 'Set-Cookie':`at=${token}; Path=/; HttpOnly; Max-Age=28800; SameSite=Lax; Secure` });
        res.end(); return;
      } else {
        res.writeHead(302,{'Location':'/admin-login?err=1'}); res.end(); return;
      }
    }
  }

  // Check admin cookie
  function getAdminCookie(req) {
    const cookies = req.headers.cookie||'';
    const cm = cookies.match(/at=([^;\s]+)/);
    if (!cm) return false;
    const payload = verifyToken(cm[1]);
    return payload?.admin === true;
  }

  if (p==='/admin'||p==='/admin/') {
    if (!getAdminCookie(req)) { res.writeHead(302,{'Location':'/admin-login'}); res.end(); return; }
    return serveFile(path.join(__dirname,'admin','index.html'), res);
  }
  if (p.startsWith('/admin/')) {
    return serveFile(path.join(__dirname,'admin',p.slice(7)), res);
  }

  if (p==='/account'||p==='/account/') return serveFile(path.join(__dirname,'public','account.html'), res);
  serveFile(path.join(__dirname,'public', p==='/'?'index.html':p), res);
});

loadVapid();

// Startup diagnostics
console.log('__dirname:', __dirname);
console.log('public exists:', fs.existsSync(path.join(__dirname,'public')));
console.log('index.html exists:', fs.existsSync(path.join(__dirname,'public','index.html')));
console.log('admin exists:', fs.existsSync(path.join(__dirname,'admin')));
console.log('Files in __dirname:', fs.readdirSync(__dirname).join(', '));

server.listen(PORT, () => {
  console.log(`\n🍕 Food Shop PWA → http://localhost:${PORT}`);
  console.log(`   Admin  → http://localhost:${PORT}/admin  (pass: ${ADMIN_PASS})\n`);
});
