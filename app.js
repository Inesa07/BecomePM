/* Become PM — game engine. Case content lives in cases.js, learning content in library.js. */
{
const CASES = window.BPM_CASES, PEOPLE = window.BPM_PEOPLE;
const GLOSSARY = window.BPM_GLOSSARY, PRINCIPLES = window.BPM_PRINCIPLES, STORIES = window.BPM_STORIES;

/* ---------- helpers ---------- */
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const HAIR = {
  long: [c => `<path d="M11 24c0-9 5-14 11-14s11 5 11 14v8h-4v-9H15v9h-4z" fill="${c}"/>`, c => `<path d="M14 19c2-6 14-7 16 0-4-2-11-3-16 0z" fill="${c}"/>`],
  short: [() => '', c => `<path d="M14 19c0-6 4-8 8-8s8 2 8 8c-3-3-13-3-16 0z" fill="${c}"/>`],
  curly: [() => '', c => `<circle cx="16" cy="15" r="3.5" fill="${c}"/><circle cx="20" cy="12.5" r="3.5" fill="${c}"/><circle cx="24.5" cy="12.5" r="3.5" fill="${c}"/><circle cx="28" cy="15.5" r="3.5" fill="${c}"/>`],
  bun: [c => `<circle cx="22" cy="10.5" r="4.2" fill="${c}"/>`, c => `<path d="M14 20c0-6 4-8.5 8-8.5s8 2.5 8 8.5c-3-4-13-4-16 0z" fill="${c}"/>`],
  bob: [c => `<path d="M13 23c0-8 4-12 9-12s9 4 9 12v5h-3v-7H16v7h-3z" fill="${c}"/>`, c => `<path d="M14 19c2-5 14-6 16 0-5-2-11-2-16 0z" fill="${c}"/>`]
};
function av(id, size = 40, mood = 'neutral') {
  const p = PEOPLE[id] || PEOPLE.me, h = HAIR[p.style];
  const eyes = mood === 'happy'
    ? '<path d="M17.8 22q1.2-1.4 2.4 0M23.8 22q1.2-1.4 2.4 0" stroke="#1E1B16" stroke-width="1" fill="none" stroke-linecap="round"/>'
    : '<circle cx="19" cy="22" r="1" fill="#1E1B16"/><circle cx="25" cy="22" r="1" fill="#1E1B16"/>';
  const mouth = { neutral:'M19 25.5q3 2.5 6 0', sad:'M19.5 26.5q2.5-1.5 5 0', happy:'M18.5 25q3.5 3.5 7 0' }[mood];
  const glasses = p.glasses ? '<circle cx="19" cy="22" r="2.4" fill="none" stroke="#2D2A32" stroke-width=".9"/><circle cx="25" cy="22" r="2.4" fill="none" stroke="#2D2A32" stroke-width=".9"/><path d="M21.4 22h1.2" stroke="#2D2A32" stroke-width=".9"/>' : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" role="img" aria-label="${p.name || 'Ты'}" style="flex:none"><circle cx="22" cy="22" r="22" fill="${p.bg}"/><path d="M8 44c2-9 8-13 14-13s12 4 14 13z" fill="${p.shirt}"/>${h[0](p.hair)}<circle cx="22" cy="21" r="8" fill="${p.skin}"/>${h[1](p.hair)}${eyes}${glasses}<path d="${mouth}" stroke="#1E1B16" stroke-width="1.05" fill="none" stroke-linecap="round"/></svg>`;
}
const SPARK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#F2B56B" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
const MAX_DAY = 20, MAX_TURNS = 4;
const SOURCES = [
  { id:'overview', label:'Обзор', cost:0, color:'#EEF0EC', tag:['#E5E5E5','#333'] },
  { id:'analytics', label:'Аналитика', cost:1, color:'#F2B56B', tag:['#F6E2C2','#6B4614'] },
  { id:'users', label:'Интервью', cost:0, color:'#5FB3A8', tag:['#D3ECE8','#1E5A52'], title:'Интервью с пользователями', sub:'Каждый разговор занимает 1 день. От того, как ты спрашиваешь, зависит, что ты узнаешь.' },
  { id:'support', label:'Поддержка', cost:1, color:'#E39A8C', tag:['#F4DAD4','#7A3426'], title:'Обращения в поддержку', sub:'Что писали за последний месяц. Самое громкое — не всегда самое важное.' },
  { id:'team', label:'Команда', cost:1, color:'#9FC7E6', tag:['#DCE9F4','#264B6B'], title:'Рабочий чат команды', sub:'Коллеги знают то, чего нет в отчётах.' },
  { id:'ceo', label:'CEO', cost:0, color:'#C9B6E4', tag:['#E7DFF3','#4A3470'], title:'Сообщение от CEO', sub:'Мнение руководителя важно учесть, но это ещё не факт.' }
];
const SRC = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const LEVELS = [[0, 'Стажёр'], [150, 'Младший продакт'], [320, 'Продакт'], [520, 'Старший продакт'], [800, 'Head of Product']];
const ORDER = 'SABCD';
const better = (a, b) => !a ? b : !b ? a : ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b;

/* ---------- state ---------- */
const fresh = caseId => ({ view:'home', caseId: caseId || 'fitstart', day:1, src:'overview', opened:{}, talked:{}, person:null, asked:{}, ins:[], last:null, cause:null, fix:null, ev:[], result:null, warn:'', step:0, hidden:{}, auth:null, d:null, aiQuality:null, aiFeedback:'', tab:'glossary', q:'' });
let S = fresh();
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
let XP = +store.get('becomepm-xp2', 0) || 0;
let PROG = store.get('becomepm-cases', {}) || {}; // { caseId: { grade, bestScore, plays } }
(() => { // migrate the first version's saved data
  try { const oldBest = localStorage.getItem('becomepm-best'), oldXp = +localStorage.getItem('becomepm-xp') || 0;
    if (oldBest && !PROG.fitstart) PROG.fitstart = { grade: oldBest, bestScore: 0, plays: 1 };
    if (oldXp > XP) XP = oldXp; } catch (e) {}
})();
const persist = () => { store.set('becomepm-xp2', XP); store.set('becomepm-cases', PROG); };
const C = () => CASES.find(c => c.id === S.caseId) || CASES[0];
const INS = () => C().ins;
const app = document.getElementById('app');
const go = v => { if (v === 'library' && S.view !== 'library') S.prev = S.view; S.view = v; S.last = null; render(); window.scrollTo(0, 0); };
const level = () => { let i = 0; LEVELS.forEach((l, k) => { if (XP >= l[0]) i = k; }); const next = LEVELS[i + 1]; return { n: i + 1, name: LEVELS[i][1], from: LEVELS[i][0], to: next ? next[0] : LEVELS[i][0] + 300 }; };
const levelPct = () => { const lv = level(); return Math.min(100, Math.round((XP - lv.from) / (lv.to - lv.from) * 100)); };
const unlocked = c => c.n === 1 || !!PROG[CASES[c.n - 2].id];
const nextCase = () => CASES.find(c => !PROG[c.id] && unlocked(c)) || CASES[0];
const supportOf = h => { let pro = 0, con = 0; S.ins.forEach(k => { const i = INS()[k]; if (i.hyp === h) { i.s > 0 ? pro++ : con++; } }); return { pro, con }; };
const daysLeft = () => MAX_DAY - S.day;
const startCase = id => { S = Object.assign(fresh(id), { view:'brief', auth:null }); render(); window.scrollTo(0, 0); };

/* ---------- accounts (Supabase) ---------- */
const SB_URL = 'https://hugsvebdqfmvpleqitym.supabase.co';
const SB_KEY = 'sb_publishable_mvBhXP7ZpL5shSWbWJ-lTg_Crdu3-Ha'; // public key, safe in website code
const AI_URL = SB_URL + '/functions/v1/ceo-chat';
const sb = (typeof supabase !== 'undefined' && supabase.createClient) ? supabase.createClient(SB_URL, SB_KEY) : null;
let user = null;
const RU_ERR = m => /Invalid login/i.test(m) ? 'Неверный email или пароль.'
  : /already registered|already exists/i.test(m) ? 'Такой email уже зарегистрирован. Попробуй войти.'
  : /at least 6|Password should/i.test(m) ? 'Пароль должен быть не короче 6 символов.'
  : /Email not confirmed/i.test(m) ? 'Сначала подтверди email — ссылка в письме.'
  : /valid email|invalid format/i.test(m) ? 'Проверь, правильно ли написан email.'
  : /rate limit|too many/i.test(m) ? 'Слишком много попыток. Подожди пару минут.'
  : 'Что-то пошло не так: ' + m;
const bestOverall = () => Object.values(PROG).reduce((b, p) => better(b, p.grade), null);
async function setUser(u) {
  user = u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0] } : null;
  if (user) await syncProgress();
  render();
}
function mergeCases(remote) {
  Object.entries(remote || {}).forEach(([id, r]) => {
    const l = PROG[id] || {};
    PROG[id] = { grade: better(l.grade, r.grade), bestScore: Math.max(l.bestScore || 0, r.bestScore || 0), plays: Math.max(l.plays || 0, r.plays || 0), last: r.last || l.last };
  });
}
async function syncProgress() {
  if (!sb || !user) return;
  try {
    const { data } = await sb.from('becomepm_progress').select('xp,best_grade,cases').eq('user_id', user.id).maybeSingle();
    if (data) { XP = Math.max(XP, data.xp || 0); mergeCases(data.cases); persist(); }
    await saveProgress();
  } catch (e) { console.warn('progress sync failed', e); }
}
async function saveProgress() {
  if (!sb || !user) return;
  try {
    const { error } = await sb.from('becomepm_progress').upsert({ user_id: user.id, xp: XP, best_grade: bestOverall(), cases: PROG, updated_at: new Date().toISOString() });
    if (error) console.warn('save failed', error.message);
  } catch (e) { console.warn('save failed', e); }
}
async function authSubmit() {
  if (!sb) { S.auth = 'soon'; return render(); }
  const v = id => (document.getElementById(id) || {}).value || '';
  const email = v('a-mail').trim(), pass = v('a-pass'), name = v('a-name').trim();
  S.authName = name; S.authMail = email;
  if (!email || !pass) { S.authErr = 'Заполни email и пароль.'; return render(); }
  S.authBusy = true; S.authErr = ''; render();
  try {
    if (S.auth === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name: name || email.split('@')[0] }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      S.auth = data.session ? 'welcome' : 'check';
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      S.auth = 'welcome';
    }
  } catch (e) { S.authErr = RU_ERR(e.message || String(e)); }
  S.authBusy = false; render();
}
async function logout() { if (sb) await sb.auth.signOut(); user = null; render(); }
if (sb) {
  sb.auth.getSession().then(({ data }) => setUser(data.session && data.session.user));
  sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setUser(session && session.user); });
}

