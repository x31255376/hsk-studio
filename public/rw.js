/* Reading and writing practice, built from the site's own word list and sentences.
   buildRW(VOCAB, LISTEN, SPEAKING) is pure (seeded), so it can be checked in Node; the UI part runs in the page. */
(function(){
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const GROUPS=[['HSK 1–2',[1,2]],['HSK 3–4',[3,4]],['HSK 5–6',[5,6]]];
const grpOfLevel=l=>l<=2?0:l<=4?1:2;
const GROUP_OF_HSKK={Beginner:0,Intermediate:1,Advanced:2};
const PUNCT=/[，。！？、：；“”‘’（）《》…—\s,.!?]/;

function buildRW(VOCAB,LISTEN,SPEAKING,ADV){
  const R=rng(20261106);const ri=n=>Math.floor(R()*n);const pk=a=>a[ri(a.length)];
  const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
  const isProper=py=>/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(py);
  /* dictionary: first (lowest) level wins */
  const DICT=new Map();VOCAB.forEach((l,i)=>l.forEach(w=>{if(!DICT.has(w[0]))DICT.set(w[0],{h:w[0],py:w[1],en:w[2],lvl:i+1})}));
  const byLevelLen={};for(const w of DICT.values()){if(isProper(w.py))continue;const k=w.lvl+'|'+[...w.h].length;(byLevelLen[k]||(byLevelLen[k]=[])).push(w)}
  const CLASSES=[['time',/\b(today|tomorrow|yesterday|morning|noon|afternoon|evening|night|day|week|month|year|now|later|time|hour|minute|o'clock|weekend|spring|summer|autumn|winter)\b/i],
    ['person',/\b(I|me|we|us|you|he|him|she|her|they|them|myself|everyone|somebody)\b/],['number',/\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|number)\b/i],
    ['place',/\b(home|school|hospital|shop|store|park|station|restaurant|airport|library|city|country|room|office|street)\b/i],['weather',/\b(rain|snow|wind|weather|sunny|cloud)\b/i]];
  const cls=w=>{const out=new Set();for(const [k,re] of CLASSES)if(re.test(w.en))out.add(k);return out};
  const clash=(a,b)=>{const A=cls(a);for(const k of cls(b))if(A.has(k))return true;return false};
  const EXTRA=new Set(['小王','小李','小张','小刘','小陈','老刘','老张','老王','每天','每年','每次','年轻人','有时候','一下','一点儿','一会儿','为什么','什么时候','火车站','地铁站','公共汽车','汽车站','电影票','飞机票','图书馆','出租车','自行车','打篮球','踢足球','中国菜','咖啡馆','办公室','面包','手机']);
  const known=w=>DICT.has(w)||EXTRA.has(w);
  function segF(ch){const out=[];let i=0;while(i<ch.length){let took=false;for(let n=Math.min(4,ch.length-i);n>=2;n--){const w=ch.slice(i,i+n).join('');if(known(w)){out.push(w);i+=n;took=true;break}}if(!took){out.push(ch[i]);i++}}return out}
  function segB(ch){const out=[];let j=ch.length;while(j>0){let took=false;for(let n=Math.min(4,j);n>=2;n--){const w=ch.slice(j-n,j).join('');if(known(w)){out.unshift(w);j-=n;took=true;break}}if(!took){out.unshift(ch[j-1]);j--}}return out}
  // forward and backward maximum matching; keep the one with fewer pieces, then fewer single characters
  function seg(s){const ch=[...s];const f=segF(ch),b=segB(ch);const singles=a=>a.filter(x=>[...x].length===1).length;
    if(b.length!==f.length)return b.length<f.length?b:f;return singles(b)<singles(f)?b:f}
  // phrase-level pieces for sentence building: keep numbers with measure words, demonstratives with measures, particles with what they follow
  const NUM=/^[一二三四五六七八九十两几半百千万0-9]+$/,MEAS=new Set(['个','位','本','件','条','只','双','张','杯','斤','次','年','天','岁','点','块','元','家','辆','口','种','遍','分钟','小时','个月','公里','碗','首','份','篇','封','场','顿','节','套','部','台','棵','道','段']);
  const DEM=new Set(['这','那','哪','每','几','一']),PART=new Set(['的','了','吗','呢','吧','着','过','得','们','啊']);
  function phrases(toks){const out=[];for(const t of toks){const prev=out[out.length-1];
    if(prev!==undefined&&MEAS.has(t)&&(NUM.test(prev)||DEM.has(prev)||NUM.test(prev.slice(-1))))out[out.length-1]=prev+t;
    else if(prev!==undefined&&NUM.test(t)&&NUM.test(prev.slice(-1)))out[out.length-1]=prev+t;
    else if(prev!==undefined&&PART.has(t))out[out.length-1]=prev+t;
    else out.push(t)}return out}
  /* sentence corpus with level groups */
  const corpus=[],seenS=new Set();
  const addS=(t,g,src)=>{t=t.trim();if(!t||seenS.has(t))return;seenS.add(t);corpus.push({t,g,src})};
  const splitS=t=>t.match(/[^。！？]+[。！？]/g)||[t];
  SPEAKING.forEach(x=>{const g=GROUP_OF_HSKK[x.lvl];if(x.mode==='picture'||x.mode==='talk'||x.mode==='answer')return;splitS(x.text).forEach(s=>addS(s,g,'speak'))});
  LISTEN.forEach(it=>it.lines.forEach(([w,t])=>splitS(t).forEach(s=>addS(s,grpOfLevel(it.lvl),'listen'))));

  /* ---------- READING ---------- */
  const reading=[[],[],[]].map(()=>({words:[],qa:[],cloze:[],judge:[],order:[],comp:[],gist:[],pcloze:[],insert:[],bingju:[]}));
  // word recognition: pinyin + meaning -> characters
  for(const w of DICT.values()){if(isProper(w.py)||w.lvl>4)continue;const g=grpOfLevel(w.lvl);const len=[...w.h].length;
    const pool=(byLevelLen[w.lvl+'|'+len]||[]).filter(x=>x.h!==w.h&&![...x.h].some(c=>w.h.includes(c)));if(pool.length<3)continue;
    const ds=shuf(pool).slice(0,3);const opts=shuf([w,...ds]);
    reading[g].words.push({kind:'words',w,opts:opts.map(o=>o.h),en:opts.map(o=>`${o.py} · ${o.en}`),ans:opts.indexOf(w)})}
  // question & answer matching (from two-line dialogues that open with a question)
  const qaSrc=LISTEN.filter(it=>it.lines.length===2&&/？$/.test(it.lines[0][1])&&it.lvl<=4);
  qaSrc.forEach(it=>{const g=grpOfLevel(it.lvl);const q=it.lines[0][1],a=it.lines[1][1];const qTok=new Set(seg(q).filter(x=>[...x].length>=2));
    const pool=qaSrc.filter(o=>o!==it&&grpOfLevel(o.lvl)===g&&o.lines[1][1]!==a&&!seg(o.lines[1][1]).some(x=>[...x].length>=2&&qTok.has(x))&&o.lines[0][1]!==q);
    if(pool.length<3)return;const ds=[...new Set(shuf(pool).map(o=>o.lines[1][1]))].slice(0,3);if(ds.length<3)return;const opts=shuf([a,...ds]);
    reading[g].qa.push({kind:'qa',q,opts,ans:opts.indexOf(a),why:`Only this reply answers “${q}”.`})});
  // fill the blank (选词填空)
  corpus.forEach(c=>{const L=[...c.t].length;if(L<6||L>34)return;const toks=seg(c.t.replace(/[。！？]$/,''));const maxLvl=GROUPS[c.g][1][1];
    const cand=toks.map((t,i)=>({t,i,d:DICT.get(t)})).filter(x=>x.d&&[...x.t].length>=2&&x.d.lvl<=maxLvl&&!isProper(x.d.py)&&toks.filter(t=>t===x.t).length===1);
    if(!cand.length)return;const pick=pk(cand);const len=[...pick.t].length;
    const pool=(byLevelLen[pick.d.lvl+'|'+len]||[]).filter(x=>x.h!==pick.t&&!c.t.includes(x.h)&&![...x.h].some(ch=>pick.t.includes(ch))&&!clash(x,pick.d));if(pool.length<3)return;
    // distractors must also not clash with each other's class, so only one option can fit
    const ds=[];for(const x of shuf(pool)){if(ds.every(d=>!clash(d,x)))ds.push(x);if(ds.length===3)break}if(ds.length<3)return;const opts=shuf([pick.d,...ds]);
    const shown=toks.map((t,i)=>i===pick.i?'（　　）':t).join('')+(/[。！？]$/.test(c.t)?c.t.slice(-1):'');
    reading[c.g].cloze.push({kind:'cloze',text:shown,full:c.t,opts:opts.map(o=>o.h),en:opts.map(o=>`${o.py} · ${o.en}`),ans:opts.indexOf(pick.d)})});
  // true or false, and reading comprehension (listening items as texts)
  LISTEN.forEach(it=>{const g=grpOfLevel(it.lvl);if(it.type==='True or false')reading[g].judge.push({kind:'judge',it});else reading[g].comp.push({kind:'comp',it})});
  // sentence order (排列顺序): three consecutive sentences from longer texts
  const passages=[];LISTEN.forEach(it=>{if(it.type==='Passage')passages.push({t:it.lines.map(l=>l[1]).join(''),g:grpOfLevel(it.lvl)});
    else if(it.type==='True or false'&&splitS(it.lines[0][1]).length>=3)passages.push({t:it.lines[0][1],g:grpOfLevel(it.lvl),order:true})});
  SPEAKING.forEach(x=>{if(x.mode==='read'||x.mode==='retell')passages.push({t:x.text,g:2})});
  const seenO=new Set();
  passages.forEach(p=>{const ss=splitS(p.t).map(s=>s.trim()).filter(Boolean);for(let i=0;i+3<=ss.length;i++){const w=ss.slice(i,i+3);const L=w.join('').length;if(L<24||L>110)continue;const k=w.join('');if(seenO.has(k))continue;seenO.add(k);
    const order=shuf([0,1,2]);const item={kind:'order',parts:order.map(j=>w[j]),correct:[0,1,2].map(j=>order.indexOf(j)),full:k};
    // HSK 3–4 texts stay in HSK 3–4; harder texts go to HSK 5–6, and short windows of them also to HSK 3–4
    if(p.g<2)reading[1].order.push(item);else{reading[2].order.push(item);if(L<=80)reading[1].order.push(item)}}});

  /* ---------- WRITING ---------- */
  const writing=[[],[],[]].map(()=>({build:[],pinyin:[],word:[],essay:[],suoxie:[]}));
  const LIMIT=[[5,14],[7,20],[12,26]];
  const SMALL=new Set(['的','了','吗','呢','吧','着','过','得','地','们','啊']);
  const buildSrc=[...corpus,...corpus.filter(c=>c.g<2&&[...c.t].length>=13).map(c=>({...c,g:2}))];
  buildSrc.forEach(c=>{const body=c.t.replace(/[。！？]$/,'');if(PUNCT.test(body))return;const L=[...body].length;const [lo,hi]=LIMIT[c.g];if(L<lo||L>hi)return;
    let chunks=phrases(seg(body));const want=c.g===0?4:c.g===1?5:6;
    while(chunks.length>want){let bi=0,bl=Infinity;for(let i=0;i<chunks.length-1;i++){const l=[...chunks[i]].length+[...chunks[i+1]].length;if(l<bl){bl=l;bi=i}}chunks.splice(bi,2,chunks[bi]+chunks[bi+1])}
    if(chunks.length<3||new Set(chunks).size!==chunks.length)return;
    const order=shuf(chunks.map((_,i)=>i));if(order.every((v,i)=>v===i))order.reverse();
    writing[c.g].build.push({kind:'build',chunks:order.map(i=>chunks[i]),answer:body,end:c.t.slice(-1).match(/[。！？]/)?c.t.slice(-1):'。'})});
  corpus.forEach(c=>{if(c.g===2)return;const body=c.t;const L=[...body].length;if(L<5||L>24)return;const toks=seg(body.replace(/[。！？]$/,''));const maxLvl=GROUPS[c.g][1][1];
    const cand=toks.map((t,i)=>({t,i,d:DICT.get(t)})).filter(x=>x.d&&x.d.lvl<=maxLvl&&!isProper(x.d.py)&&toks.filter(t=>t===x.t).length===1&&!SMALL.has(x.t));if(!cand.length)return;
    const p=pk(cand);writing[c.g].pinyin.push({kind:'pinyin',before:toks.slice(0,p.i).join(''),after:toks.slice(p.i+1).join('')+(/[。！？]$/.test(body)?body.slice(-1):''),word:p.t,py:p.d.py,en:p.d.en,full:body})});
  // write a sentence with a given word (HSK 4 style): words that appear in at least one corpus sentence
  const usedIn=new Map();corpus.forEach(c=>{if(c.g!==1)return;seg(c.t).forEach(t=>{const d=DICT.get(t);if(d&&d.lvl>=3&&d.lvl<=4&&[...t].length>=2&&!isProper(d.py)&&!usedIn.has(t))usedIn.set(t,c.t)})});
  for(const [t,model] of usedIn){const d=DICT.get(t);writing[1].word.push({kind:'word',word:t,py:d.py,en:d.en,model})}
  // short essay with five given words (HSK 5–6 style)
  passages.filter(p=>[...p.t].length>=70).forEach(p=>{const words=[...new Set(seg(p.t).filter(t=>{const d=DICT.get(t);return d&&[...t].length>=2&&d.lvl>=2&&!isProper(d.py)}))];if(words.length<5)return;
    const pick=shuf(words).slice(0,5);writing[2].essay.push({kind:'essay',words:pick.map(w=>({h:w,py:DICT.get(w).py,en:DICT.get(w).en})),model:p.t})});
  /* ---------- HSK 5–6 hand-written tasks ---------- */
  if(ADV){
    ADV.reading.forEach(r=>{
      reading[2].gist.push({kind:'gist',text:r.t,opts:r.gist.opts,ans:r.gist.ans,why:`The passage says “${r.gist.clue}”.`,full:r.t});
      reading[2].pcloze.push({kind:'pcloze',text:r.cloze,qs:r.gaps,full:r.t});
      if(r.insert)reading[2].insert.push({kind:'insert',text:r.insert.text,opts:r.insert.opts,ans:r.insert.ans,full:r.t})});
    ADV.bingju.forEach(b=>reading[2].bingju.push({kind:'bingju',opts:b.opts,ans:b.ans,why:b.why,good:b.good}));
    ADV.suoxie.forEach(x=>writing[2].suoxie.push({kind:'suoxie',...x}));
  }
  return {reading,writing,GROUPS,seg};
}

if(typeof module!=='undefined'){module.exports={buildRW};return}

/* ================= UI ================= */
const $=s=>document.querySelector(s);
const esc=s=>escapeHtml(String(s));
let RW=null;const decks={};
const RMODES=[[['words','Word recognition'],['qa','Question & answer'],['cloze','Fill the blank'],['comp','Read & answer']],
  [['cloze','Fill the blank'],['qa','Question & answer'],['judge','True or false'],['order','Sentence order'],['comp','Read & answer']],
  [['cloze','Fill the blank'],['pcloze','Passage gaps (HSK 5)'],['gist','Which is true? (HSK 5)'],['insert','Put clauses back (HSK 6)'],['bingju','Faulty sentence (HSK 6)'],['order','Sentence order'],['comp','Read & answer']]];
const WMODES=[[['build','Build the sentence'],['pinyin','Pinyin to characters']],
  [['build','Build the sentence'],['pinyin','Pinyin to characters'],['word','Write with a word']],
  [['build','Build the sentence'],['essay','Short essay (HSK 5)'],['suoxie','Summarise a story (HSK 6)']]];
const ST={rd:{g:0,m:'words'},wr:{g:0,m:'build'}};
function ensure(){if(RW)return RW;if(typeof VOCAB==='undefined'||!VOCAB||!window.HSK_FEATURES||!window.HSK_BANKS)return null;
  RW=buildRW(VOCAB,HSK_FEATURES.LISTEN,HSK_BANKS.speaking,window.HSK_ADV);return RW}
function deck(sec){const s=ST[sec];const k=`${sec}-${s.g}-${s.m}`;if(decks[k])return decks[k];const src=(sec==='rd'?RW.reading:RW.writing)[s.g][s.m]||[];return decks[k]=HSK_FEATURES.Deck(k,src)}
function record(sec,ok){if(window.HSKP&&HSKP.recordSkill)HSKP.recordSkill(sec==='rd'?'reading':'writing',ok)}
function modeSeg(sec){const s=ST[sec];const list=(sec==='rd'?RMODES:WMODES)[s.g];const el=$(`#${sec}Mode`);const fresh=el.cloneNode(false);el.replaceWith(fresh);
  if(!list.find(m=>m[0]===s.m))s.m=list[0][0];seg(fresh,list.map(m=>m[1]),i=>{s.m=list[i][0];render(sec)},list.findIndex(m=>m[0]===s.m))}
const LETTERS='ABCDE';
function render(sec){
  const body=$(`#${sec}Body`),rev=$(`#${sec}Reveal`);rev.innerHTML='';
  if(!ensure()){body.innerHTML='<p class="note">Loading the word list…</p>';return}
  const dk=deck(sec);$(`#${sec}Pos`).textContent=dk.items.length?dk.label():'';
  const it=dk.cur();if(!it){body.innerHTML='<p class="note">No items here yet.</p>';return}
  const s=ST[sec];$(`#${sec}Head`).textContent=`${RW.GROUPS[s.g][0]} · ${(sec==='rd'?RMODES:WMODES)[s.g].find(m=>m[0]===s.m)[1]}`;
  body.dataset.answered='';
  if(it.kind==='words')body.innerHTML=`<p class="rw-prompt"><span class="pyl">${colorPinyin(esc(it.w.py))}</span> <span class="note">${esc(it.w.en)}</span></p><p class="note">Choose the characters.</p>${opts(it.opts)}`;
  else if(it.kind==='qa')body.innerHTML=`<p class="rw-prompt han">${esc(it.q)}</p><p class="note">Choose the best reply.</p>${opts(it.opts)}`;
  else if(it.kind==='cloze')body.innerHTML=`<p class="rw-prompt han">${esc(it.text)}</p><p class="note">Choose the word that fits the gap.</p>${opts(it.opts)}`;
  else if(it.kind==='judge'){const q=it.it.qs[0];body.innerHTML=`<p class="rw-prompt han">${esc(it.it.lines[0][1])}</p><p class="rw-prompt han">${esc(q.q)}</p><p class="note">Is the starred statement true?</p>${opts(['对 true','错 false'])}`}
  else if(it.kind==='comp'){const x=it.it;body.innerHTML=`<div class="rw-text">${x.lines.map(([w,t])=>`<p class="han">${x.lines.length>1&&w!=='Q'?(w==='M'?'男：':'女：'):''}${esc(t)}</p>`).join('')}</div>`+
    x.qs.map((q,qi)=>`<div class="rw-q" data-qi="${qi}"><p class="rw-prompt han">${x.qs.length>1?(qi+1)+'. ':''}${esc(q.q)}</p>${opts(q.opts,qi)}</div>`).join('')}
  else if(it.kind==='gist')body.innerHTML=`<div class="rw-text"><p class="han">${esc(it.text)}</p></div><p class="note">Choose the statement that matches the passage (HSK 5 reading, part 2).</p>${opts(it.opts)}`;
  else if(it.kind==='bingju')body.innerHTML=`<p class="note">Which sentence contains a mistake? (HSK 6 reading, part 1)</p>${opts(it.opts)}`;
  else if(it.kind==='pcloze')body.innerHTML=`<div class="rw-text"><p class="han">${esc(it.text)}</p></div><p class="note">Choose the word for each numbered gap (HSK 5 reading, part 1).</p>`+
    it.qs.map((q,qi)=>`<div class="rw-q" data-qi="${qi}"><p class="rw-prompt han">（${qi+1}）</p>${opts(q.opts,qi)}</div>`).join('');
  else if(it.kind==='insert')body.innerHTML=`<div class="rw-text"><p class="han">${esc(it.text)}</p></div><p class="note">Put a clause back into each numbered gap. One clause is not used (HSK 6 reading, part 3).</p>`+
    `<ol class="rw-list han" type="A">${it.opts.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`+
    it.ans.map((a,qi)=>`<div class="rw-q" data-qi="${qi}"><p class="rw-prompt han">（${qi+1}）</p>${letters(it.opts.length,qi)}</div>`).join('');
  else if(it.kind==='suoxie')body.innerHTML=`<p class="note">HSK 6 writing: read the story (10 minutes in the exam), hide it, then write a shorter version with your own title. The exam story is about 1,000 characters and the summary about 400; this one is ${it.len} characters, so aim for about ${aim(it)}.</p>`+
    `<div class="rw-text" id="${sec}Story"><p class="eyebrow">${esc(it.en)}</p><p class="han rw-title">${esc(it.title)}</p>${it.story.map(p=>`<p class="han">${esc(p)}</p>`).join('')}</div>`+
    `<div class="toolbar"><span class="note num" id="${sec}Clock">0:00</span><button class="btn small" type="button" data-act="hide">Hide the story and start writing</button></div>`+
    `<div id="${sec}Write" hidden><input class="search han" id="${sec}Title" type="text" lang="zh" placeholder="标题 Your title" aria-label="Title" style="max-width:260px"><textarea class="rw-area han" id="${sec}Input" rows="9" lang="zh" aria-label="Your summary"></textarea><div class="toolbar"><span class="note num" id="${sec}Count">0 characters</span><button class="btn small" type="button" data-act="check">Finish and show a model</button></div></div>`;
  else if(it.kind==='order')body.innerHTML=`<p class="note">Put the three sentences in the right order. Tap them in order.</p><div class="rw-parts">${it.parts.map((p,i)=>`<button class="choice rw-part" type="button" data-i="${i}"><span class="letter">${LETTERS[i]}</span><span class="han">${esc(p)}</span></button>`).join('')}</div><p class="rw-answer han" id="${sec}Ans"></p><div class="toolbar"><button class="btn ghost small" type="button" data-act="reset">Start again</button></div>`;
  else if(it.kind==='build')body.innerHTML=`<p class="note">Tap the pieces in order to make a sentence.</p><div class="rw-parts chips">${it.chunks.map((p,i)=>`<button class="chip-btn han" type="button" data-i="${i}">${esc(p)}</button>`).join('')}</div><p class="rw-answer han" id="${sec}Ans"></p><div class="toolbar"><button class="btn ghost small" type="button" data-act="reset">Start again</button><button class="btn small" type="button" data-act="check">Check</button></div>`;
  else if(it.kind==='pinyin')body.innerHTML=`<p class="rw-prompt han">${esc(it.before)}<span class="pyl gap">${colorPinyin(esc(it.py))}</span>${esc(it.after)}</p><p class="note">Type the characters for the pinyin. You need a Chinese keyboard (pinyin input) on your device.</p><div class="toolbar"><input class="search han" id="${sec}Input" type="text" autocomplete="off" lang="zh" aria-label="Characters" style="flex:0 1 200px"><button class="btn small" type="button" data-act="check">Check</button><button class="btn ghost small" type="button" data-act="show">Show answer</button></div>`;
  else if(it.kind==='word')body.innerHTML=`<p class="rw-prompt"><span class="han big-han">${esc(it.word)}</span> <span class="pyl">${colorPinyin(esc(it.py))}</span> <span class="note">${esc(it.en)}</span></p><p class="note">Write one complete sentence that uses this word (HSK 4 writing, part 2).</p><textarea class="rw-area han" id="${sec}Input" rows="3" lang="zh" aria-label="Your sentence"></textarea><div class="toolbar"><button class="btn small" type="button" data-act="check">Check and show a model</button></div>`;
  else if(it.kind==='essay')body.innerHTML=`<p class="note">Write about 80 characters using all five words (HSK 5 writing). The count and word checks update as you type.</p><div class="chips">${it.words.map(w=>`<span class="chip word-need" data-w="${esc(w.h)}"><span class="han">${esc(w.h)}</span> <span class="note">${esc(w.py)}</span></span>`).join('')}</div><textarea class="rw-area han" id="${sec}Input" rows="6" lang="zh" aria-label="Your short essay"></textarea><div class="toolbar"><span class="note num" id="${sec}Count">0 characters</span><button class="btn small" type="button" data-act="check">Finish and show a model</button></div>`;
  body._seq=[];body._got=[];clearInterval(body._clock);
  if(it.kind==='suoxie'){const t0=Date.now();body._clock=setInterval(()=>{const el=$(`#${sec}Clock`);if(!el){clearInterval(body._clock);return}const s2=Math.floor((Date.now()-t0)/1000);el.textContent=`${Math.floor(s2/60)}:${String(s2%60).padStart(2,'0')}`},1000);
    const ta=$(`#${sec}Input`);ta.addEventListener('input',()=>{$(`#${sec}Count`).textContent=`${cnt(ta.value)} characters (aim ${aim(it)})`})}
  if(it.kind==='essay'){const ta=$(`#${sec}Input`);ta.addEventListener('input',()=>{const t=ta.value;const n=[...t.replace(/[\s，。！？、：；“”‘’,.!?]/g,'')].length;$(`#${sec}Count`).textContent=`${n} characters`;body.querySelectorAll('.word-need').forEach(c=>c.classList.toggle('ok',t.includes(c.dataset.w)))})}
}
const cnt=t=>[...t.replace(/[\s，。！？、：；“”‘’,.!?]/g,'')].length;
const aim=it=>it.aim||Math.round(it.len*0.4/10)*10;
function letters(n,qi){return `<div class="lopts rw-opts letters-only" data-qi="${qi}">${[...Array(n)].map((_,i)=>`<button class="choice lopt" type="button" data-oi="${i}"><span class="letter">${LETTERS[i]}</span></button>`).join('')}</div>`}
function opts(list,qi){return `<div class="lopts rw-opts"${qi!=null?` data-qi="${qi}"`:''}>${list.map((o,i)=>`<button class="choice lopt" type="button" data-oi="${i}"><span class="letter">${LETTERS[i]}</span><span class="han">${esc(o)}</span></button>`).join('')}</div>`}
function listenBtn(text){return ` <button class="btn ghost small" type="button" data-say="${esc(text)}">▶ Listen</button>`}
function mark(box,ans,oi,en){box.querySelectorAll('.lopt').forEach((b,i)=>{b.disabled=true;if(i===ans)b.classList.add('right');else if(i===oi)b.classList.add('wrong');if(en)b.insertAdjacentHTML('beforeend',`<span class="note opt-en">${esc(en[i])}</span>`)})}
function onClick(sec,e){
  const body=$(`#${sec}Body`),rev=$(`#${sec}Reveal`);const it=deck(sec).cur();
  const say=e.target.closest('[data-say]');if(say){speak(say.dataset.say,0.85);return}
  const opt=e.target.closest('.lopt');
  if(opt&&!opt.disabled){const oi=+opt.dataset.oi;
    if(it.kind==='pcloze'||it.kind==='insert'){const box=opt.closest('.rw-opts');const qi=+box.dataset.qi;const ans=it.kind==='pcloze'?it.qs[qi].ans:it.ans[qi];const ok=oi===ans;mark(box,ans,oi);
      box.closest('.rw-q').insertAdjacentHTML('beforeend',`<p class="lwhy"><span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Answer: '+LETTERS[ans]}</span>${it.kind==='insert'?' <span class="han">'+esc(it.opts[ans])+'</span>':''}</p>`);
      body._got[qi]=ok;const n=it.kind==='pcloze'?it.qs.length:it.ans.length;
      if(body._got.filter(v=>v!==undefined).length===n){const right=body._got.filter(Boolean).length;record(sec,right===n);rev.innerHTML=`<span class="verdict ${right===n?'good':'bad'}">${right} of ${n} right</span> <span class="han">${esc(it.full)}</span>${listenBtn(it.full)}`}return}
    if(it.kind==='comp'){const qi=+opt.closest('.rw-opts').dataset.qi;const q=it.it.qs[qi];const ok=oi===q.ans;mark(opt.closest('.rw-opts'),q.ans,oi,q.en);
      opt.closest('.rw-q').insertAdjacentHTML('beforeend',`<p class="lwhy"><span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Answer: '+LETTERS[q.ans]}</span> ${esc(q.why)}</p>`);record(sec,ok);return}
    if(body.dataset.answered)return;body.dataset.answered='1';
    if(it.kind==='judge'){const q=it.it.qs[0];const ok=oi===q.ans;mark(body,q.ans,oi);rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> ${esc(q.why)}${listenBtn(it.it.lines[0][1])}`;record(sec,ok);return}
    const ok=oi===it.ans;mark(body,it.ans,oi,it.en);record(sec,ok);
    if(it.kind==='words')rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han big-han">${esc(it.w.h)}</span>${listenBtn(it.w.h)}`;
    else if(it.kind==='gist')rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> ${esc(it.why)}${listenBtn(it.full)}`;
    else if(it.kind==='bingju')rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Answer: '+LETTERS[it.ans]}</span> ${esc(it.why)}<br><span class="note">Corrected:</span> <span class="han">${esc(it.good)}</span>`;
    else if(it.kind==='qa')rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> ${esc(it.why)}${listenBtn(it.q+it.opts[it.ans])}`;
    else rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han">${esc(it.full)}</span>${listenBtn(it.full)}`;
    return}
  const part=e.target.closest('.rw-part,.chip-btn');
  if(part&&!part.disabled&&!body.dataset.answered){part.disabled=true;part.classList.add('used');body._seq.push(+part.dataset.i);
    const ansEl=$(`#${sec}Ans`);
    if(it.kind==='order'){ansEl.textContent=body._seq.map(i=>LETTERS[i]).join(' → ');
      if(body._seq.length===3){body.dataset.answered='1';const ok=body._seq.every((v,k)=>v===it.correct[k]);record(sec,ok);
        rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> Order: ${it.correct.map(i=>LETTERS[i]).join(' → ')}<br><span class="han">${esc(it.full)}</span>${listenBtn(it.full)}`}}
    else ansEl.textContent=body._seq.map(i=>it.chunks[i]).join('')+(body._seq.length===it.chunks.length?it.end:'');
    return}
  const act=e.target.closest('[data-act]');if(!act)return;const a=act.dataset.act;
  if(a==='reset'){if(body.dataset.answered&&it.kind==='order')return;body._seq=[];body.querySelectorAll('.rw-part,.chip-btn').forEach(b=>{b.disabled=false;b.classList.remove('used')});$(`#${sec}Ans`).textContent='';rev.innerHTML='';body.dataset.answered='';return}
  if(a==='check'&&it.kind==='build'){const got=body._seq.map(i=>it.chunks[i]).join('');if(body._seq.length<it.chunks.length){rev.innerHTML='<span class="note">Use all the pieces first.</span>';return}
    const ok=got===it.answer;body.dataset.answered='1';record(sec,ok);rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han">${esc(it.answer+it.end)}</span>${listenBtn(it.answer+it.end)}${ok?'':'<br><span class="note">Other word orders can sometimes be correct too; compare yours with this one.</span>'}`;return}
  if(it.kind==='pinyin'){const inp=$(`#${sec}Input`);if(a==='show'){rev.innerHTML=`<span class="han big-han">${esc(it.word)}</span> <span class="note">${esc(it.en)}</span>${listenBtn(it.full)}`;return}
    const v=inp.value.trim();if(!v){rev.innerHTML='<span class="note">Type your answer first.</span>';return}const ok=v===it.word;record(sec,ok);
    rev.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han big-han">${esc(it.word)}</span> <span class="note">${esc(it.en)}</span>${listenBtn(it.full)}`;return}
  if(it.kind==='word'){const v=$(`#${sec}Input`).value.trim();const n=[...v.replace(/[\s，。！？、：；,.!?]/g,'')].length;
    const checks=[[v.includes(it.word),`uses ${it.word}`],[n>=6,'at least 6 characters'],[/[。！？.!?]$/.test(v),'ends with punctuation']];
    rev.innerHTML=`<div class="checks">${checks.map(([ok,t])=>`<span class="chip ${ok?'':'warn-chip'}">${ok?'✓':'✗'} ${esc(t)}</span>`).join(' ')}</div><p class="note">Model sentence from the HSK texts on this site:</p><p class="han">${esc(it.model)}</p>${listenBtn(it.model)}<p class="note">Writing is not graded automatically: compare your grammar and word choice with the model.</p>`;return}
  if(it.kind==='suoxie'){if(a==='hide'){$(`#${sec}Story`).hidden=true;act.hidden=true;$(`#${sec}Write`).hidden=false;$(`#${sec}Input`).focus();return}
    const v=$(`#${sec}Input`).value,title=$(`#${sec}Title`).value.trim();const n=cnt(v),target=aim(it);clearInterval(body._clock);
    const lenOk=n>=target*0.7&&n<=target*1.3;
    rev.innerHTML=`<div class="checks"><span class="chip ${title?'':'warn-chip'}">${title?'✓':'✗'} has a title</span> <span class="chip ${lenOk?'':'warn-chip'}">${lenOk?'✓':'✗'} ${n} characters (aim for about ${target})</span></div>`+
      `<p class="note">Model summary. A good summary keeps who, what happened, how it ended and the point of the story, and leaves out details and dialogue:</p><div class="rw-text han"><p>${esc(it.model)}</p></div>${listenBtn(it.model)}<p class="note">Writing is not graded automatically. Compare the events and the ending with yours; the original story is shown again above.</p>`;
    $(`#${sec}Story`).hidden=false;return}
  if(it.kind==='essay'){const v=$(`#${sec}Input`).value;const n=[...v.replace(/[\s，。！？、：；“”‘’,.!?]/g,'')].length;const used=it.words.filter(w=>v.includes(w.h)).length;
    rev.innerHTML=`<div class="checks"><span class="chip ${used===5?'':'warn-chip'}">${used===5?'✓':'✗'} used ${used} of 5 words</span> <span class="chip ${n>=60&&n<=110?'':'warn-chip'}">${n>=60&&n<=110?'✓':'✗'} ${n} characters (aim for about 80)</span></div><p class="note">A model text that uses these words:</p><div class="rw-text han">${esc(it.model)}</div>${listenBtn(it.model)}<p class="note">${it.words.map(w=>`${esc(w.h)} ${esc(w.py)}: ${esc(w.en)}`).join(' · ')}</p>`;return}
}
function init(sec){
  const s=ST[sec];
  seg($(`#${sec}Lvl`),GROUPS.map(g=>g[0]),i=>{s.g=i;modeSeg(sec);render(sec)},0);modeSeg(sec);
  $(`#${sec}Body`).addEventListener('click',e=>onClick(sec,e));$(`#${sec}Reveal`).addEventListener('click',e=>onClick(sec,e));
  $(`#${sec}Next`).onclick=()=>{if(ensure()){deck(sec).next();render(sec)}};
  $(`#${sec}Prev`).onclick=()=>{if(ensure()){deck(sec).prev();render(sec)}};
  $(`#${sec}Shuf`).onclick=()=>{if(ensure()){deck(sec).shuffle();render(sec)}};
  render(sec);
}
function boot(){init('rd');init('wr');const w=setInterval(()=>{if(ensure()){clearInterval(w);render('rd');render('wr')}},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.HSK_RW={buildRW,get data(){return RW}};
})();
