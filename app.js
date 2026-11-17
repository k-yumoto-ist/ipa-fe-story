
(function(){
'use strict';
const chapters=window.FE_STORIES||[];
const published=chapters.filter(c=>!c.coming);
const allTerms=published.flatMap(c=>(c.terms||[]).map(t=>Object.assign({chapterId:c.id,topic:c.topic,chapterNo:c.number},t)));
const termById=Object.fromEntries(allTerms.map(t=>[t.id,t]));
const chapterById=Object.fromEntries(chapters.map(c=>[c.id,c]));
const STORAGE_KEY='ipa-fe-story-v1';
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
  return {theme:raw.theme==='dark'?'dark':'light',font:Math.min(23,Math.max(15,Number(raw.font)||18)),viewed:raw.viewed||{},positions:raw.positions||{},lastRead:raw.lastRead||null,mastery:raw.mastery||{},starred:Array.isArray(raw.starred)?raw.starred:[],wrong:Array.isArray(raw.wrong)?raw.wrong:[],quizStats:raw.quizStats||{}};
 }catch(e){return {theme:'light',font:18,viewed:{},positions:{},lastRead:null,mastery:{},starred:[],wrong:[],quizStats:{}};}
}
const saved=load();
const ui={glossaryCategory:'all',search:'',deckFilter:'all',deck:null,quiz:null};
const view=document.getElementById('view');
const dialog=document.getElementById('termDialog');
const topLabel=document.getElementById('topLabel');
const backButton=document.getElementById('backButton');
const progressBar=document.getElementById('progressFill');
const toast=document.getElementById('toast');
let toastTimer=0, saveTimer=0;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));}catch(e){}}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function h(v){return escapeHtml(v);}
function route(){const raw=decodeURIComponent(location.hash.replace(/^#/,'')||'library');return raw.startsWith('/')?raw.slice(1):raw;}
function go(to){if(route()===to){render();window.scrollTo(0,0);}else{location.hash=to;}}
function percent(id){return Math.max(0,Math.min(100,Number(saved.viewed[id])||0));}
function termText(str){return h(str).replace(/【([a-z0-9-]+)】/g,function(match,id){const t=termById[id];return t?'<button type="button" class="term-inline" data-action="term" data-id="'+h(id)+'" aria-label="'+h(t.term)+'の意味を見る">'+h(t.term)+'</button>':match;});}
function sectionTitle(title,subtitle){return '<div class="simple-head"><span class="eyebrow">THE STORY CONTINUES</span><h1>'+h(title)+'</h1><p>'+h(subtitle)+'</p></div>';}
function nextPublished(id){const idx=published.findIndex(x=>x.id===id);return published[idx+1]||null;}
function countKnown(){return allTerms.filter(t=>(saved.mastery[t.id]||0)>=2).length;}
function navbar(active){
 document.querySelectorAll('[data-nav]').forEach(el=>{const on=el.dataset.nav===active;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
}
function uiInit(){
 document.body.dataset.theme=saved.theme;
 document.documentElement.style.setProperty('--readerSize',saved.font+'px');
 document.querySelectorAll('[data-action="theme"]').forEach(el=>{el.textContent=saved.theme==='dark'?'☀':'☾';el.setAttribute('aria-label',saved.theme==='dark'?'明るいテーマにする':'暗いテーマにする');});
 document.querySelectorAll('[data-action="font-smaller"]').forEach(el=>el.disabled=saved.font<=15);
 document.querySelectorAll('[data-action="font-bigger"]').forEach(el=>el.disabled=saved.font>=23);
}
function render(){
 uiInit();
 const r=route(), parts=r.split('/'), mode=parts[0], id=parts[1];
 const c=chapterById[id];
 if(mode==='read'&&c&&!c.coming){navbar('library');topLabel.textContent='第'+c.number+'話 · '+c.topic;backButton.hidden=false;view.innerHTML=renderReader(c);restoreReading(c.id);}
 else if(mode==='quiz'&&c&&!c.coming){navbar('library');topLabel.textContent='第'+c.number+'話 · 理解度チェック';backButton.hidden=false;if(!ui.quiz||ui.quiz.chapterId!==id)startQuiz(c);view.innerHTML=renderQuiz(c);window.scrollTo(0,0);}
 else if(mode==='glossary'){navbar('glossary');topLabel.textContent='用語を探す';backButton.hidden=false;view.innerHTML=renderGlossary();window.scrollTo(0,0);}
 else if(mode==='review'){navbar('review');topLabel.textContent='単語カード';backButton.hidden=false;if(!ui.deck)startDeck(ui.deckFilter);view.innerHTML=renderReview();window.scrollTo(0,0);}
 else if(mode==='stats'){navbar('stats');topLabel.textContent='学習の記録';backButton.hidden=false;view.innerHTML=renderStats();window.scrollTo(0,0);}
 else {navbar('library');topLabel.textContent='恋するIT用語集';backButton.hidden=true;view.innerHTML=renderLibrary();window.scrollTo(0,0);}
 updateProgressBar();
}
function renderLibrary(){
 const next=saved.lastRead&&chapterById[saved.lastRead]&&!chapterById[saved.lastRead].coming?chapterById[saved.lastRead]:published[0];
 const cards=chapters.map(c=>{
  const available=!c.coming,p=percent(c.id);
  return '<article class="chapter-card '+(available?'':'coming')+'"><div class="chapter-meta"><span class="chapter-n">'+h(c.number)+'</span><span class="chip">'+h(c.topic)+'</span></div>'
   +'<h3>'+h(c.title)+'</h3><p>'+h(c.summary)+'</p>'
   +(available?'<div class="mini-progress" aria-label="読書進捗 '+p+'%"><span style="width:'+p+'%"></span></div>':'')
   +'<div class="chapter-action"><span>'+(available?(p>=95?'読了 · もう一度読む':p>0?'続きを読む':'この話を読む'):'続刊予定')+'</span>'
   +(available?'<button type="button" class="icon-btn secondary" data-action="read" data-id="'+h(c.id)+'" aria-label="'+h(c.title)+'を読む">→</button>':'<span aria-label="未公開">◇</span>')+'</div></article>';
 }).join('');
 return '<div class="content">'
  +'<section class="hero"><div><div class="eyebrow">A ROMANCE WRITTEN IN CODE</div><h1>恋する<span>IT用語集</span><br>君に届くまで。</h1><p class="hero-desc">恋の続きが気になるうちに、IT用語が記憶に残る。基本情報技術者試験を、物語で学ぶ新しい読みもの。</p><div class="btn-row" style="margin-top:26px"><button class="primary-btn" data-action="read" data-id="'+h(next.id)+'">'+(percent(next.id)>0?'続きを読む':'第1話を読み始める')+' →</button><button class="outline-btn" data-action="nav" data-route="review">単語を復習する</button></div></div><div class="hero-art" aria-hidden="true"><div class="art-mail">♡</div><div class="art-caption">MESSAGE DELIVERED</div></div></section>'
  +'<div class="section-head"><div><div class="eyebrow">CHAPTERS</div><h2>物語の目次</h2></div><p>'+published.length+'話公開中 ／ '+allTerms.length+'語を収録</p></div>'
  +'<div class="shelf">'+cards+'</div><p class="section-foot">本文中の色付き用語をタップすると意味を確認できます。読書位置・ブックマーク・復習履歴は、この端末のブラウザに保存します。未公開の章は今後追加予定です。</p></div>';
}
function renderReader(c){
 const paras=c.story.map(p=>p==='＊＊＊'?'<p class="scene-break" aria-label="場面転換">＊ ＊ ＊</p>':'<p>'+termText(p)+'</p>').join('');
 const next=nextPublished(c.id);
 return '<div class="content"><article class="reader-container">'
  +'<div class="reader-kicker">CHAPTER '+h(c.number)+' <span>—</span> '+h(c.topic)+'</div>'
  +'<h1 class="reader-title">'+h(c.title)+'</h1><div class="reader-subtitle">'+h(c.subtitle)+'</div>'
  +'<div class="ornament" aria-hidden="true">❦</div>'
  +'<div class="reader-note">色付きの用語はタップすると意味を確認できます。読んだ位置は自動で記録されます。右上の「A− / A＋」で文字サイズを変更できます。</div>'
  +'<div class="reader-text">'+paras+'</div>'
  +'<footer class="reader-end"><div class="ornament" aria-hidden="true">❦</div><h3>第'+h(c.number)+'話・完</h3><p>物語に出てきた '+c.terms.length+' 語を覚えているか、確かめてみませんか。</p>'
  +'<div class="reader-actions"><button class="primary-btn" data-action="quiz" data-id="'+h(c.id)+'">この話の復習クイズ →</button>'
  +(next?'<button class="outline-btn" data-action="read" data-id="'+h(next.id)+'">次の話を読む</button>':'<button class="outline-btn" data-action="nav" data-route="review">単語カードへ</button>')+'</div>'
  +'<p style="margin-top:30px"><button class="icon-btn" data-action="nav" data-route="library">← 目次へ戻る</button></p></footer></article></div>';
}
function renderGlossary(){
 return '<div class="content"><div class="glossary-head"><div>'+sectionTitle('言葉の索引','物語で出会った用語を、何度でも振り返れます。')+'</div><input id="termSearch" class="search-input" type="search" aria-label="用語を検索" placeholder="用語・意味で検索" value="'+h(ui.search)+'"></div>'
 +'<div class="filter-tabs" id="glossaryTabs">'+['all','テクノロジ','マネジメント','ストラテジ','starred'].map(k=>'<button class="filter-tab '+(ui.glossaryCategory===k?'active':'')+'" data-action="glossary-filter" data-filter="'+h(k)+'">'+({all:'すべて',starred:'☆ 保存済み'}[k]||k)+'</button>').join('')+'</div><div class="term-grid" id="glossaryResults">'+renderGlossaryResults()+'</div></div>';
}
function renderGlossaryResults(){
 const q=ui.search.trim().toLocaleLowerCase();
 const arr=allTerms.filter(t=>{
  const c=chapterById[t.chapterId];
  return (ui.glossaryCategory==='all'||(ui.glossaryCategory==='starred'?saved.starred.includes(t.id):c.group===ui.glossaryCategory))&&(!q||[t.term,t.meaning,t.hook,t.topic].some(s=>s.toLocaleLowerCase().includes(q)));
 });
 if(!arr.length)return '<div class="empty" style="grid-column:1/-1">該当する用語がありません。<br>検索語や絞り込みを変えてみてください。</div>';
 return arr.map(t=>'<article class="term-card"><div class="small-category">第'+h(t.chapterNo)+'話 · '+h(t.topic)+'</div><h3>'+h(t.term)+'</h3><p>'+h(t.meaning)+'</p><div class="actions"><button data-action="term" data-id="'+h(t.id)+'">物語で覚える →</button><button data-action="star" data-id="'+h(t.id)+'" aria-label="'+(saved.starred.includes(t.id)?'保存解除':'保存')+'">'+(saved.starred.includes(t.id)?'★':'☆')+'</button></div></article>').join('');
}
function shuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startDeck(filter){
 ui.deckFilter=filter||'all';
 const list=ui.deckFilter==='starred'?allTerms.filter(t=>saved.starred.includes(t.id)):ui.deckFilter==='wrong'?allTerms.filter(t=>saved.wrong.includes(t.id)||(saved.mastery[t.id]||0)===1):allTerms;
 ui.deck={ids:shuffle(list.map(t=>t.id)),index:0,flipped:false,reviewed:0};
}
function renderReview(){
 const d=ui.deck;const t=d&&termById[d.ids[d.index]];
 const tabs='<div class="filter-tabs">'+[['all','すべて'],['starred','☆ 保存済み'],['wrong','苦手を復習']].map(([key,text])=>'<button class="filter-tab '+(ui.deckFilter===key?'active':'')+'" data-action="deck-filter" data-filter="'+key+'">'+text+'</button>').join('')+'</div>';
 if(!t)return '<div class="content">'+sectionTitle('思い出すための単語帳','答えを見て終わりではなく、自分で言葉を取り出す練習。')+tabs+'<div class="empty">この条件の用語はまだありません。<br>物語から用語を保存したり、クイズに挑戦してみてください。</div></div>';
 return '<div class="content">'+sectionTitle('思い出すための単語帳','用語を見たら、意味を声に出してからカードをめくってください。')+tabs
  +'<div class="flash-wrap"><div class="tiny" style="text-align:center;margin-bottom:14px">カード '+(d.index+1)+' / '+d.ids.length+' · '+h(t.topic)+'</div>'
  +'<button class="flashcard" type="button" data-action="flip" aria-label="'+(d.flipped?'次の答えを確認':'答えを見る')+'"><span class="prompt">'+(d.flipped?'THE MEANING':'WHAT DOES IT MEAN?')+'</span><span class="answer">'+(d.flipped?h(t.meaning):h(t.term))+'</span><span class="hint">'+(d.flipped?h('物語の記憶：'+t.hook):'タップして意味を見る ↗')+'</span></button>'
  +'<div class="review-bottom">'+(d.flipped?'<div class="btn-row"><button class="outline-btn" data-action="card-grade" data-grade="again">まだ覚えていない</button><button class="primary-btn" data-action="card-grade" data-grade="good">覚えていた ✓</button></div>':'<p class="tiny">まず自分の言葉で説明できるか考えてみましょう。</p>')
  +'<p class="tiny" style="margin-top:18px"><button class="icon-btn" data-action="star" data-id="'+h(t.id)+'">'+(saved.starred.includes(t.id)?'★ 保存済み':'☆ この単語を保存')+'</button></p></div></div></div>';
}
function nextCard(){
 const d=ui.deck;d.reviewed++;
 if(d.index>=d.ids.length-1){d.ids=shuffle(d.ids);d.index=0;notify('ひと巡りしました。もう一度復習できます');}
 else d.index++;
 d.flipped=false;view.innerHTML=renderReview();
}
function startQuiz(c){
 const targets=shuffle(c.terms).slice(0,Math.min(7,c.terms.length));
 ui.quiz={chapterId:c.id,questions:targets.map(t=>({id:t.id,choices:shuffle([t,...shuffle(c.terms.filter(x=>x.id!==t.id)).slice(0,3)]).map(x=>x.id)})),index:0,correct:0,selected:null,wrong:[]};
}
function renderQuiz(c){
 const s=ui.quiz;
 const header='<div class="content"><div class="quiz-wrap">'+sectionTitle('物語の記憶テスト','第'+c.number+'話「'+c.title+'」を読んで覚えた用語を確認しましょう。');
 if(s.index>=s.questions.length){
  const count=s.questions.length,score=s.correct;
  return header+'<div class="quiz-complete"><div class="eyebrow">QUIZ COMPLETE</div><div class="score">'+score+'<span style="font-size:24px;color:var(--muted)"> / '+count+'</span></div><h2 style="font-family:var(--serif);font-weight:500">'+(score===count?'全問正解！':score>=5?'いい調子！':'物語を思い出そう')+'</h2><p>間違えた用語は「苦手を復習」に反映されます。<br>一度に覚えなくても、何度も出会えば大丈夫。</p><div class="btn-row"><button class="primary-btn" data-action="quiz-restart" data-id="'+h(c.id)+'">もう一度挑戦</button><button class="outline-btn" data-action="nav" data-route="review">単語カードへ</button></div></div></div></div>';
 }
 const q=s.questions[s.index],target=termById[q.id],selected=s.selected;
 return header+'<div class="quiz-crumb"><span>QUESTION '+(s.index+1)+' / '+s.questions.length+'</span><span>正解 '+s.correct+'問</span></div>'
  +'<div class="quiz-prompt"><small>この説明に当てはまる用語は？</small><p>'+h(target.meaning)+'</p></div>'
  +'<div class="options">'+q.choices.map(id=>{const t=termById[id];let state='';if(selected!==null){if(id===target.id)state=' correct';else if(id===selected)state=' wrong';}
  return '<button class="option'+state+'" data-action="quiz-answer" data-id="'+h(id)+'" '+(selected!==null?'disabled':'')+'>'+h(t.term)+'</button>';}).join('')+'</div>'
  +(selected!==null?'<div class="answer-feedback"><strong>'+(selected===target.id?'正解！':'もう一歩。正解は「'+h(target.term)+'」')+'</strong><br>'+h(target.hook)+'</div><div class="btn-row" style="justify-content:flex-end"><button class="primary-btn" data-action="quiz-next">'+(s.index===s.questions.length-1?'結果を見る':'次の問題 →')+'</button></div>':'')
  +'</div></div>';
}
function answerQuiz(id){
 const s=ui.quiz;if(!s||s.selected!==null)return;
 const targetId=s.questions[s.index].id;
 s.selected=id;
 if(id===targetId){s.correct++;saved.mastery[targetId]=Math.min(3,Math.max(1,(saved.mastery[targetId]||0)+1));saved.wrong=saved.wrong.filter(x=>x!==targetId);}
 else {saved.mastery[targetId]=0;if(!saved.wrong.includes(targetId))saved.wrong.push(targetId);s.wrong.push(targetId);}
 persist();view.innerHTML=renderQuiz(chapterById[s.chapterId]);
}
function quizNext(){
 const s=ui.quiz;if(!s||s.selected===null)return;
 s.index++;s.selected=null;
 if(s.index===s.questions.length){
  const old=saved.quizStats[s.chapterId]||{best:0,attempts:0};
  saved.quizStats[s.chapterId]={best:Math.max(old.best,s.correct),attempts:old.attempts+1};persist();
 }
 view.innerHTML=renderQuiz(chapterById[s.chapterId]);window.scrollTo(0,0);
}
function renderStats(){
 const done=published.filter(c=>percent(c.id)>=95).length;
 return '<div class="content">'+sectionTitle('ふたりと歩んだ記録','小さな積み重ねを、ここに残していきます。')
 +'<div class="stat-grid"><div class="stat-box"><div class="stat-value">'+done+'<span style="font-size:14px"> / '+published.length+'</span></div><div class="stat-label">読み終えた話</div></div><div class="stat-box"><div class="stat-value">'+countKnown()+'<span style="font-size:14px"> / '+allTerms.length+'</span></div><div class="stat-label">繰り返し正解した語</div></div><div class="stat-box"><div class="stat-value">'+saved.starred.length+'</div><div class="stat-label">保存した用語</div></div></div>'
 +'<div class="section-head"><div><div class="eyebrow">READING PROGRESS</div><h2>各話の進み具合</h2></div></div>'
 +'<div class="progress-list">'+published.map(c=>'<div class="progress-item"><div class="progress-item-top"><span>第'+h(c.number)+'話　'+h(c.title)+'</span><small>'+percent(c.id)+'%'+(saved.quizStats[c.id]?' · クイズ最高 '+saved.quizStats[c.id].best+'/7':'')+'</small></div><div class="mini-progress"><span style="width:'+percent(c.id)+'%"></span></div></div>').join('')+'</div>'
 +'<p class="section-foot">学習履歴はこのブラウザ内だけに保存され、アカウントやサーバとは同期されません。端末やブラウザを変えると引き継がれません。</p>'
 +'<button class="icon-btn secondary" style="margin-top:12px;font-size:12px" data-action="reset-data">学習記録を初期化</button></div>';
}
function showTerm(id){
 const t=termById[id];if(!t)return;
 document.getElementById('dialogContent').innerHTML='<div class="eyebrow">WORD NOTE · '+h(t.topic)+'</div><h2>'+h(t.term)+'</h2><div class="meaning">'+h(t.meaning)+'</div><div class="dialog-hook"><strong>物語の場面で覚える</strong><div style="margin-top:6px">'+h(t.hook)+'</div></div>';
 document.getElementById('dialogStar').dataset.id=id;
 document.getElementById('dialogStar').textContent=saved.starred.includes(id)?'★ 保存済み':'☆ 復習用に保存';
 dialog.showModal();
}
function toggleStar(id){
 if(!termById[id])return;
 if(saved.starred.includes(id)){saved.starred=saved.starred.filter(x=>x!==id);notify('保存を解除しました');}
 else{saved.starred.push(id);notify('単語帳に保存しました');}
 persist();
 if(dialog.open&&document.getElementById('dialogStar').dataset.id===id)document.getElementById('dialogStar').textContent=saved.starred.includes(id)?'★ 保存済み':'☆ 復習用に保存';
 const r=route();if(r==='glossary')document.getElementById('glossaryResults').innerHTML=renderGlossaryResults();
 if(r==='review')view.innerHTML=renderReview();
}
function notify(message){
 toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
}
function updateProgressBar(){
 const r=route();
 if(!r.startsWith('read/')){progressBar.style.width='0';return;}
 const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
 progressBar.style.width=Math.round(Math.min(100,window.scrollY/max*100))+'%';
}
function recordScroll(){
 const r=route();updateProgressBar();
 if(!r.startsWith('read/'))return;
 const id=r.split('/')[1];if(!chapterById[id]||chapterById[id].coming)return;
 const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
 const ratio=Math.max(0,Math.min(1,window.scrollY/max));
 saved.positions[id]=ratio;saved.viewed[id]=Math.max(saved.viewed[id]||0,Math.round(ratio*100));
 saved.lastRead=id;
 clearTimeout(saveTimer);saveTimer=setTimeout(persist,300);
}
function restoreReading(id){
 const ratio=Math.max(0,Math.min(1,saved.positions[id]||0));
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const prev=document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,Math.round(max*ratio));
  document.documentElement.style.scrollBehavior=prev;updateProgressBar();
 }));
}
document.addEventListener('click',function(e){
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action,id=b.dataset.id;
 if(action==='nav')go(b.dataset.route);
 else if(action==='read')go('read/'+id);
 else if(action==='quiz'){ui.quiz=null;go('quiz/'+id);}
 else if(action==='quiz-restart'){startQuiz(chapterById[id]);view.innerHTML=renderQuiz(chapterById[id]);window.scrollTo(0,0);}
 else if(action==='quiz-answer')answerQuiz(id);
 else if(action==='quiz-next')quizNext();
 else if(action==='term')showTerm(id);
 else if(action==='star')toggleStar(id);
 else if(action==='dialog-close')dialog.close();
 else if(action==='theme'){saved.theme=saved.theme==='dark'?'light':'dark';persist();uiInit();}
 else if(action==='font-smaller'||action==='font-bigger'){saved.font=Math.max(15,Math.min(23,saved.font+(action==='font-bigger'?1:-1)));persist();uiInit();}
 else if(action==='glossary-filter'){ui.glossaryCategory=b.dataset.filter;view.innerHTML=renderGlossary();const search=document.getElementById('termSearch');search.focus();search.setSelectionRange(search.value.length,search.value.length);}
 else if(action==='deck-filter'){startDeck(b.dataset.filter);view.innerHTML=renderReview();}
 else if(action==='flip'){if(ui.deck){ui.deck.flipped=!ui.deck.flipped;view.innerHTML=renderReview();}}
 else if(action==='card-grade'){
  const d=ui.deck;if(!d||!d.flipped)return;
  const id=d.ids[d.index];
  if(b.dataset.grade==='good'){saved.mastery[id]=Math.min(3,(saved.mastery[id]||0)+1);saved.wrong=saved.wrong.filter(x=>x!==id);}
  else{saved.mastery[id]=0;if(!saved.wrong.includes(id))saved.wrong.push(id);}
  persist();nextCard();
 }
 else if(action==='reset-data'){
  if(confirm('読書進捗・単語の保存・クイズ履歴をすべて削除しますか？')){
   try{localStorage.removeItem(STORAGE_KEY);}catch(err){}
   location.reload();
  }
 }
});
document.addEventListener('input',function(e){
 if(e.target.id==='termSearch'){ui.search=e.target.value;document.getElementById('glossaryResults').innerHTML=renderGlossaryResults();}
});
dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
window.addEventListener('hashchange',render);
window.addEventListener('scroll',recordScroll,{passive:true});
window.addEventListener('resize',updateProgressBar,{passive:true});
window.addEventListener('beforeunload',persist);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist();});
render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
})();