/* ---------- shared pieces ---------- */
const logo = () => `<button class="logo" data-go="home"><b>B</b><span>Become PM</span></button>`;
const authArea = () => user
  ? `<div style="display:flex;gap:10px;align-items:center">${av('me', 32)}<span style="font-size:14px;font-weight:600">${esc(user.name)}</span><button class="line-btn" data-logout style="font-size:13px;min-height:36px;padding:6px 12px">Выйти</button></div>`
  : `<button class="line-btn" data-auth="login" style="font-size:14px;min-height:40px">Войти</button><button class="btn" data-auth="signup" style="padding:9px 18px;min-height:40px;font-size:14px">Регистрация</button>`;
const header = (extra = '') => `<header class="top">${logo()}<nav class="topnav">${extra}<button class="navlink" data-go="hub">Кейсы</button><button class="navlink" data-lib="glossary">Словарь</button><button class="navlink" data-help="open">Как играть</button>${authArea()}</nav></header>`;
const saveBtn = (k, label = '+ Сохранить инсайт') => S.ins.includes(k) ? `<button class="done" data-save="${k}">✓ Сохранено</button>` : `<button class="ghost" data-save="${k}">${label}</button>`;
const footer = () => `<footer class="foot"><div>${logo()}<p>Игра-симулятор для будущих продакт-менеджеров. Все компании и люди в кейсах выдуманы.</p></div><div class="foot-links"><button class="navlink" data-go="hub">Кейсы</button><button class="navlink" data-lib="glossary">Словарь продакта</button><button class="navlink" data-lib="principles">Мышление продакта</button><button class="navlink" data-lib="stories">Истории продуктов</button><a class="navlink" href="https://github.com/Inesa07/BecomePM">GitHub</a></div><p class="foot-small">Сделано Inesa · ${new Date().getFullYear()}</p></footer>`;

/* ---------- actions ---------- */
function openSource(id) {
  const s = SRC[id];
  if (!S.opened[id]) {
    if (s.cost > daysLeft()) { S.warn = 'Не хватает дней, чтобы открыть этот источник. Пора принимать решение.'; render(); return; }
    S.day += s.cost; S.opened[id] = true;
  }
  S.src = id; S.warn = ''; S.last = null; render();
}
function talk(id) {
  if (!S.talked[id]) {
    if (daysLeft() < 1) { S.warn = 'Не хватает дней на новое интервью. Пора принимать решение.'; render(); return; }
    S.day += 1; S.talked[id] = true;
  }
  S.person = id; S.warn = ''; S.last = null; render();
}
function save(k) {
  if (S.ins.includes(k)) { S.ins = S.ins.filter(x => x !== k); S.last = null; XP = Math.max(0, XP - 10); }
  else { S.ins.push(k); S.last = k; XP += 10; }
  persist(); render();
}

