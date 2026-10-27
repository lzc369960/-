const root = document.getElementById('app');
let questions = [];
let mode = 'sequence';
let list = [];
let index = 0;
let selected = [];
let submitted = false;
let correct = false;
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = { sequence:'顺序练习', random:'随机练习', wrong:'错题重练', favorite:'我的收藏' };
function home() {
  const records = read('huadian-records', {}), favorites = read('huadian-favorites', {});
  const validIds = new Set(questions.map(q => String(q.id)));
  const values = Object.entries(records).filter(([id]) => validIds.has(id)).map(([,value]) => value), done = values.length, wrong = values.filter(x => !x.correct).length;
  const favoriteCount = Object.keys(favorites).filter(id => validIds.has(id)).length;
  const accuracy = done ? Math.round(values.filter(x => x.correct).length / done * 100) : 0;
  root.innerHTML = `<header class="hero"><div class="eyebrow">2026 · 公共与行业知识</div><h1>华电刷题</h1><p>把每一道题，练到心里有数。</p></header><div class="stats"><div class="stat"><b>${questions.length}</b>总题数</div><div class="stat"><b>${done}</b>已作答</div><div class="stat"><b>${accuracy}%</b>正确率</div></div><div class="section">开始练习</div>${menu('sequence','按原题号逐题掌握')}${menu('random','打乱顺序，巩固记忆')}<div class="section">巩固提升</div>${menu('wrong','集中复习做错的题目',wrong)}${menu('favorite','随时回看重点题目',favoriteCount)}<p class="note">答题记录保存在当前手机浏览器中。<br>题目与答案来自提供的 PDF。</p>`;
  document.querySelectorAll('[data-mode]').forEach(el => el.addEventListener('click', () => start(el.dataset.mode)));
}
function menu(key, desc, count) { return `<button class="menu" data-mode="${key}"><span><strong>${names[key]}${count === undefined ? '' : `<span class="count">${count}</span>`}</strong><small>${desc}</small></span><span class="arrow">›</span></button>`; }
function start(newMode) {
  mode = newMode; const records = read('huadian-records', {}), favorites = read('huadian-favorites', {});
  list = questions.filter(q => mode === 'wrong' ? records[q.id] && !records[q.id].correct : mode === 'favorite' ? favorites[q.id] : true);
  if (mode === 'random') for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  if (mode === 'sequence' && read('huadian-version', 1) < 2) {
    const oldId = Number(read('huadian-index', 0)) + 1;
    const migrated = list.findIndex(q => q.id >= oldId);
    save('huadian-index', migrated < 0 ? Math.max(0, list.length - 1) : migrated);
    save('huadian-version', 2);
  }
  index = mode === 'sequence' ? Math.min(Math.max(Number(read('huadian-index', 0)), 0), list.length - 1) : 0;
  selected = []; submitted = false; render();
}
function render() {
  if (!list.length) { root.innerHTML = `<div class="empty"><div class="icon">◎</div><h2>这里还没有题目</h2><p>先去练习，或收藏想复习的题目</p><button id="home">返回首页</button></div>`; document.getElementById('home').onclick = home; return; }
  const q = list[index], favorites = read('huadian-favorites', {});
  const type = q.type === 'multi' ? '多选题' : q.type === 'judge' ? '判断题' : '单选题';
  root.innerHTML = `<div class="toolbar"><button class="back" id="home">‹ 首页</button><span class="spacer"></span><span>第 ${index + 1} / ${list.length} 题 · 原题号 ${q.id}</span></div><div class="progress"><span style="width:${Math.round((index + 1) / list.length * 100)}%"></span></div><div class="card"><div class="meta"><span class="pill">${type}</span><span>PDF 第 ${q.page} 页</span></div><div class="stem">${escapeHtml(q.stem)}</div>${Object.entries(q.options).map(([key,text]) => `<button class="option ${selected.includes(key) ? 'selected' : ''} ${submitted && q.answer.includes(key) ? 'right' : ''} ${submitted && selected.includes(key) && !q.answer.includes(key) ? 'wrong' : ''}" data-choice="${key}" ${submitted ? 'disabled' : ''}><i>${key}</i><span>${escapeHtml(text)}</span></button>`).join('')}${submitted ? `<div class="result ${correct ? 'good' : 'bad'}">${correct ? '回答正确' : '回答错误'}<small>正确答案：${q.answer}</small></div>` : ''}</div><div class="actions"><button class="favorite" id="favorite">${favorites[q.id] ? '★ 已收藏' : '☆ 收藏'}</button><button class="primary" id="main-action">${submitted ? '下一题' : '提交答案'}</button></div><div class="nav"><button id="prev">上一题</button><button id="skip">跳过 / 下一题</button></div>`;
  document.getElementById('home').onclick = home;
  document.querySelectorAll('[data-choice]').forEach(el => el.onclick = () => { const key = el.dataset.choice; selected = q.type === 'multi' ? (selected.includes(key) ? selected.filter(x => x !== key) : [...selected,key]) : [key]; render(); });
  document.getElementById('favorite').onclick = () => { const f = read('huadian-favorites', {}); if (f[q.id]) delete f[q.id]; else f[q.id] = true; save('huadian-favorites', f); render(); };
  document.getElementById('main-action').onclick = submitted ? next : submit;
  document.getElementById('prev').onclick = prev;
  document.getElementById('skip').onclick = next;
}
function submit() {
  if (!selected.length) { alert('请先选择答案'); return; }
  const q = list[index]; correct = selected.slice().sort().join('') === q.answer.split('').sort().join(''); submitted = true;
  const records = read('huadian-records', {}); records[q.id] = { selected:selected.slice().sort().join(''), correct, time:Date.now() }; save('huadian-records', records); render();
}
function next() { if (index >= list.length - 1) { alert('已经是最后一题'); return; } index++; selected=[]; submitted=false; if (mode === 'sequence') save('huadian-index', index); render(); window.scrollTo(0,0); }
function prev() { if (index <= 0) return; index--; selected=[]; submitted=false; render(); window.scrollTo(0,0); }
fetch('./data/questions.json').then(r => { if (!r.ok) throw Error('题库加载失败'); return r.json(); }).then(data => { questions=data; home(); }).catch(() => { root.innerHTML='<div class="error">题库加载失败，请刷新页面重试。</div>'; });