/* ---------- workspace ---------- */
function chart(ch) {
  const max = Math.max(...ch.bars.map(b => b[1]));
  const label = (v, i) => i === ch.hot && ch.hotLabel ? ch.hotLabel : v + ch.unit;
  return `${ch.title ? `<span style="font-weight:600">${ch.title}</span>` : ''}
    <div class="chart" style="height:${ch.small ? 130 : 180}px" role="img" aria-label="${esc((ch.title || '') + ': ' + ch.bars.map(b => b[0] + ' ' + b[1] + ch.unit).join(', '))}">${ch.bars.map((b, i) => `<div class="${i === ch.hot ? 'hot' : ''}"><em>${label(b[1], i)}</em><u style="height:${b[1] / max * 86}%"></u></div>`).join('')}</div>
    <div class="axis">${ch.bars.map(b => `<span>${b[0]}</span>`).join('')}</div>
    <div class="find"><span class="serif it">${ch.caption}</span>${saveBtn(ch.ins)}</div>`;
}
function topBar() {
  const c = C(), lv = level();
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;gap:3px"><span style="font-size:12px;color:var(--mute)">Кейс ${c.n} · ${c.company}</span><span class="serif" style="font-size:20px">${c.title}</span></div>
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:130px"><span style="font-size:12px;color:var(--mute)">День <b style="color:var(--ink)">${S.day}</b> из ${MAX_DAY}</span><div class="bar"><i style="width:${S.day / MAX_DAY * 100}%"></i></div></div>
      <div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:999px;padding:5px 14px 5px 5px">${av('me', 28)}<div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:12px"><b>Ур. ${lv.n}</b> <span style="color:var(--mute)">· ${lv.name}</span></span><div class="bar" style="width:110px"><i style="width:${levelPct()}%"></i></div></div></div>
      <button class="${S.ins.length >= 2 ? 'btn' : 'ghost'}" data-go="decide">Принять решение</button>
    </div>
  </div>`;
}
function sourceView() {
  const c = C(), s = SRC[S.src];
  if (S.src === 'overview') {
    return `<section class="card" style="padding:clamp(20px,3vw,30px);display:flex;flex-direction:column;gap:22px;flex:1">
      <div style="display:flex;flex-direction:column;gap:8px"><span class="label" style="color:var(--amber)">День ${S.day} · обзор</span><h2 class="serif" style="margin:0;font-weight:500;font-size:clamp(26px,3.5vw,32px)">С чего начнём?</h2><p class="lead" style="font-size:16px">${c.problem}</p></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="flex:1 1 200px;background:var(--panel2);border-radius:12px;padding:16px 18px"><span style="font-size:12px;color:var(--mute)">${c.metric.label}</span><div class="serif" style="font-size:28px">${c.metric.now} <span style="font-family:Manrope;font-size:13px;color:var(--rose)">${c.metric.was}</span></div></div>
        <div style="flex:1 1 200px;background:var(--panel2);border-radius:12px;padding:16px 18px"><span style="font-size:12px;color:var(--mute)">Времени на решение</span><div class="serif" style="font-size:28px">${daysLeft()} <span style="font-family:Manrope;font-size:13px;color:var(--mute)">рабочих дней</span></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px"><span class="label">Где искать ответы</span>
        <div class="srcgrid">${SOURCES.filter(x => x.id !== 'overview').map(x => `<button class="pcard" data-src="${x.id}" style="gap:6px"><span style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:${x.color};width:9px;height:9px"></span><b style="font-weight:600;font-size:16px">${x.label}</b></span><span style="font-size:14px;color:var(--soft)">${c.blurb[x.id]}</span><span style="font-size:12px;color:${S.opened[x.id] ? 'var(--teal)' : 'var(--amber)'}">${S.opened[x.id] ? 'уже открыто' : x.id === 'users' ? '1 день за разговор' : x.cost ? x.cost + ' день' : 'бесплатно'}</span></button>`).join('')}</div>
      </div>
    </section>`;
  }
  let title = s.title, sub = s.sub, body = '';
  if (S.src === 'analytics') {
    title = c.analytics.title; sub = c.analytics.sub;
    body = c.analytics.charts.map((ch, i) => `<div style="display:flex;flex-direction:column;gap:12px;${i ? 'border-top:1px solid var(--line);padding-top:18px' : ''}">${chart(ch)}</div>`).join('');
  }
  if (S.src === 'users') {
    body = `<div class="people">${c.interviews.map(id => { const iv = c.people[id]; return `<button class="pcard ${S.person === id && S.talked[id] ? 'on' : ''}" data-talk="${id}"><div class="person">${av(id, 40, iv.mood)}<div style="display:flex;flex-direction:column"><b style="font-weight:600">${iv.who}</b><span style="font-size:12px;color:var(--mute)">${iv.note}</span></div></div><span style="font-size:12px;color:${S.talked[id] ? 'var(--teal)' : 'var(--amber)'}">${S.talked[id] ? 'разговор открыт' : 'поговорить · 1 день'}</span></button>`; }).join('')}</div>`;
    if (S.person && S.talked[S.person]) {
      const iv = c.people[S.person], key = q => S.person + '|' + q;
      const chat = iv.qs.map((q, i) => S.asked[key(i)] ? `<div class="bubble-q">${q.q}</div><div class="bubble-a ${q.ins && !q.tip ? 'good' : ''}">${q.a}</div>${q.tip ? `<span class="tip">${q.tip}</span>` : ''}${q.extra ? `<span class="tip" style="color:var(--teal)">${q.extra}</span>` : ''}${q.ins ? `<div>${saveBtn(q.ins)}</div>` : ''}` : '').join('');
      const left = iv.qs.map((q, i) => S.asked[key(i)] ? '' : `<button class="line-btn" data-ask="${S.person}|${i}">${q.q}</button>`).join('');
      body += `<div style="border-top:1px solid var(--line);padding-top:16px;display:flex;flex-direction:column;gap:12px">
        <div class="person">${av(S.person, 48, iv.mood)}<div><b style="font-weight:600">${iv.who}</b><div style="font-size:12px;color:var(--mute)">${iv.note}</div></div></div>
        ${chat || '<span style="color:var(--mute)">Выбери, с какого вопроса начать.</span>'}
        ${left ? `<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:12px"><span class="label">Спросить</span><div style="display:flex;gap:8px;flex-wrap:wrap">${left}</div></div>` : ''}
      </div>`;
    } else body += `<p class="serif it" style="color:var(--mute);margin:0">Выбери, с кем поговорить. Каждый разговор занимает один рабочий день.</p>`;
  }
  if (S.src === 'support') {
    const sp = c.support;
    body = `<div class="person">${av(sp.who, 44)}<span class="quote" style="font-size:16px">${PEOPLE[sp.who].name}: «${sp.intro}»</span></div><div>${sp.rows.map(r => `<div class="row"><div><div class="serif" style="font-size:18px;${r.noise ? 'color:var(--soft)' : ''}">${r.text}</div><div style="font-size:13px;color:var(--mute)">${r.meta}</div></div>${r.noise ? `<span style="font-size:13px;color:var(--mute)">${r.noise}</span>` : saveBtn(r.ins, '+ Инсайт')}</div>`).join('')}</div>`;
  }
  if (S.src === 'team') {
    body = c.team.map((m, i) => `<div class="msg" style="${i ? 'border-top:1px solid var(--line);padding-top:16px' : ''}">${av(m.who, 46)}<div style="display:flex;flex-direction:column;gap:6px"><span><b>${PEOPLE[m.who].name}</b> <span style="color:var(--mute);font-size:12px">${m.role}</span></span><span class="quote">«${m.text}»</span><div>${saveBtn(m.ins)}</div></div></div>`).join('');
  }
  if (S.src === 'ceo') {
    body = `<div class="msg">${av(c.ceo, 48)}<div style="display:flex;flex-direction:column;gap:6px"><span><b>${c.ceoName}</b> <span style="color:var(--mute);font-size:12px">CEO · 10:42</span></span><span class="quote">«${c.ceoMsg.text}»</span><div>${saveBtn(c.ceoMsg.ins, '+ Сохранить как мнение')}</div></div></div>`;
  }
  return `<section class="card" style="padding:22px;display:flex;flex-direction:column;gap:16px;flex:1"><div><div class="serif" style="font-size:24px">${title}</div><div style="font-size:13px;font-weight:300;color:var(--soft)">${sub}</div></div>${body}</section>`;
}
function insightsPanel() {
  const c = C();
  const cards = S.ins.map(k => { const i = c.ins[k], s = SRC[i.src]; return `<div class="ins ${k === S.last ? 'new' : ''}"><span class="tag" style="background:${s.tag[0]};color:${s.tag[1]}">${s.label}</span><span class="serif">${i.text}</span></div>`; }).join('');
  const hyps = c.hyps.map(h => { const { pro, con } = supportOf(h.id); const strong = pro >= 3 && con === 0; return `<div class="hyp"><div style="display:flex;justify-content:space-between;gap:8px"><span>${h.title}</span><span class="serif" style="color:var(--amber)">${pro}</span></div><div class="bar"><i style="width:${Math.min(100, pro * 20)}%;background:${strong ? 'var(--teal)' : 'var(--amber)'}"></i></div><small>за: ${pro}${con ? ` · против: ${con}` : ''}${strong ? ' · <span style="color:var(--teal)">сильная гипотеза</span>' : ''}</small></div>`; }).join('');
  return `<span class="label">Инсайты · ${S.ins.length}</span>
    ${cards || '<p class="serif it" style="margin:0;color:var(--mute);font-size:15px;line-height:1.55">Сохраняй важное из источников — инсайты появятся здесь.</p>'}
    <span class="label" style="margin-top:14px">Гипотезы</span>${S.ins.length ? hyps : '<p style="margin:0;font-size:13px;color:var(--mute);line-height:1.6">Гипотезы — возможные причины проблемы. Они появятся, когда ты соберёшь первые инсайты.</p>'}`;
}
function mentorTip() {
  const c = C(), n = S.ins.length, talkedAny = Object.keys(S.talked).length > 0, askedAny = Object.keys(S.asked).length > 0;
  let id, text;
  if (S.src === 'overview' && n === 0 && !Object.keys(S.opened).length) { id = 't0'; text = 'Это твой рабочий стол. Здесь видно, где можно искать ответы. Каждый источник тратит рабочие дни, так что выбирай с умом. Многие продакты начинают с данных — чтобы понять, <i>что</i> происходит.'; }
  else if (n === 0 && S.src === 'analytics') { id = 't1'; text = 'Начни с данных. Где на графике самое резкое изменение? Нашла важное — нажми «Сохранить инсайт».'; }
  else if (n === 0 && S.src !== 'overview') { id = 't1b'; text = 'Изучай источник и сохраняй всё важное как инсайт — он появится справа.'; }
  else if (n === 1) { id = 't2'; text = 'Отлично, это твой первый инсайт! Он появился справа и добавил балл гипотезе. ' + c.tips.second; }
  else if (S.src === 'users' && !talkedAny) { id = 't3'; text = 'Выбери, с кем поговорить. Совет: спрашивай о том, что человек делал, а не что он думает или хотел бы.'; }
  else if (S.src === 'users' && talkedAny && !askedAny) { id = 't4'; text = 'Выбери вопрос внизу. Обрати внимание, какие вопросы дают полезные ответы, а какие — нет.'; }
  else if (!talkedAny) { id = 't5'; text = 'Данные показывают, <i>что</i> происходит. Чтобы понять <i>почему</i> — поговори с людьми. Открой «Интервью».'; }
  else if (!S.opened.team && n >= 3) { id = 't6'; text = c.tips.team; }
  else if (n >= 4) { id = 't7'; text = 'У тебя уже достаточно инсайтов. Когда будешь уверена — нажми «Принять решение».'; }
  else return '';
  if (S.hidden[id]) return '';
  return `<div class="nudge" style="border-color:#3B5A55">${av('mentor', 34, 'happy')}<span style="font-size:14px;flex:1;color:var(--soft)"><b style="color:var(--ink)">Вера:</b> ${text}</span><button class="line-btn" data-hide="${id}" style="font-size:13px;padding:6px 12px;min-height:36px">Понятно</button></div>`;
}
function work() {
  const c = C();
  const nav = SOURCES.map(s => `<button class="src ${S.src === s.id ? 'on' : ''}" data-src="${s.id}"><span class="dot" style="background:${s.color}"></span><span>${s.label}</span><small>${s.id === 'overview' || S.opened[s.id] ? '' : s.id === 'users' ? '1 день / чел.' : s.cost ? s.cost + ' день' : 'бесплатно'}</small></button>`).join('');
  const nudge = S.day >= 10 ? `<div class="nudge">${av(c.ceo, 30)}<span style="font-size:14px"><b>${c.ceoName}:</b> <span style="color:var(--soft)">«${S.day >= 15 ? c.nudges[1] : c.nudges[0]}»</span></span></div>` : '';
  const warn = S.warn ? `<div class="nudge" style="border-color:var(--rose)"><span style="color:var(--rose);font-size:14px">${S.warn}</span></div>` : '';
  const toast = S.last ? `<div class="toast" role="status">${SPARK}<span><b>Инсайт сохранён.</b> <span style="color:var(--soft)">${c.ins[S.last].text}</span></span><b style="color:var(--amber);white-space:nowrap">+10 опыта</b></div>` : '';
  return `<div class="ws">
    <nav class="side" aria-label="Источники">
      <span class="hide-m" style="padding:4px 8px 18px">${logo()}</span>
      <span class="label hide-m" style="padding:6px 10px">Источники</span>${nav}
      <div class="hide-m" style="margin-top:auto;display:flex;flex-direction:column;gap:8px"><button class="line-btn" data-lib="glossary" style="font-size:13px">Словарь продакта</button><button class="line-btn" data-help="open" style="font-size:13px">Как играть</button><button class="line-btn" data-go="hub" style="font-size:13px">← Все кейсы</button></div>
    </nav>
    <main class="main">${topBar()}${mentorTip()}${nudge}${warn}${sourceView()}</main>
    <aside class="aside">${insightsPanel()}</aside>
  </div>${toast}`;
}

/* ---------- decision: defend it in front of the CEO ---------- */
function dInit() {
  if (S.d) return;
  S.d = { mode: AI_URL && !window.BPM_NO_AI ? 'ai' : 'script', stage: 'cause', msgs: [], att: [], draft: '', busy: false, turns: 0 };
  S.d.msgs.push({ who: 'ceo', text: S.d.mode === 'ai' ? 'Ну что, рассказывай. В чём, по-твоему, причина и что будем делать? Можешь прикрепить инсайты как доказательства.' : 'Ну что, рассказывай. В чём, по-твоему, настоящая причина?' });
}
const okCount = (list, hyp) => list.filter(k => INS()[k].hyp === hyp && INS()[k].s > 0).length;
const scrollChat = () => { const el = document.getElementById('chat'); if (el) el.scrollTop = el.scrollHeight; };
function scriptAnswer(kind, id) {
  const c = C(), d = S.d;
  if (kind === 'cause') {
    S.cause = id; d.msgs.push({ who: 'me', text: c.hyps.find(h => h.id === id).title });
    d.msgs.push({ who: 'ceo', text: c.script.cause[id] }); d.stage = 'ev1';
  } else if (kind === 'ev') {
    const picked = d.att.slice(); d.att = [];
    picked.forEach(k => { if (!S.ev.includes(k) && S.ev.length < 3) S.ev.push(k); });
    d.msgs.push({ who: 'me', text: picked.length ? picked.map(k => '• ' + c.ins[k].text).join('\n') : 'Пока у меня нет доказательств.' });
    const ok = okCount(picked, S.cause);
    if (d.stage === 'ev1') {
      d.msgs.push({ who: 'ceo', text: ok >= 2 ? 'Хм. Это звучит убедительно. Ладно, и что ты предлагаешь делать?' : ok === 1 ? 'Один факт — это может быть совпадением. Но допустим. Что предлагаешь делать?' : 'Не убедила. Это не доказательство. Ну хорошо, что ты предлагаешь делать?' });
      d.stage = 'fix';
    } else {
      d.msgs.push({ who: 'ceo', text: ok >= 1 ? 'Хорошо. Аргументы есть — давай попробуем.' : 'Звучит слабо, но решение за тобой. Посмотрим, что получится.' });
      d.stage = 'done';
    }
  } else if (kind === 'fix') {
    S.fix = id; d.msgs.push({ who: 'me', text: c.fixes.find(f => f.id === id).title });
    d.msgs.push({ who: 'ceo', text: c.script.fix[id] }); d.stage = 'ev2';
  }
  render(); scrollChat();
}
async function callAI(mode) {
  const msgs = S.d.msgs.filter(m => m.who !== 'vera').map(m => ({ role: m.who === 'ceo' ? 'assistant' : 'user', content: m.text }));
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(AI_URL, { method:'POST', signal: ctrl.signal, headers:{ 'Content-Type':'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }, body: JSON.stringify({ mode, caseId: S.caseId, messages: msgs }) });
    if (!r.ok) { let info = ''; try { info = (await r.json()).error || ''; } catch (e) {} console.warn('AI error', r.status, info); throw new Error('http ' + r.status); }
    const j = await r.json();
    if (!j.reply) throw new Error('empty');
    return j.reply;
  } finally { clearTimeout(t); }
}
function fallback() {
  const d = S.d;
  d.mode = 'script'; d.busy = false; d.stage = 'cause'; S.cause = null; S.fix = null; S.ev = [];
  d.msgs.push({ who: 'vera', text: 'ИИ сейчас недоступен — продолжим в упрощённом режиме. Выбирай ответы ниже.' });
  d.msgs.push({ who: 'ceo', text: 'Так на чём мы остановились… В чём, по-твоему, настоящая причина?' });
  render(); scrollChat();
}
async function aiSend() {
  const d = S.d, text = (document.getElementById('draft') || {}).value || '';
  if (!text.trim() && !d.att.length) return;
  const att = d.att.slice(); d.att = [];
  att.forEach(k => { if (!S.ev.includes(k) && S.ev.length < 3) S.ev.push(k); });
  d.msgs.push({ who: 'me', text: text.trim() + (att.length ? (text.trim() ? '\n' : '') + att.map(k => '• ' + INS()[k].text).join('\n') : '') });
  d.draft = ''; d.busy = true; d.turns++; render(); scrollChat();
  try {
    d.msgs.push({ who: 'ceo', text: await callAI('chat') }); d.busy = false;
    if (d.turns >= MAX_TURNS) d.stage = 'done';
    render(); scrollChat();
  } catch (e) { fallback(); }
}
async function aiFinish() {
  const c = C(); S.d.busy = true; render();
  try {
    const raw = await callAI('evaluate');
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    S.cause = c.hyps.some(h => h.id === j.cause) ? j.cause : 'other';
    S.fix = c.fixes.some(f => f.id === j.fix) ? j.fix : 'other';
    S.aiQuality = Math.max(0, Math.min(10, +j.quality || 0));
    S.aiFeedback = String(j.feedback || '');
    evaluate(); go('result');
  } catch (e) { fallback(); }
}
function decide() {
  dInit();
  const c = C(), d = S.d;
  const bubble = m => m.who === 'me'
    ? `<div class="bubble-q" style="white-space:pre-line">${esc(m.text)}</div>`
    : m.who === 'vera'
      ? `<div class="person" style="align-self:center;background:var(--panel2);border-radius:12px;padding:10px 14px">${av('mentor', 28, 'happy')}<span style="font-size:13px;color:var(--soft)">${esc(m.text)}</span></div>`
      : `<div class="msg" style="max-width:85%">${av(c.ceo, 36)}<div class="bubble-a" style="max-width:100%;white-space:pre-line">${esc(m.text)}</div></div>`;
  const chips = S.ins.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${S.ins.map(k => `<button class="line-btn" data-att="${k}" style="font-size:13px;min-height:36px;padding:6px 12px;${d.att.includes(k) ? 'border-color:var(--amber);color:var(--amber)' : ''}">${d.att.includes(k) ? '✓ ' : '+ '}${c.ins[k].text}</button>`).join('')}</div>` : '<span style="font-size:13px;color:var(--mute)">У тебя нет сохранённых инсайтов — доказывать будет сложно.</span>';
  let controls;
  if (d.busy) controls = `<div class="person" style="color:var(--mute)">${av(c.ceo, 28)}<span>${c.ceoName} печатает…</span></div>`;
  else if (d.mode === 'ai' && d.stage !== 'done') controls = `
    <span class="label">Прикрепить инсайты</span>${chips}
    <textarea id="draft" rows="3" placeholder="Напиши своими словами: в чём причина, что предлагаешь и почему…" style="font:inherit;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line2);border-radius:12px;padding:12px 14px;resize:vertical;width:100%">${esc(d.draft)}</textarea>
    <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;align-items:center"><span style="font-size:12px;color:var(--mute)">Ответов: ${d.turns} из ${MAX_TURNS}</span><div style="display:flex;gap:10px">${d.turns ? '<button class="line-btn" data-finish>Завершить защиту</button>' : ''}<button class="btn" data-send>Отправить</button></div></div>`;
  else if (d.mode === 'ai') controls = `<button class="btn" data-finish>Узнать результат</button>`;
  else if (d.stage === 'cause') controls = `<span class="label">Твой ответ</span>${c.hyps.map(h => `<button class="opt" data-scause="${h.id}"><i></i><span>${h.title}</span></button>`).join('')}`;
  else if (d.stage === 'fix') controls = `<span class="label">Твой ответ</span>${c.fixes.map(f => `<button class="opt" data-sfix="${f.id}"><i></i><span style="display:flex;flex-direction:column"><span>${f.title}</span><span style="font-size:12px;color:var(--mute)">${f.note}</span></span></button>`).join('')}`;
  else if (d.stage === 'ev1' || d.stage === 'ev2') controls = `<span class="label">Ответь инсайтами (до 2)</span>${chips}<button class="btn" data-sev style="align-self:flex-start">Ответить</button>`;
  else controls = `<button class="btn" data-submit>Узнать результат</button>`;
  return `<div class="wrap" style="max-width:860px;display:flex;flex-direction:column;min-height:100vh">
    <header class="top">${logo()}<span style="font-size:13px;color:var(--mute)">День ${S.day} из ${MAX_DAY}</span></header>
    <button class="back" data-go="work">← Вернуться к работе</button>
    <div style="padding:14px 0 16px"><h1 class="serif" style="margin:0 0 6px;font-weight:500;font-size:clamp(28px,4vw,38px)">Защита решения</h1><p style="margin:0;color:var(--soft);font-weight:300">Убеди CEO — ${c.ceoName} будет задавать неудобные вопросы. Отвечай фактами.${d.mode === 'ai' ? '' : ' <span style="color:var(--mute)">(упрощённый режим)</span>'}</p></div>
    <div id="chat" class="card" style="flex:1;padding:20px;display:flex;flex-direction:column;gap:14px;overflow:auto;max-height:52vh;min-height:260px">${d.msgs.map(bubble).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:16px 0">${controls}</div>
  </div>`;
}

/* ---------- scoring & result ---------- */
function evaluate() {
  const c = C(), ins = c.ins;
  let score = 0;
  if (S.cause === c.cause) score += 35;
  score += S.fix === c.bestFix ? 35 : S.fix === c.partialFix ? 12 : 0;
  if (S.aiQuality != null) score += Math.round(S.aiQuality * 0.8);
  const proofs = S.ev.filter(k => ins[k].hyp === S.cause && ins[k].s > 0);
  const wrong = S.ev.filter(k => !(ins[k].hyp === S.cause && ins[k].s > 0));
  score += Math.min(3, proofs.length) * 6 - wrong.length * 4;
  if (S.ins.includes(c.keyIns)) score += 6;
  if (c.interviewIns.some(k => S.ins.includes(k))) score += 4;
  if (S.day <= 12) score += 5;
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 92 ? 'S' : score >= 78 ? 'A' : score >= 58 ? 'B' : score >= 38 ? 'C' : 'D';
  const end = c.outcome.ends[S.fix] != null ? c.outcome.ends[S.fix] : c.outcome.ends.other;
  const convinced = proofs.length >= 2 || (S.aiQuality != null && S.aiQuality >= 7);
  const gained = score + S.ins.length * 10;
  const wasNew = !PROG[c.id];
  S.result = { score, grade, end, convinced, proofs: proofs.length, gained, wasNew };
  XP += score;
  const p = PROG[c.id] || {};
  PROG[c.id] = { grade: better(p.grade, grade), bestScore: Math.max(p.bestScore || 0, score), plays: (p.plays || 0) + 1, last: new Date().toISOString() };
  persist(); saveProgress();
}
function result() {
  const c = C(), R = S.result, good = S.fix === c.bestFix, o = c.outcome;
  const title = good && S.cause === c.cause ? c.heads.win : good ? c.heads.lucky : c.heads[S.fix] || c.heads.other;
  const kicker = good && S.cause === c.cause ? 'Причина найдена' : good ? 'Повезло' : S.fix === c.partialFix ? 'Частичный успех' : 'Ложный след';
  const weeks = [0, .3, .6, .85, 1].map(k => o.start + (R.end - o.start) * k);
  const maxW = Math.max(...weeks, o.start * 1.15);
  const conf = good ? ['#F2B56B', '#5FB3A8', '#C9B6E4', '#E39A8C', '#9FC7E6'].flatMap((col, i) => [`<i class="conf" style="background:${col};left:${8 + i * 19}%;top:${10 + (i % 2) * 14}px;transform:rotate(${i * 37}deg)"></i>`, `<i class="conf" style="background:${col};right:${6 + i * 15}%;bottom:${14 + (i % 3) * 10}px;transform:rotate(${-i * 29}deg)"></i>`]).join('') : '';
  const ceoLine = good ? (R.convinced ? c.ceoLines.winSure : c.ceoLines.win) : c.ceoLines[S.fix] || c.ceoLines.other;
  const path = c.path.map(([k, t]) => { const ok = [].concat(k).some(x => S.ins.includes(x)); return `<div style="display:flex;gap:12px;align-items:flex-start"><span class="check" style="${ok ? 'background:var(--teal);color:#0D1416' : 'border:1px solid var(--rose);color:var(--rose)'}">${ok ? '✓' : '!'}</span><span style="line-height:1.55;${ok ? '' : 'color:var(--soft)'}">${ok ? t : 'Пропущено: ' + t.charAt(0).toLowerCase() + t.slice(1)}</span></div>`; }).join('');
  const badQs = Object.keys(S.asked).filter(k => { const [pid, i] = k.split('|'); return c.people[pid].qs[+i].tip; }).length;
  const fixTitle = S.fix === 'other' ? 'Твоё решение не повлияло на настоящую причину.' : `Ты выбрала: «${c.fixes.find(f => f.id === S.fix).title}».`;
  const nxt = CASES.find(x => x.n === c.n + 1);
  const lv = level();
  return `<div class="wrap" style="max-width:1100px">
    <header class="top">${logo()}<span style="font-size:12px;letter-spacing:.18em;color:var(--amber);font-weight:600">КЕЙС ${c.n} · ИТОГ</span></header>
    <section class="card" style="position:relative;overflow:hidden;margin-top:28px;padding:clamp(24px,4vw,40px);display:flex;flex-wrap:wrap;gap:32px;align-items:center;border-color:var(--line2)">${conf}
      <div class="grade">${R.grade}</div>
      <div style="flex:1 1 340px;display:flex;flex-direction:column;gap:10px"><span class="label" style="color:${good ? 'var(--teal)' : 'var(--rose)'}">${kicker}</span><h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(28px,4vw,36px);line-height:1.2">${title}</h1><p style="margin:0;font-weight:300;color:var(--soft);line-height:1.7">${fixTitle} Через 4 недели — ${o.label}: ${R.end}${o.unit}.</p></div>
      <div style="flex:0 1 220px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:flex-end;gap:8px;height:90px" role="img" aria-label="${o.label} через 4 недели: ${R.end}${o.unit}">${weeks.map((v, i) => `<i style="flex:1;height:${Math.max(4, v / maxW * 100)}%;background:${i === 4 ? (good ? 'var(--teal)' : 'var(--rose)') : 'var(--bar)'};border-radius:4px 4px 0 0"></i>`).join('')}</div><span class="serif" style="font-size:26px">${o.start}${o.unit} → <span style="color:${good ? 'var(--teal)' : 'var(--rose)'}">${R.end}${o.unit}</span></span></div>
    </section>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px;margin-top:18px">
      <div class="card msg" style="padding:20px">${av(c.userLine.who, 48, good ? 'happy' : 'sad')}<div><div style="font-size:13px;color:var(--mute)">${c.userLine.label}</div><div class="quote" style="font-size:17px">«${good ? c.userLine.win : c.userLine.lose}»</div></div></div>
      <div class="card msg" style="padding:20px">${av(c.ceo, 48, good ? 'happy' : 'sad')}<div><div style="font-size:13px;color:var(--mute)">${c.ceoName} · CEO</div><div class="quote" style="font-size:17px">«${ceoLine}»</div></div></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:18px">
      <section class="card" style="flex:999 1 460px;padding:24px;display:flex;flex-direction:column;gap:14px"><span class="serif" style="font-size:22px">Твой путь</span>
        ${S.aiFeedback ? `<div class="person" style="align-items:flex-start;background:var(--panel2);border-radius:12px;padding:14px 16px">${av('mentor', 36, 'happy')}<span style="font-size:14px;color:var(--soft);line-height:1.6"><b style="color:var(--ink)">Вера о твоей защите:</b> ${esc(S.aiFeedback)}</span></div>` : ''}${path}
        ${badQs ? `<div style="font-size:14px;color:var(--soft)">Вопросов о мнении или будущем в интервью: <b style="color:var(--amber)">${badQs}</b>. Такие вопросы дают вежливые, но пустые ответы.</div>` : ''}
        <div style="font-size:14px;color:var(--soft)">Доказательств в решении: <b style="color:var(--amber)">${R.proofs}</b>${R.convinced ? '' : ' — руководителю нужно хотя бы два, чтобы поверить.'} · Потрачено дней: <b style="color:var(--amber)">${S.day}</b> из ${MAX_DAY}</div>
        <div style="background:var(--panel2);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:6px"><span class="label" style="color:var(--amber)">Что было на самом деле</span><p style="margin:0;font-weight:300;line-height:1.7;color:#D6DCDC">${c.truth}</p></div>
      </section>
      <aside style="flex:1 1 280px;display:flex;flex-direction:column;gap:16px">
        <div class="card" style="padding:22px;display:flex;flex-direction:column;gap:12px;border-color:var(--amber);box-shadow:0 0 40px rgba(242,181,107,.12)"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="label">Опыт</span><b style="color:var(--amber)">+${R.gained}</b></div><span class="serif" style="font-size:22px">Уровень ${lv.n} · <span class="it">${lv.name}</span></span><div class="bar" style="height:4px"><i style="width:${levelPct()}%"></i></div>${nxt ? `<span style="font-size:13px;color:var(--soft)">${R.wasNew ? 'Открыт' : 'Доступен'} кейс ${nxt.n}: «${nxt.title}»</span>` : '<span style="font-size:13px;color:var(--soft)">Ты прошла все кейсы. Новые скоро появятся!</span>'}</div>
        <div class="ins" style="padding:20px;transform:rotate(-1deg)"><span style="font-size:11px;letter-spacing:.16em;color:#6B4614;font-weight:700">УРОК ПРОДАКТА</span><span class="serif" style="font-size:19px">${c.lesson.text}</span><span style="font-size:13px;color:#5C5547">${c.lesson.note}</span></div>
        ${user ? `<div class="card" style="padding:18px 20px;display:flex;gap:12px;align-items:center;background:var(--panel2)"><span class="check" style="background:var(--teal);color:#0D1416">✓</span><span style="font-size:14px;color:var(--soft)">Прогресс сохранён в аккаунте <b style="color:var(--ink)">${esc(user.name)}</b></span></div>` : `<div class="card" style="padding:22px;display:flex;flex-direction:column;gap:12px;background:var(--panel2)"><span class="serif" style="font-size:20px">Сохрани свой прогресс</span><span style="font-size:14px;color:var(--soft);line-height:1.6">Создай аккаунт, чтобы не потерять уровень и результаты и играть с любого устройства.</span><button class="btn" data-auth="signup">Создать аккаунт</button><button class="line-btn" data-auth="login" style="text-align:center">У меня уже есть аккаунт</button></div>`}
        ${nxt ? `<button class="btn" data-case="${nxt.id}">Следующий кейс →</button>` : ''}
        <button class="line-btn" data-go="hub" style="text-align:center">Все кейсы</button><button class="line-btn" data-case="${c.id}" style="text-align:center">Пройти кейс заново</button>
      </aside>
    </div>
  </div>`;
}

/* ---------- home, intro, hub, case brief ---------- */
function home() {
  const lit = [1, 7, 10, 14, 22, 25, 34, 38, 41];
  const windows = Array.from({ length: 45 }, (_, i) => `<i class="${lit.includes(i) ? 'l' : [4, 16, 28].includes(i) ? 't' : ''}" style="${lit.includes(i) ? `opacity:${.35 + (i % 5) * .12};animation-delay:${i * .37}s` : ''}"></i>`).join('');
  const played = Object.keys(PROG).length, nc = nextCase();
  const doCards = [
    ['cases', 'Решать кейсы', `${CASES.length} истории из реальной работы продакта: фитнес-стартап, live-казино, бонусы. Каждая открывается после предыдущей.`, played ? `Пройдено: ${played} из ${CASES.length}` : 'Начни с первого'],
    ['glossary', 'Словарь продакта', `${GLOSSARY.length} главных слов продакт-менеджера простым языком: retention, воронка, MVP, A/B-тест…`, 'Читать'],
    ['principles', 'Мышление продакта', `${PRINCIPLES.length} логических правил, которые помогают решать любые продуктовые задачи.`, 'Читать'],
    ['stories', 'Истории продуктов', 'Как Instagram и Slack нашли успех — и почему провалились Quibi и Google Glass.', 'Читать']
  ];
  return `<div class="wrap">
    ${header()}
    <section class="hero">
      <div style="flex:1 1 420px;display:flex;flex-direction:column;gap:24px">
        <span style="font-size:13px;color:var(--amber);font-weight:600">Игра-симулятор для тех, кто хочет стать продакт-менеджером</span>
        <h1>Метрики падают.<br><span class="it" style="color:var(--amber)">Найди причину.</span></h1>
        <p>Ты — новый продакт-менеджер. Говори с пользователями, читай данные, проверяй гипотезы и принимай решение, которое изменит продукт.</p>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">${played ? `<button class="btn" data-case="${nc.id}" style="font-size:16px;padding:15px 28px">Продолжить: кейс ${nc.n}</button>` : `<button class="btn" data-go="start" style="font-size:16px;padding:15px 28px">Сыграть первый кейс</button>`}<button class="line-btn" data-go="hub" style="min-height:52px;padding:12px 22px">Все кейсы</button></div>
        <span style="font-size:13px;color:var(--mute)">Бесплатно · без регистрации · кейс ≈ 15 минут</span>
      </div>
      <div style="flex:1 1 420px;position:relative;height:440px">
        <div class="city" aria-hidden="true">${windows}</div>
        <div class="card" style="position:absolute;left:0;top:60px;width:min(330px,88%);background:var(--panel2);border-color:var(--line2);padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 60px rgba(0,0,0,.5)">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:var(--mute)">FitStart · удержание D7</span><span style="font-size:13px;color:var(--rose)">−30%</span></div>
          <span class="serif" style="font-size:30px">26%</span>
          <div style="display:flex;align-items:flex-end;gap:8px;height:80px;border-bottom:1px solid var(--line2)" aria-hidden="true">${[100, 72, 64, 31, 28, 26].map((v, i) => `<i style="flex:1;height:${v}%;background:${i === 3 ? 'var(--amber)' : 'var(--bar)'};border-radius:4px 4px 0 0"></i>`).join('')}</div>
        </div>
        <div style="position:absolute;left:min(230px,40%);top:300px;width:210px;background:var(--paper);color:#1E1B16;border-radius:3px;padding:16px 18px;transform:rotate(-2deg);box-shadow:0 18px 36px rgba(0,0,0,.5)"><span class="serif it" style="font-size:17px;line-height:1.4">«На 10-й минуте поняла, что не вытяну»</span><div style="font-size:11px;letter-spacing:.14em;margin-top:10px;color:#6B6457">ИНСАЙТ · ИНТЕРВЬЮ</div></div>
      </div>
    </section>
    <section class="band"><h2 class="h2">Что здесь можно делать</h2><div class="docards">${doCards.map(([k, t, d, a]) => `<button class="card docard" ${k === 'cases' ? 'data-go="hub"' : `data-lib="${k}"`}><span class="serif" style="font-size:22px">${t}</span><span style="color:var(--soft);font-size:14px;line-height:1.6">${d}</span><span style="margin-top:auto;color:var(--amber);font-size:14px;font-weight:600">${a} →</span></button>`).join('')}</div></section>
    <section class="band steps">
      <div><span class="serif it" style="font-size:26px;color:var(--amber)">I</span><div class="serif" style="font-size:21px;margin:6px 0">Думать как продакт</div><p style="margin:0;font-weight:300;color:var(--soft)">Искать настоящую причину, а не первое попавшееся объяснение.</p></div>
      <div><span class="serif it" style="font-size:26px;color:var(--amber)">II</span><div class="serif" style="font-size:21px;margin:6px 0">Говорить с людьми</div><p style="margin:0;font-weight:300;color:var(--soft)">Задавать вопросы, на которые люди отвечают честно.</p></div>
      <div><span class="serif it" style="font-size:26px;color:var(--amber)">III</span><div class="serif" style="font-size:21px;margin:6px 0">Защищать решения</div><p style="margin:0;font-weight:300;color:var(--soft)">Спорить с руководителем фактами — с настоящим ИИ-собеседником.</p></div>
    </section>
    <section class="band"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap"><h2 class="h2" style="margin:0">Истории успехов и провалов</h2><button class="navlink" data-lib="stories">Все истории →</button></div>
      <div class="docards" style="margin-top:20px">${STORIES.slice(0, 3).concat(STORIES.slice(3, 4)).map(st => storyCard(st, true)).join('')}</div></section>
    ${footer()}
  </div>`;
}
const storyCard = (st, short) => `<article class="card story"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="label" style="color:${st.kind === 'успех' ? 'var(--teal)' : 'var(--rose)'}">${st.kind} · ${st.year}</span><span style="font-size:13px;color:var(--mute)">${st.name}</span></div><span class="serif" style="font-size:21px;line-height:1.3">${st.title}</span>${short ? '' : `<p style="margin:0;color:var(--soft);line-height:1.7;font-size:15px">${st.text}</p>`}<p class="serif it" style="margin:${short ? 'auto 0 0' : '0'};color:var(--amber);font-size:15px;line-height:1.5">${st.lesson}</p></article>`;

function intro() {
  const st = Math.min(S.step || 0, 1);
  const pages = [
    { label:'Что это за игра', html:`<h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(32px,5vw,46px);line-height:1.1">Ты — <span class="it" style="color:var(--amber)">продакт-менеджер</span></h1>
      <p class="lead">Продакт-менеджер решает, <b>что</b> делать в продукте и <b>почему</b>. Он не пишет код и не рисует дизайн — он разбирается, что на самом деле нужно людям, и помогает команде сделать именно это.</p>
      <p class="lead">В каждом кейсе у компании проблема. Твоя задача — понять, почему она случилась, и предложить решение.</p>` },
    { label:'Как играть', html:`<h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(30px,4.5vw,42px);line-height:1.1">Всё просто</h1>${howList()}` }
  ];
  const p = pages[st];
  return `<div class="wrap" style="max-width:1000px;min-height:100vh;display:flex;flex-direction:column">
    <header class="top">${logo()}<span style="font-size:13px;color:var(--mute)">${st + 1} из 2 · ${p.label}</span></header>
    <button class="back" data-go="home">← На главную</button>
    <div class="step" style="padding:clamp(28px,5vw,56px) 0;display:flex;flex-direction:column;gap:22px;flex:1">${p.html}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:1px solid var(--line);padding-top:20px;flex-wrap:wrap">${dots(st, 2)}<div style="display:flex;gap:10px">${st ? '<button class="line-btn" data-step="-1">Назад</button><button class="btn" data-go="hub">К кейсам</button>' : '<button class="btn" data-step="1">Дальше</button>'}</div></div>
  </div>`;
}
const dots = (st, n) => `<div style="display:flex;gap:6px;align-items:center" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="width:${i === st ? 26 : 8}px;height:8px;border-radius:4px;background:${i <= st ? 'var(--amber)' : 'var(--line2)'};transition:width .3s"></i>`).join('')}</div>`;
const HOW = [
  ['Ищи подсказки', 'Смотри графики, говори с пользователями, читай жалобы, спрашивай коллег. На всё у тебя 20 рабочих дней — каждый шаг тратит время.'],
  ['Сохраняй важное', 'Нашла что-то интересное — нажми «Сохранить инсайт». Так ты собираешь доказательства.'],
  ['Спрашивай правильно', 'Лучше спросить «Что вы делали?», чем «Вам понравилось?». О своих поступках люди рассказывают честнее, чем о мнениях.'],
  ['Убеди руководителя', 'Скажи, в чём причина и что делать. Руководитель будет спорить — отвечай фактами, которые нашла.']
];
const howList = () => `<div class="howlist">${HOW.map(([t, d], i) => `<div class="howrow"><span class="serif it">${['I', 'II', 'III', 'IV'][i]}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`;

function hub() {
  const lv = level(), played = Object.keys(PROG).length;
  const card = c => {
    const p = PROG[c.id], open = unlocked(c), cur = open && !p && nextCase().id === c.id;
    if (!open) return `<div class="card casecard locked"><div class="cc-top"><span class="label">Кейс ${c.n}</span><span style="font-size:12px;color:var(--mute)">откроется после кейса ${c.n - 1}</span></div><span class="serif" style="font-size:22px;line-height:1.25;color:var(--soft)">${c.title}</span><p>${c.short}</p><div class="cc-foot">Навык: ${c.skill}</div></div>`;
    return `<div class="card casecard ${cur ? 'current' : ''}"><div class="cc-top"><span class="label" style="color:var(--amber)">Кейс ${c.n} · ${c.company}</span>${p ? `<span class="pill" style="background:var(--teal)">пройден · ${p.grade}</span>` : '<span class="pill" style="background:var(--amber)">доступен</span>'}</div>
      <span class="serif" style="font-size:23px;line-height:1.25">${c.title}</span><p>${c.short}</p>
      <div style="display:flex;align-items:center;gap:10px"><div style="display:flex">${c.cast.map((x, i) => `<span style="margin-left:${i ? -8 : 0}px;display:flex">${av(x, 30)}</span>`).join('')}</div><span style="font-size:12px;color:var(--mute)">~${c.minutes} минут · навык: ${c.skill}</span></div>
      <button class="${p ? 'line-btn' : 'btn'}" data-case="${c.id}" style="margin-top:auto;text-align:center">${p ? 'Пройти заново' : 'Начать кейс'}</button></div>`;
  };
  return `<div class="wrap">
    ${header()}
    <button class="back" data-go="home">← На главную</button>
    <section style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;padding:30px 0 28px">
      <div style="flex:999 1 420px;display:flex;flex-direction:column;gap:12px"><h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(34px,5vw,48px);line-height:1.08">${played ? 'С возвращением.' : 'Готова к первому кейсу?'}</h1><p class="lead">Каждый кейс — история реальной продуктовой проблемы. Кейсы открываются по очереди, как уровни. Пройдено: ${played} из ${CASES.length}.</p></div>
      <div class="card" style="flex:1 1 300px;padding:20px;display:flex;gap:16px;align-items:center">${av('me', 64)}<div style="flex:1;display:flex;flex-direction:column;gap:8px"><span class="label" style="color:var(--amber)">Уровень ${lv.n}</span><span class="serif" style="font-size:22px">${lv.name}</span><div class="bar" style="height:4px"><i style="width:${levelPct()}%"></i></div><span style="font-size:12px;color:var(--mute)">${XP} / ${lv.to} опыта</span></div></div>
    </section>
    <div class="cases">${CASES.map(card).join('')}</div>
    <div class="card" style="margin-top:20px;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap"><div style="display:flex;flex-direction:column;gap:4px"><span class="serif" style="font-size:20px">Хочешь подготовиться?</span><span style="color:var(--soft);font-size:14px">Словарь продакта и логические правила помогут в любом кейсе.</span></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="line-btn" data-lib="glossary">Словарь продакта</button><button class="line-btn" data-lib="principles">Мышление продакта</button></div></div>
    ${footer()}
  </div>`;
}

function brief() {
  const c = C(), st = Math.min(S.step || 0, 2);
  const pages = [
    { label:'Компания', html:`<span class="label" style="color:var(--amber)">Кейс ${c.n} · твой первый день</span>
      <h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(32px,5vw,46px);line-height:1.1">Это <span class="it" style="color:var(--amber)">${c.company}</span></h1>
      <p class="lead">${c.about}</p>
      <div class="kpis" style="max-width:640px">${c.kpis.map(([l, v]) => `<div class="card kpi"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
      <p class="lead">Ты пришла сюда продакт-менеджером. Сначала познакомься с людьми, с которыми будешь работать.</p>` },
    { label:'Команда', html:`<h1 class="serif" style="margin:0;font-weight:500;font-size:clamp(30px,4.5vw,42px);line-height:1.1">Твоя команда</h1>
      <div class="teamgrid">${c.crew.concat([['mentor', 'Вера', 'твой наставник. Будет подсказывать по ходу работы']]).map(([id, n, r]) => `<div class="card person" style="padding:16px">${av(id, 48, id === 'mentor' ? 'happy' : 'neutral')}<div><b style="font-weight:600">${n}</b><div style="font-size:13px;color:var(--soft);line-height:1.5">${r}</div></div></div>`).join('')}</div>
      <p class="lead">Каждый знает что-то своё. Хороший продакт умеет собрать эти кусочки вместе.</p>` },
    { label:'Задача', html:`<div class="person">${av(c.ceo, 56)}<div><b style="font-size:16px;font-weight:600">${c.ceoFull}</b><div style="font-size:13px;color:var(--mute)">CEO · пишет тебе в рабочий чат, 09:12</div></div></div>
      <div class="serif" style="font-size:clamp(17px,2.2vw,20px);line-height:1.7;border-left:1px solid var(--amber);padding-left:20px;max-width:680px">${c.brief}</div>
      <div class="person" style="background:var(--panel2);border-radius:12px;padding:14px 16px;max-width:680px">${av('mentor', 36, 'happy')}<span style="font-size:14px;color:var(--soft)"><b style="color:var(--ink)">Вера:</b> «${c.briefTip}»</span></div>` }
  ];
  const p = pages[st];
  return `<div class="wrap" style="max-width:1000px;min-height:100vh;display:flex;flex-direction:column">
    <header class="top">${logo()}<span style="font-size:13px;color:var(--mute)">Кейс ${c.n} · ${st + 1} из 3 · ${p.label}</span></header>
    <button class="back" data-go="hub">← Все кейсы</button>
    <div class="step" style="padding:clamp(28px,5vw,56px) 0;display:flex;flex-direction:column;gap:22px;flex:1">${p.html}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:1px solid var(--line);padding-top:20px;flex-wrap:wrap">${dots(st, 3)}<div style="display:flex;gap:10px">${st ? '<button class="line-btn" data-step="-1">Назад</button>' : ''}${st < 2 ? '<button class="btn" data-step="1">Дальше</button>' : '<button class="btn" data-go="work">Начать работу</button>'}</div></div>
  </div>`;
}

/* ---------- learning library ---------- */
function library() {
  const tab = S.tab, q = (S.q || '').toLowerCase();
  const tabs = [['glossary', 'Словарь продакта'], ['principles', 'Мышление продакта'], ['stories', 'Истории продуктов']];
  let body = '';
  if (tab === 'glossary') {
    const items = GLOSSARY.filter(g => !q || (g.t + ' ' + g.en + ' ' + g.d).toLowerCase().includes(q));
    const groups = [...new Set(GLOSSARY.map(g => g.g))];
    body = `<label class="search"><span class="sr">Поиск по словарю</span><input id="libq" type="search" placeholder="Найти слово: retention, воронка, MVP…" value="${esc(S.q || '')}"></label>
      ${groups.map(gr => { const list = items.filter(g => g.g === gr); return list.length ? `<h3 class="label" style="margin:22px 0 10px;color:var(--amber)">${gr}</h3><div class="glossary">${list.map(g => `<article class="card term"><div><span class="serif" style="font-size:20px">${g.t}</span> <span style="color:var(--mute);font-size:13px">${g.en}</span></div><p style="margin:0;color:var(--soft);line-height:1.65">${g.d}</p><p style="margin:0;font-size:14px;line-height:1.6;border-left:1px solid var(--amber);padding-left:12px;color:#D6DCDC"><span style="color:var(--amber)">Пример:</span> ${g.ex}</p></article>`).join('')}</div>` : ''; }).join('') || '<p style="color:var(--mute)">Ничего не нашлось. Попробуй другое слово.</p>'}`;
  }
  if (tab === 'principles') body = `<p class="lead" style="margin:6px 0 22px">Это не правила из учебника, а привычки мышления. Они помогают в любом кейсе — и в настоящей работе.</p><div class="glossary">${PRINCIPLES.map((p, i) => `<article class="card term"><span class="serif it" style="color:var(--amber);font-size:24px">${i + 1}</span><span class="serif" style="font-size:21px">${p.t}</span><p style="margin:0;color:var(--soft);line-height:1.65">${p.d}</p></article>`).join('')}</div>`;
  if (tab === 'stories') body = `<p class="lead" style="margin:6px 0 22px">Реальные истории компаний: что они сделали и чему это учит продакта.</p><div class="glossary">${STORIES.map(st => storyCard(st, false)).join('')}</div>`;
  return `<div class="wrap">
    ${header()}
    <button class="back" data-go="${S.prev && S.prev !== 'library' ? S.prev : 'home'}">← Назад</button>
    <h1 class="serif" style="margin:20px 0 18px;font-weight:500;font-size:clamp(32px,5vw,46px)">Библиотека продакта</h1>
    <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-lib="${k}">${t}</button>`).join('')}</div>
    <div style="padding-top:18px">${body}</div>
    ${footer()}
  </div>`;
}

/* ---------- modals ---------- */
function authModal() {
  if (!S.auth) return '';
  const signup = S.auth === 'signup';
  const field = (id, label, type, ac) => `<label for="${id}" style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--soft)">${label}<input id="${id}" type="${type}" autocomplete="${ac}" value="${esc(id === 'a-name' ? S.authName || '' : id === 'a-mail' ? S.authMail || '' : '')}" class="inp"></label>`;
  const note = (title, text, btn) => `<div style="display:flex;flex-direction:column;gap:14px;align-items:flex-start">${SPARK}<span class="serif" style="font-size:24px">${title}</span><p style="margin:0;color:var(--soft);line-height:1.7">${text}</p><button class="btn" data-auth="close">${btn}</button></div>`;
  const wrap = (label, inner) => `<div class="modal-bg" data-auth-bg><div class="modal card" role="dialog" aria-modal="true" aria-label="${label}"><button class="line-btn" data-auth="close" aria-label="Закрыть" style="position:absolute;right:14px;top:14px;min-height:36px;padding:4px 12px">✕</button>${inner}</div></div>`;
  if (S.auth === 'check') return wrap('Подтверди email', note('Проверь почту', `Мы отправили письмо на <b style="color:var(--ink)">${esc(S.authMail || '')}</b>. Нажми ссылку в письме — и аккаунт готов. Если письма нет, загляни в «Спам».`, 'Хорошо'));
  if (S.auth === 'welcome') return wrap('Готово', note('Ты в аккаунте', 'Теперь твой уровень и результаты сохраняются, и их можно открыть с любого устройства.', 'Продолжить'));
  if (S.auth === 'soon') return wrap('Скоро', note('Не получилось подключиться', 'Сервис аккаунтов сейчас недоступен. Твой прогресс пока сохраняется в этом браузере — попробуй войти позже.', 'Понятно'));
  return wrap(signup ? 'Регистрация' : 'Вход', `<div style="display:flex;gap:6px;background:var(--bg);border-radius:999px;padding:4px">${['signup', 'login'].map(m => `<button data-auth="${m}" style="flex:1;border:0;border-radius:999px;padding:10px;min-height:42px;font-weight:600;background:${S.auth === m ? 'var(--panel2)' : 'transparent'};color:${S.auth === m ? 'var(--ink)' : 'var(--mute)'}">${m === 'signup' ? 'Регистрация' : 'Вход'}</button>`).join('')}</div>
    <span class="serif" style="font-size:24px">${signup ? 'Создай аккаунт' : 'С возвращением'}</span>
    ${signup ? field('a-name', 'Имя', 'text', 'name') : ''}${field('a-mail', 'Email', 'email', 'email')}${field('a-pass', 'Пароль', 'password', signup ? 'new-password' : 'current-password')}
    ${S.authErr ? `<span style="font-size:14px;color:var(--rose)">${esc(S.authErr)}</span>` : ''}
    <button class="btn" data-authsubmit ${S.authBusy ? 'disabled' : ''}>${S.authBusy ? 'Подожди…' : signup ? 'Создать аккаунт' : 'Войти'}</button>
    <span style="font-size:12px;color:var(--mute);text-align:center">${signup ? 'Пароль — минимум 6 символов. Играть можно и без аккаунта.' : 'Нет аккаунта? Переключись на «Регистрация»'}</span>`);
}
function helpModal() {
  if (!S.help) return '';
  return `<div class="modal-bg" data-help-bg><div class="modal card" role="dialog" aria-modal="true" aria-label="Как играть" style="width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto">
    <button class="line-btn" data-help="close" aria-label="Закрыть" style="position:absolute;right:14px;top:14px;min-height:36px;padding:4px 12px">✕</button>
    <span class="serif" style="font-size:26px">Как играть</span>
    <p style="margin:0;color:var(--soft);line-height:1.7">Представь: ты пришла работать продакт-менеджером. В компании проблема — и тебе нужно понять, почему она случилась.</p>
    ${howList()}
    <div style="display:flex;gap:12px;align-items:center;background:var(--panel2);border-radius:12px;padding:12px 14px">${av('mentor', 34, 'happy')}<span style="font-size:14px;color:var(--soft)">Запутаешься — наставник Вера подскажет. Не знаешь слово — загляни в «Словарь».</span></div>
    <button class="btn" data-help="close">Понятно</button>
  </div></div>`;
}

/* ---------- render & events ---------- */
const VIEWS = { home, intro, hub, brief, work, decide, result, library };
const TITLES = { home:'Become PM — симулятор продакт-менеджера', intro:'Как играть — Become PM', hub:'Кейсы — Become PM', brief:'Брифинг — Become PM', work:'Работа над кейсом — Become PM', decide:'Защита решения — Become PM', result:'Итог кейса — Become PM', library:'Библиотека продакта — Become PM' };
function render() {
  const focusQ = document.activeElement && document.activeElement.id === 'libq';
  app.innerHTML = VIEWS[S.view]() + authModal() + helpModal();
  const f = app.querySelector('.modal input'); if (f) f.focus();
  if (focusQ) { const i = document.getElementById('libq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  const t = app.querySelector('.toast');
  if (t) setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2600);
  document.title = TITLES[S.view];
}
app.addEventListener('input', e => { if (e.target.id === 'libq') { S.q = e.target.value; render(); } });
app.addEventListener('click', e => {
  if (e.target.matches('[data-auth-bg]')) { S.auth = null; return render(); }
  if (e.target.matches('[data-help-bg]')) { S.help = false; return render(); }
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.help) { S.help = d.help === 'open'; return render(); }
  if (d.auth) { S.auth = d.auth === 'close' ? null : d.auth; S.authErr = ''; return render(); }
  if ('authsubmit' in d) return authSubmit();
  if ('logout' in d) return logout();
  if (d.lib) { S.tab = d.lib; S.q = ''; return go('library'); }
  if (d.case) return startCase(d.case);
  if (d.go) {
    if (d.go === 'intro') S.step = 0;
    if (d.go === 'start') { const seen = store.get('becomepm-seen2', false); store.set('becomepm-seen2', true); if (seen) return startCase(nextCase().id); S.step = 0; return go('intro'); }
    return go(d.go);
  }
  if (d.step) { S.step = Math.max(0, (S.step || 0) + +d.step); render(); window.scrollTo(0, 0); return; }
  if (d.hide) { S.hidden[d.hide] = true; return render(); }
  if (d.src) return openSource(d.src);
  if (d.talk) return talk(d.talk);
  if (d.ask) { S.asked[d.ask] = true; S.last = null; return render(); }
  if (d.save) return save(d.save);
  if (d.att) { const a = S.d.att, k = d.att; const dr = document.getElementById('draft'); if (dr) S.d.draft = dr.value; const lim = S.d.mode === 'ai' ? 3 : 2; S.d.att = a.includes(k) ? a.filter(x => x !== k) : a.length < lim ? a.concat(k) : a; return render(); }
  if (d.scause) return scriptAnswer('cause', d.scause);
  if (d.sfix) return scriptAnswer('fix', d.sfix);
  if ('sev' in d) return scriptAnswer('ev');
  if ('send' in d) return aiSend();
  if ('finish' in d) return aiFinish();
  if ('submit' in d) { if (S.cause && S.fix) { evaluate(); go('result'); } }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && S.auth && document.activeElement && document.activeElement.closest('.modal') && document.activeElement.tagName === 'INPUT') { e.preventDefault(); authSubmit(); return; }
  if (e.key === 'Escape' && (S.auth || S.help)) { S.auth = null; S.help = false; render(); }
});
render();
}
