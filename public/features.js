/* Tone trainer, listening practice, progress & mistake book, HSKK mock exam.
   Depends on globals from the main page script: $, speak, toneOf, colorPinyin, escapeHtml, seg, VOCAB,
   expectedTones, retone, openPractice, KK, TONE_NAMES, zhVoice. */
(function(){
const H=window.HSKP;
const esc=s=>escapeHtml(String(s));
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const mmss=s=>`${Math.floor(s/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
const TONE_SHORT=['light','1st','2nd','3rd','4th'];

/* ---------- shuffle decks: a fixed bank in a shuffled order; the position is remembered in this browser ---------- */
function seededOrder(n,seed){let a=seed>>>0||1;const r=()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  const o=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]]}return o}
function Deck(key,items){
  const store='hskDeck:'+key;let st={seed:0,pos:0,n:items.length};
  try{const v=JSON.parse(localStorage.getItem(store)||'null');if(v&&v.n===items.length)st=v}catch(e){}
  if(!st.seed)st.seed=1+Math.floor(Math.random()*1e9);
  let order=seededOrder(items.length,st.seed);
  const save=()=>{try{localStorage.setItem(store,JSON.stringify(st))}catch(e){}};save();
  return {items,
    cur(){return items[order[st.pos%items.length]]},
    next(){st.pos=(st.pos+1)%items.length;save();return this.cur()},
    prev(){st.pos=(st.pos-1+items.length)%items.length;save();return this.cur()},
    shuffle(){st.seed=1+Math.floor(Math.random()*1e9);st.pos=0;order=seededOrder(items.length,st.seed);save();return this.cur()},
    goTo(item){const i=items.indexOf(item);if(i>=0){st.pos=order.indexOf(i);save()}},
    label(){return `${(st.pos%items.length)+1} / ${items.length.toLocaleString()}`}};
}

/* ---------- speech helpers ---------- */
function voicesZh(){if(!('speechSynthesis' in window))return [];return speechSynthesis.getVoices().filter(v=>/^zh/i.test(v.lang)).sort((a,b)=>(/CN/i.test(b.lang)?1:0)-(/CN/i.test(a.lang)?1:0))}
function ttsSay(text,{rate=0.85,pitch=1,voice=null}={}){
  // device voice fallback; resolves when the line finishes (a timer backs up browsers that never fire onend)
  return new Promise(res=>{
    const est=1200+text.length*320/rate;
    if(!('speechSynthesis' in window)){setTimeout(res,300);return}
    const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=Math.max(0.8,rate);u.pitch=pitch;
    const v=voice||zhVoice;if(v)u.voice=v;
    let done=false;const fin=()=>{if(!done){done=true;clearTimeout(t);res()}};
    const t=setTimeout(fin,est+4000);u.onend=fin;u.onerror=fin;speechSynthesis.speak(u);
  });
}
async function say(text,{rate=0.85,speaker='W',pitch=1,voice=null}={}){
  if('speechSynthesis' in window)speechSynthesis.cancel();
  const r=await HSKAudio.playClip(text,{speaker,rate:HSKAudio.playbackFor(rate)});
  if(r==='missing')await ttsSay(text,{rate,pitch,voice});
}
let playToken=0;
async function sayLines(lines,rate){
  // lines: [speaker, text]; W = woman, M = man, Q = narrator (woman's voice)
  const my=++playToken;HSKAudio.stopClip();if('speechSynthesis' in window)speechSynthesis.cancel();
  const vs=voicesZh();const vW=vs[0]||null,vM=vs[1]||vs[0]||null;
  for(const [who,text] of lines){
    if(my!==playToken)return false;
    const speaker=who==='M'?'M':'W';
    // device-voice fallback only: a second installed voice for the man, otherwise a slightly lower pitch
    const fb=who==='M'?{voice:vM,pitch:vs.length>1?1:0.9}:{voice:vW,pitch:1};
    await say(text,{rate,speaker,...fb});
    if(my!==playToken)return false;
    await new Promise(r=>setTimeout(r,who==='Q'?200:350));
  }
  return my===playToken;
}
function stopAudio(){playToken++;HSKAudio.stopClip();if('speechSynthesis' in window)speechSynthesis.cancel()}

/* ================= TONE TRAINER ================= */
const SINGLE_FALLBACK=[['八','bā'],['拔','bá'],['把','bǎ'],['爸','bà'],['汤','tāng'],['糖','táng'],['躺','tǎng'],['烫','tàng'],['书','shū'],['熟','shú'],['鼠','shǔ'],['树','shù'],['衣','yī'],['姨','yí'],['椅','yǐ'],['意','yì'],['妈','mā'],['麻','má'],['马','mǎ'],['骂','mà']];
function poolSingle(){
  const out=[];if(VOCAB)VOCAB.slice(0,4).forEach(l=>l.forEach(w=>{if([...w[0]].length===1&&!w[1].includes(' ')&&toneOf(w[1])&&!/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(w[1]))out.push({h:w[0],py:w[1],en:w[2],t:[toneOf(w[1])],spoken:w[1]})}));
  return out;
}
function poolPairs(){
  const out=[];if(VOCAB)VOCAB.slice(0,4).forEach(l=>l.forEach(w=>{if([...w[0]].length!==2||/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(w[1]))return;const e=expectedTones(w[1],w[0]);if(e&&e.tones.length===2&&e.tones.every(Boolean))out.push({h:w[0],py:w[1],en:w[2],t:e.tones,spoken:e.syl.map((s,i)=>retone(s,e.tones[i])).join(' ')})}));
  return out;
}
const TT={mode:0,item:null,answered:false,right:0,total:0,streak:0,sel:[0,0],decks:null};
function ttDecks(){if(TT.decks||!VOCAB)return TT.decks;const s1=poolSingle(),p2=poolPairs();
  TT.decks=[Deck('tone-single',s1),Deck('tone-pairs',p2),Deck('tone-which',[...s1,...p2])];return TT.decks}
function ttScore(){
  const el=$('#ttScore');
  el.innerHTML=TT.total?`<b>${TT.right}</b> correct of <b>${TT.total}</b> · ${Math.round(TT.right/TT.total*100)}% · streak <b>${TT.streak}</b>`:'No answers yet this session';
}
function ttNew(){
  TT.answered=false;TT.sel=[0,0];$('#ttReveal').innerHTML='';$('#ttNext').hidden=true;
  const D=ttDecks();if(!D){$('#ttAsk').textContent='Loading words…';$('#ttPos').textContent='';TT.item=null;return}
  const dk=D[TT.mode];$('#ttPos').textContent=dk.label();
  if(TT.mode===0){TT.item=dk.cur();
    $('#ttAsk').textContent='Which tone did you hear?';
    $('#ttChoices').className='choices';
    $('#ttChoices').innerHTML=[1,2,3,4].map(n=>`<button class="choice" type="button" data-t="${n}">${TONE_SHORT[n]}<small>${['','ˉ  high','ˊ  rising','ˇ  dip','ˋ  falling'][n]}</small></button>`).join('')}
  else if(TT.mode===1){TT.item=dk.cur();
    $('#ttAsk').textContent='Pick the tone of each syllable, as it is spoken.';
    $('#ttChoices').className='pairgrid';
    $('#ttChoices').innerHTML=[0,1].map(k=>`<div class="pairrow"><span class="note">Syllable ${k+1}</span>${[1,2,3,4].map(n=>`<button class="choice" type="button" data-s="${k}" data-t="${n}">${TONE_SHORT[n]}</button>`).join('')}</div>`).join('')}
  else{const it=dk.cur();
    TT.item=it;const syl=it.spoken.split(' ');const opts=new Set([it.spoken]);let guard=0;
    while(opts.size<4&&guard++<50){const k=rnd(syl.length);const t=1+rnd(4);const v=syl.map((s,i)=>i===k?retone(s,t):s).join(' ');opts.add(v)}
    TT.opts=shuffle([...opts]);
    $('#ttAsk').textContent='Which one did you hear?';
    $('#ttChoices').className='choices';
    $('#ttChoices').innerHTML=TT.opts.map((o,i)=>`<button class="choice py-choice" type="button" data-o="${i}">${colorPinyin(esc(o))}</button>`).join('')}
}
function ttPlay(){if(!TT.item)ttNew();if(TT.item)say(TT.item.h,{rate:0.6})}
function ttFinish(ok,gotTones){
  TT.answered=true;TT.total++;if(ok){TT.right++;TT.streak++}else TT.streak=0;
  TT.item.t.forEach((w,i)=>{if(gotTones[i])H.recordTone(w,gotTones[i])});
  const it=TT.item;
  $('#ttReveal').innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han" style="font-size:1.4rem">${esc(it.h)}</span> ${colorPinyin(esc(it.spoken))}${it.spoken!==it.py?` <span class="note">(written ${esc(it.py)}, tone change)</span>`:''} <span class="note">${esc(it.en||'')}</span>`;
  $('#ttNext').hidden=false;ttScore();renderConfusion();
}
function initTones(){
  seg($('#ttMode'),['Single tones','Tone pairs','Which word?'],i=>{TT.mode=i;ttNew()},0);
  $('#ttPlay').onclick=ttPlay;
  $('#ttNext').onclick=()=>{const D=ttDecks();if(D)D[TT.mode].next();ttNew();ttPlay()};
  $('#ttShuf').onclick=()=>{const D=ttDecks();if(D)D[TT.mode].shuffle();ttNew()};
  $('#ttChoices').addEventListener('click',e=>{const b=e.target.closest('.choice');if(!b||TT.answered||!TT.item)return;
    if(TT.mode===0){const g=+b.dataset.t,ok=g===TT.item.t[0];b.classList.add(ok?'right':'wrong');if(!ok)$(`#ttChoices .choice[data-t="${TT.item.t[0]}"]`).classList.add('right');ttFinish(ok,[g])}
    else if(TT.mode===1){const s=+b.dataset.s,g=+b.dataset.t;TT.sel[s]=g;
      $('#ttChoices').querySelectorAll(`.choice[data-s="${s}"]`).forEach(x=>x.classList.toggle('picked',x===b));
      if(TT.sel[0]&&TT.sel[1]){const ok=TT.sel[0]===TT.item.t[0]&&TT.sel[1]===TT.item.t[1];
        [0,1].forEach(k=>{$(`#ttChoices .choice[data-s="${k}"][data-t="${TT.item.t[k]}"]`).classList.add('right');if(TT.sel[k]!==TT.item.t[k])$(`#ttChoices .choice[data-s="${k}"][data-t="${TT.sel[k]}"]`).classList.add('wrong')});
        ttFinish(ok,TT.sel.slice())}}
    else{const o=TT.opts[+b.dataset.o],ok=o===TT.item.spoken;b.classList.add(ok?'right':'wrong');
      if(!ok)$('#ttChoices').querySelectorAll('.choice').forEach(x=>{if(TT.opts[+x.dataset.o]===TT.item.spoken)x.classList.add('right')});
      const got=o.split(' ').map(toneOf);ttFinish(ok,got)}
  });
  ttScore();ttNew();renderConfusion();
}
function confusionList(prefix){
  const c=H.data.tone.conf;return Object.entries(c).filter(([k])=>prefix?k.startsWith(prefix):!k.startsWith('say:'))
    .map(([k,n])=>{const [w,g]=k.replace('say:','').split('>').map(Number);return {w,g,n}}).sort((a,b)=>b.n-a.n);
}
function renderConfusion(){
  const el=$('#ttConf');if(!el)return;const top=confusionList('').slice(0,3);
  el.innerHTML=top.length?'<span class="note">Your most common mix-ups:</span> '+top.map(x=>`<span class="chip warn-chip">heard ${TONE_SHORT[x.w]} → chose ${TONE_SHORT[x.g]} ×${x.n}</span>`).join(' '):'<span class="note">Mix-ups you make will show up here, so you know which pairs to drill.</span>';
}

/* ================= LISTENING ================= */
// Original practice items in the style of each HSK level. ans = index of the correct option.
const LISTEN=[
 // HSK 1
 {lvl:1,type:'Short dialogue',lines:[['W','你好！你叫什么名字？'],['M','我叫王明，我是老师。']],qs:[{q:'王明是做什么的？',qEn:'What does Wang Ming do?',opts:['学生','老师','医生'],en:['student','teacher','doctor'],ans:1,why:'He says 我是老师, “I am a teacher”.'}]},
 {lvl:1,type:'Short dialogue',lines:[['M','今天几号？'],['W','今天九月三号，星期五。']],qs:[{q:'今天星期几？',qEn:'What day of the week is it?',opts:['星期五','星期三','星期六'],en:['Friday','Wednesday','Saturday'],ans:0,why:'She says 九月三号，星期五: 3 September, Friday. 三 is the date, not the weekday.'}]},
 {lvl:1,type:'Short dialogue',lines:[['W','你想喝什么？'],['M','我不想喝茶，我想喝水。']],qs:[{q:'男的想喝什么？',qEn:'What does the man want to drink?',opts:['茶','咖啡','水'],en:['tea','coffee','water'],ans:2,why:'不想喝茶 rules out tea; 我想喝水 means he wants water.'}]},
 {lvl:1,type:'Short dialogue',lines:[['M','你家有几个人？'],['W','我家有四个人：爸爸、妈妈、哥哥和我。']],qs:[{q:'女的家有几个人？',qEn:'How many people are in her family?',opts:['三个','四个','五个'],en:['three','four','five'],ans:1,why:'She lists dad, mum, older brother and herself: 四个人, four people.'}]},
 {lvl:1,type:'Short dialogue',lines:[['W','你明天去哪儿？'],['M','我明天去北京看朋友。']],qs:[{q:'男的明天做什么？',qEn:'What is the man doing tomorrow?',opts:['去商店','看朋友','回家'],en:['go to a shop','visit a friend','go home'],ans:1,why:'去北京看朋友: going to Beijing to see a friend.'}]},
 // HSK 2
 {lvl:2,type:'Short dialogue',lines:[['M','你怎么还没走？'],['W','外面下雨了，我等雨小一点儿再走。']],qs:[{q:'女的为什么还没走？',qEn:'Why hasn’t the woman left yet?',opts:['在下雨','没有车','工作没做完'],en:['it is raining','she has no car','work is unfinished'],ans:0,why:'外面下雨了: it is raining outside, so she is waiting for it to ease.'}]},
 {lvl:2,type:'Short dialogue',lines:[['W','这件衣服多少钱？'],['M','两百块，但是今天便宜，一百五就可以。']],qs:[{q:'这件衣服今天多少钱？',qEn:'How much is the item today?',opts:['两百块','一百块','一百五十块'],en:['200 yuan','100 yuan','150 yuan'],ans:2,why:'The usual price is 200, but today 一百五 (short for 一百五十) is enough.'}]},
 {lvl:2,type:'Short dialogue',lines:[['M','你每天怎么去公司？'],['W','以前坐公共汽车，现在坐地铁，比较快。']],qs:[{q:'女的现在怎么去公司？',qEn:'How does she get to work now?',opts:['坐地铁','坐公共汽车','走路'],en:['by subway','by bus','on foot'],ans:0,why:'以前 (before) she took the bus; 现在 (now) she takes the subway.'}]},
 {lvl:2,type:'Short dialogue',lines:[['W','你的汉语说得真好，学了多长时间了？'],['M','快两年了，我每天都练习。']],qs:[{q:'男的学汉语多长时间了？',qEn:'How long has he studied Chinese?',opts:['一年','差不多两年','三年'],en:['one year','almost two years','three years'],ans:1,why:'快两年了 means “almost two years”.'}]},
 {lvl:2,type:'Short dialogue',lines:[['M','医生，我孩子从昨天晚上开始发烧。'],['W','别着急，先吃这个药，多喝水，多休息。']],qs:[{q:'他们最可能在哪儿？',qEn:'Where are they most likely?',opts:['学校','医院','饭店'],en:['school','hospital','restaurant'],ans:1,why:'He calls her 医生 (doctor) and she prescribes medicine: a hospital.'}]},
 // HSK 3
 {lvl:3,type:'Short dialogue',lines:[['W','你周末有空吗？我们一起去爬山吧。'],['M','我也很想去，可是周末要加班，下次吧。']],qs:[{q:'男的周末要做什么？',qEn:'What does the man have to do at the weekend?',opts:['爬山','加班','休息'],en:['go hiking','work overtime','rest'],ans:1,why:'可是周末要加班: “but I have to work overtime at the weekend”. 可是 signals the real answer.'}]},
 {lvl:3,type:'Short dialogue',lines:[['M','你的手机怎么了？'],['W','昨天不小心掉进水里了，现在打不开。我打算明天拿去修一下。']],qs:[{q:'女的明天要做什么？',qEn:'What will she do tomorrow?',opts:['买新手机','修手机','找手机'],en:['buy a new phone','get the phone repaired','look for the phone'],ans:1,why:'打算明天拿去修一下: she plans to take it to be repaired tomorrow.'}]},
 {lvl:3,type:'Short dialogue',lines:[['W','这次考试你准备得怎么样了？'],['M','别提了，最近工作太忙，书还没看完一半呢。']],qs:[{q:'男的是什么意思？',qEn:'What does the man mean?',opts:['准备得很好','准备得不好','考试已经结束了'],en:['well prepared','poorly prepared','the exam is over'],ans:1,why:'别提了 (“don’t ask”) shows frustration, and he has not read even half the book.'}]},
 {lvl:3,type:'Short dialogue',lines:[['M','小李，会议改到明天下午三点了，你通知一下大家。'],['W','好的，我马上发邮件。']],qs:[{q:'女的接下来要做什么？',qEn:'What will the woman do next?',opts:['发邮件','开会','打电话'],en:['send an email','hold the meeting','make a call'],ans:0,why:'我马上发邮件: “I’ll send an email right away.” The meeting itself is tomorrow.'}]},
 {lvl:3,type:'Conversation',lines:[['W','我们点菜吧。你吃辣的吗？'],['M','我是南方人，不太习惯吃太辣的，点一个不辣的鱼吧。'],['W','好，再要一个青菜和两碗米饭。']],qs:[{q:'男的为什么不点辣的菜？',qEn:'Why doesn’t the man order spicy food?',opts:['他不饿','鱼太贵','不太习惯吃辣'],en:['he isn’t hungry','fish is too expensive','not used to spicy food'],ans:2,why:'不太习惯吃太辣的: he is not used to very spicy food.'}]},
 // HSK 4
 {lvl:4,type:'Short dialogue',lines:[['M','听说你下个月要去上海工作了？'],['W','对，公司在那边开了一个新办公室，我去负责那边的市场。']],qs:[{q:'女的为什么去上海？',qEn:'Why is she going to Shanghai?',opts:['去旅游','去上学','负责新办公室的市场','看父母'],en:['travel','study','run marketing for the new office','see her parents'],ans:2,why:'公司开了一个新办公室，我去负责那边的市场: she will be in charge of the new office’s market.'}]},
 {lvl:4,type:'Short dialogue',lines:[['W','这台电脑用了五年了，速度越来越慢。'],['M','与其花钱修，不如直接买台新的，现在新电脑也不贵。']],qs:[{q:'男的建议怎么做？',qEn:'What does the man suggest?',opts:['修电脑','买新电脑','借一台电脑','先不用电脑'],en:['repair it','buy a new one','borrow one','stop using it for now'],ans:1,why:'与其A，不如B means “rather than A, better to B”: buy a new one.'}]},
 {lvl:4,type:'Short dialogue',lines:[['M','你怎么看起来这么累？'],['W','昨晚邻居家开生日聚会，一直到凌晨两点才结束，吵得我根本睡不着。']],qs:[{q:'女的为什么很累？',qEn:'Why is she tired?',opts:['加班到很晚','参加了聚会','邻居太吵，没睡好','身体不舒服'],en:['worked late','went to a party','noisy neighbours, slept badly','felt unwell'],ans:2,why:'The neighbours had the party, not her: 吵得我根本睡不着, too noisy to sleep.'}]},
 {lvl:4,type:'Long dialogue',lines:[['W','我想报名参加学校的志愿者活动，但是担心会影响学习。'],['M','其实不一定。我去年也参加过，每周只要去一个下午，不但认识了很多朋友，而且还提高了沟通能力。'],['W','听你这么说，我就放心了。']],qs:[
   {q:'关于男的，可以知道什么？',qEn:'What do we learn about the man?',opts:['他今年第一次参加','他觉得活动浪费时间','他参加过志愿者活动','他每周去三天'],en:['first time this year','thinks it wastes time','has volunteered before','goes three days a week'],ans:2,why:'我去年也参加过: he took part last year.'},
   {q:'女的现在觉得怎么样？',qEn:'How does the woman feel now?',opts:['更担心了','放心了','很生气','很失望'],en:['more worried','reassured','angry','disappointed'],ans:1,why:'我就放心了: “then I can stop worrying.”'}]},
 {lvl:4,type:'Short dialogue',lines:[['M','这家餐厅的菜虽然有点儿贵，但是味道和服务都没得说。'],['W','难怪每次来都要排队。']],qs:[{q:'关于这家餐厅，下面哪个正确？',qEn:'Which is true about the restaurant?',opts:['很便宜','服务不好','客人很多','味道一般'],en:['cheap','poor service','lots of customers','average taste'],ans:2,why:'每次来都要排队: there is always a queue. 没得说 means “couldn’t be better”.'}]},
 // HSK 5
 {lvl:5,type:'Short dialogue',lines:[['W','这个方案你再考虑考虑吧，我觉得成本太高，客户恐怕很难接受。'],['M','有道理，我回去把预算重新算一下，尽量压缩一些。']],qs:[{q:'男的接下来打算做什么？',qEn:'What will the man do next?',opts:['放弃这个方案','重新计算预算','联系客户','提高价格'],en:['drop the plan','recalculate the budget','contact the client','raise the price'],ans:1,why:'把预算重新算一下: redo the budget and cut costs.'}]},
 {lvl:5,type:'Short dialogue',lines:[['M','你们公司最近招聘得怎么样？'],['W','简历收了不少，可真正符合要求的没几个，大多数人缺乏相关经验。']],qs:[{q:'女的认为应聘者的主要问题是什么？',qEn:'What is the main problem with applicants?',opts:['要求工资太高','学历不够','缺乏相关经验','简历太少'],en:['salary demands too high','not enough education','lack relevant experience','too few CVs'],ans:2,why:'大多数人缺乏相关经验: most lack relevant experience. Plenty of CVs arrived.'}]},
 {lvl:5,type:'Passage',lines:[['Q','很多人认为，记忆力好的人天生聪明。其实，记忆力在很大程度上是可以训练的。研究发现，把需要记住的内容和熟悉的画面联系起来，比简单地重复要有效得多。另外，充足的睡眠也能帮助大脑整理和保存白天学到的信息。所以，与其熬夜背书，不如早点儿休息。']],qs:[
   {q:'根据这段话，哪种方法记东西更有效？',qEn:'Which way of memorising works better?',opts:['不停地重复','把内容和画面联系起来','晚上熬夜学习','只记重要的部分'],en:['repeat non-stop','link content to images','stay up late','only memorise key parts'],ans:1,why:'把内容和熟悉的画面联系起来，比简单地重复要有效得多.'},
   {q:'说话人想告诉我们什么？',qEn:'What is the speaker’s point?',opts:['记忆力是天生的','睡眠对记忆有帮助','聪明的人不用学习','熬夜背书效果最好'],en:['memory is innate','sleep helps memory','smart people needn’t study','late-night cramming works best'],ans:1,why:'充足的睡眠也能帮助大脑整理和保存信息, so rest rather than cram.'}]},
 {lvl:5,type:'Short dialogue',lines:[['W','听说老张辞职了？他在公司干得好好的。'],['M','他说想趁年轻出去闯一闯，自己开一家咖啡馆。']],qs:[{q:'老张为什么辞职？',qEn:'Why did Lao Zhang quit?',opts:['工资太低','和同事关系不好','想自己创业','身体不好'],en:['low pay','problems with colleagues','to start his own business','poor health'],ans:2,why:'趁年轻出去闯一闯，自己开一家咖啡馆: try his luck while young and open a café.'}]},
 // HSK 6
 {lvl:6,type:'Short dialogue',lines:[['M','这部电影票房这么高，口碑却一般，你怎么看？'],['W','说到底还是宣传做得好。不过观众也不傻，要想长久，最终还得靠作品本身的质量。']],qs:[{q:'女的认为电影要长久成功靠什么？',qEn:'What does lasting success depend on, in her view?',opts:['宣传','明星','作品质量','票价'],en:['promotion','stars','quality of the work','ticket price'],ans:2,why:'要想长久，最终还得靠作品本身的质量. Promotion explains the box office, not lasting success.'}]},
 {lvl:6,type:'Passage',lines:[['Q','近年来，越来越多的年轻人选择离开大城市，回到家乡发展。一方面，大城市生活成本高、竞争激烈，让不少人感到压力巨大；另一方面，随着网络和交通的发展，在小城市同样可以找到不错的机会。当然，也有人担心家乡的发展空间有限。专家指出，关键在于找到适合自己的定位，而不是盲目跟风。']],qs:[
   {q:'年轻人离开大城市的原因之一是什么？',qEn:'One reason young people leave big cities?',opts:['大城市机会太多','生活成本高、竞争激烈','家乡工资更高','父母要求回家'],en:['too many opportunities','high costs, fierce competition','higher pay at home','parents insist'],ans:1,why:'一方面，大城市生活成本高、竞争激烈.'},
   {q:'专家的观点是什么？',qEn:'What is the expert’s view?',opts:['年轻人都应该回家乡','大城市一定更好','要找到适合自己的定位','不要使用网络'],en:['everyone should go home','big cities are always better','find the position that suits you','avoid the internet'],ans:2,why:'关键在于找到适合自己的定位，而不是盲目跟风: don’t just follow the trend.'}]},
 {lvl:6,type:'Short dialogue',lines:[['W','你这个计划听起来不错，但执行起来恐怕没那么简单。'],['M','我知道困难不少，可总不能因为怕失败就什么都不做吧。']],qs:[{q:'男的是什么态度？',qEn:'What is the man’s attitude?',opts:['打算放弃','愿意尝试','非常担心','觉得计划很简单'],en:['plans to give up','willing to try','very worried','thinks it is easy'],ans:1,why:'总不能因为怕失败就什么都不做吧: you can’t do nothing out of fear of failing.'}]},
 {lvl:6,type:'Short dialogue',lines:[['M','小王做事一向雷厉风行，交给他的任务从来不拖。'],['W','难怪领导这么器重他。']],qs:[{q:'关于小王，可以知道什么？',qEn:'What do we learn about Xiao Wang?',opts:['做事很慢','做事果断、效率高','经常请假','不受领导重视'],en:['slow worker','decisive and efficient','often takes leave','not valued by the boss'],ans:1,why:'雷厉风行 means acting swiftly and decisively; 器重 means the boss values him highly.'}]}
];
LISTEN.push(...(window.HSK_BANKS?HSK_BANKS.listening:[]));
LISTEN.forEach(it=>{it.id='L'+HSKAudio.fnv(it.lines.map(l=>l[1]).join('|')+'|'+it.qs[0].q).slice(0,10)});
const LS={lvl:1,plays:0,showT:false,answers:{},decks:{}};
function lsDeck(){return LS.decks[LS.lvl]||(LS.decks[LS.lvl]=Deck('listen-'+LS.lvl,LISTEN.filter(x=>x.lvl===LS.lvl)))}
function lsRender(){
  stopAudio();const dk=lsDeck(),it=dk.cur();LS.plays=0;LS.showT=false;$('#lsPos').textContent=dk.label();
  const wrongMark=id=>H.data.listen.wrong[id]?' <span class="chip warn-chip">in your mistake book</span>':'';
  $('#lsHead').innerHTML=`<span class="eyebrow">HSK ${it.lvl} · ${esc(it.type)}</span>${wrongMark(it.id)}`;
  $('#lsPlays').textContent='';
  $('#lsTranscript').hidden=true;
  $('#lsTranscript').innerHTML=it.lines.map(([w,t])=>`<p><b>${w==='W'?'Woman':w==='M'?'Man':'Speaker'}:</b> <span class="han">${esc(t)}</span></p>`).join('');
  $('#lsTBtn').textContent='Show transcript';
  $('#lsQs').innerHTML=it.qs.map((q,qi)=>`<div class="lq" data-qi="${qi}">
      <p class="lq-q"><span class="han">${it.qs.length>1?(qi+1)+'. ':''}${esc(q.q)}</span> <span class="note">${esc(q.qEn)}</span></p>
      <div class="lopts">${q.opts.map((o,oi)=>`<button class="choice lopt" type="button" data-oi="${oi}"><span class="letter">${'ABCD'[oi]}</span><span class="han">${esc(o)}</span></button>`).join('')}</div>
      <p class="lwhy" hidden></p></div>`).join('');
  const done=LS.answers[it.id];if(done)done.forEach((oi,qi)=>{if(oi!=null)lsMark(it,qi,oi,false)});
}
function lsMark(it,qi,oi,record){
  const q=it.qs[qi],box=$(`#lsQs .lq[data-qi="${qi}"]`);const ok=oi===q.ans;
  box.querySelectorAll('.lopt').forEach((b,i)=>{b.disabled=true;if(i===q.ans)b.classList.add('right');else if(i===oi)b.classList.add('wrong');
    b.insertAdjacentHTML('beforeend',`<span class="note opt-en">${esc(q.en[i])}</span>`)});
  const why=box.querySelector('.lwhy');why.hidden=false;why.innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Answer: '+'ABCD'[q.ans]}</span> ${esc(q.why)}`;
  if(record){(LS.answers[it.id]||(LS.answers[it.id]=[]))[qi]=oi;
    const all=it.qs.every((_,k)=>LS.answers[it.id][k]!=null);
    if(all){const allOk=it.qs.every((qq,k)=>LS.answers[it.id][k]===qq.ans);H.recordListening(it.id,it.lvl,allOk)}
    if(all){$('#lsTranscript').hidden=false;$('#lsTBtn').textContent='Hide transcript'}}
}
async function lsPlay(){
  const it=lsDeck().cur();LS.plays++;$('#lsPlays').textContent=`Played ${LS.plays}×${LS.plays>2?' · the real exam plays most items once or twice':''}`;
  $('#lsPlay').disabled=true;$('#lsPlay').textContent='Playing…';
  const lines=[...it.lines,...it.qs.filter(q=>q.read!==false).map(q=>['Q','问：'+q.q])];
  await sayLines(lines,it.lvl<=2?0.75:it.lvl<=4?0.85:0.92);
  $('#lsPlay').disabled=false;$('#lsPlay').textContent='▶ Play again';
}
function initListening(){
  seg($('#lsSeg'),[1,2,3,4,5,6].map(n=>'HSK '+n),i=>{LS.lvl=i+1;lsRender();$('#lsPlay').textContent='▶ Play audio'},0);
  $('#lsPlay').onclick=lsPlay;
  $('#lsTBtn').onclick=()=>{const t=$('#lsTranscript');t.hidden=!t.hidden;$('#lsTBtn').textContent=t.hidden?'Show transcript':'Hide transcript'};
  $('#lsPrev').onclick=()=>{lsDeck().prev();lsRender();$('#lsPlay').textContent='▶ Play audio'};
  $('#lsNext').onclick=()=>{lsDeck().next();lsRender();$('#lsPlay').textContent='▶ Play audio'};
  $('#lsShuf').onclick=()=>{lsDeck().shuffle();LS.answers={};lsRender();$('#lsPlay').textContent='▶ Play audio'};
  $('#lsQs').addEventListener('click',e=>{const b=e.target.closest('.lopt');if(!b||b.disabled)return;const it=lsDeck().cur();
    const qi=+b.closest('.lq').dataset.qi;lsMark(it,qi,+b.dataset.oi,true)});
  lsRender();
}
function openListening(id){const it=LISTEN.find(x=>x.id===id);if(!it)return;LS.lvl=it.lvl;lsDeck().goTo(it);delete LS.answers[id];
  $('#lsSeg').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',i===it.lvl-1));lsRender();$('#listening').scrollIntoView({behavior:'smooth'})}

/* ================= VOCAB: known / review ================= */
function initVocabMarks(){
  // buttons inside the practice sheet
  const bar=document.createElement('div');bar.className='toolbar';bar.id='pMarks';
  bar.innerHTML='<button class="btn ghost" id="pKnown" type="button">✓ I know this</button><button class="btn ghost" id="pReview" type="button">☆ Add to review list</button>';
  $('#pStatus').before(bar);
  const lvlOf=h=>{if(!VOCAB)return 1;for(let i=0;i<VOCAB.length;i++)if(VOCAB[i].some(w=>w[0]===h))return i+1;return 0};
  function sync(){const h=$('#pTarget').textContent,inList=lvlOf(h)>0;bar.hidden=!inList;
    $('#pKnown').classList.toggle('on',H.isKnown(h));$('#pKnown').textContent=H.isKnown(h)?'✓ Known':'✓ I know this';
    $('#pReview').classList.toggle('on',H.isReview(h));$('#pReview').textContent=H.isReview(h)?'★ On review list':'☆ Add to review list'}
  new MutationObserver(sync).observe($('#pTarget'),{childList:true,characterData:true,subtree:true});
  $('#pKnown').onclick=()=>{const h=$('#pTarget').textContent;H.setKnown(h,lvlOf(h),!H.isKnown(h));sync();markCards()};
  $('#pReview').onclick=()=>{const h=$('#pTarget').textContent;H.setReview(h,lvlOf(h),!H.isReview(h));sync();markCards()};
  // filter select next to search
  const sel=document.createElement('select');sel.id='vFilter';sel.className='search';sel.style.flex='0 1 170px';sel.setAttribute('aria-label','Show words');
  sel.innerHTML='<option value="all">All words</option><option value="new">Not known yet</option><option value="review">Review list</option><option value="known">Known</option>';
  $('#vSearch').after(sel);
  sel.onchange=()=>{window.HSK_FILTER=sel.value;rebuild()};
  // mark cards as they render
  new MutationObserver(markCards).observe($('#cards'),{childList:true});
}
function markCards(){document.querySelectorAll('#cards .card').forEach(c=>{const h=c.querySelector('.ch').textContent;c.classList.toggle('known',H.isKnown(h));c.classList.toggle('review',H.isReview(h))})}

/* ================= PROGRESS & MISTAKE BOOK ================= */
function renderProgress(){
  const P=H.data;const el=$('#pgTiles');if(!el)return;
  const knownN=Object.keys(P.known).length,revN=Object.keys(P.review).length;
  const lt=Object.values(P.listen.byLevel).reduce((a,b)=>({right:a.right+b.right,total:a.total+b.total}),{right:0,total:0});
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const mins=s=>s<3600?Math.round(s/60)+' min':(s/3600).toFixed(1)+' h';
  el.innerHTML=[
    [knownN.toLocaleString(),'Words known',`of 5,363`],
    [pct(P.tone.right,P.tone.total),'Tone listening',`${P.tone.total} syllables judged`],
    [pct(lt.right,lt.total),'Listening questions',`${lt.total} item${lt.total===1?'':'s'} answered`],
    [pct(P.pron.sylRight,P.pron.syl),'Tones you say',`${P.pron.attempts} recordings`],
    [mins(P.days[H.today()]||0),'Practice today',`${mins(P.secs)} in total`],
    [H.streak()+'','Day streak','days with 1+ min']
  ].map(([v,k,s])=>`<div class="sc"><b>${v}</b><span>${k}</span><small class="note">${s}</small></div>`).join('');
  // per-level word bars
  const lv=[0,0,0,0,0,0];Object.values(P.known).forEach(l=>{if(l>=1&&l<=6)lv[l-1]++});
  const totals=VOCAB?VOCAB.map(l=>l.length):[506,750,953,972,1059,1123];
  $('#pgLevels').innerHTML=lv.map((n,i)=>`<div class="lvbar"><span class="note">HSK ${i+1}</span><div class="vbar"><span style="width:${Math.min(100,n/totals[i]*100)}%"></span></div><span class="note num">${n}/${totals[i]}</span></div>`).join('');
  // mistake book
  const rev=Object.keys(P.review);
  $('#mbWords').innerHTML=rev.length?rev.map(h=>`<button class="chip word-chip han" type="button" data-h="${esc(h)}">${esc(h)}</button>`).join(''):'<p class="note">Tap ☆ in pronunciation practice to save words you keep forgetting.</p>';
  const wr=Object.keys(P.listen.wrong).map(id=>LISTEN.find(x=>x.id===id)).filter(Boolean);
  $('#mbListen').innerHTML=wr.length?wr.map(it=>`<button class="mb-item" type="button" data-id="${it.id}"><span class="chip">HSK ${it.lvl}</span> <span class="han">${esc(it.qs[0].q)}</span> <span class="note">Retry →</span></button>`).join(''):'<p class="note">Listening questions you get wrong are kept here until you answer them correctly.</p>';
  const heard=confusionList(''),said=confusionList('say:');
  $('#mbTones').innerHTML=(heard.length||said.length)?
    [...heard.slice(0,4).map(x=>`<li>When you <b>hear</b> a ${TONE_SHORT[x.w]} tone you often pick ${TONE_SHORT[x.g]} <span class="note">×${x.n}</span></li>`),
     ...said.slice(0,4).map(x=>`<li>When you <b>say</b> a ${TONE_SHORT[x.w]} tone it often comes out as ${x.g?TONE_SHORT[x.g]:'unclear'} <span class="note">×${x.n}</span></li>`)].join(''):'<li class="note">Tone mix-ups from the trainer and your recordings appear here.</li>';
}
function initProgress(){
  H.onChange(()=>{renderProgress();renderConfusion()});
  $('#mbWords').addEventListener('click',e=>{const b=e.target.closest('[data-h]');if(!b||!VOCAB)return;const h=b.dataset.h;
    for(const l of VOCAB){const w=l.find(x=>x[0]===h);if(w){speak(w[0],0.7);openPractice(w[0],w[1],w[2]);return}}});
  $('#mbListen').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openListening(b.dataset.id)});
  $('#pgReset').onclick=()=>{$('#pgConfirm').hidden=false};
  $('#pgNo').onclick=()=>{$('#pgConfirm').hidden=true};
  $('#pgYes').onclick=async()=>{$('#pgConfirm').hidden=true;H.reset();try{await idbClear()}catch(e){}renderProgress();renderHistory();markCards()};
  renderProgress();
}

/* ================= HSKK MOCK EXAM ================= */
const MOCK=[
 {name:'Beginner',for:'HSK 1–2 · about 200 words',prep:420,prepBefore:2,parts:[
   {title:'Part 1 · Listen and repeat',how:'You hear each sentence once. Repeat it straight away.',mode:'repeat',sec:8,items:[
     ['我每天七点起床。','I get up at seven every day.'],['这个苹果很好吃。','This apple is delicious.'],['你明天去哪儿？','Where are you going tomorrow?'],['我想喝一杯水。','I would like a glass of water.'],['他是我的中国朋友。','He is my Chinese friend.'],
     ['我们明天下午去看电影。','We are going to a film tomorrow afternoon.'],['请问，火车站怎么走？','Excuse me, how do I get to the station?'],['我的手机在桌子上。','My phone is on the table.'],['今天太冷了，我不想出去。','It is too cold today; I don’t want to go out.'],['她每天晚上九点睡觉。','She goes to bed at nine every evening.']]},
   {title:'Part 2 · Listen and answer',how:'You hear a question. Answer it with a short sentence.',mode:'answer',sec:12,items:[
     ['你喜欢什么颜色？','What color do you like?'],['你家有几口人？','How many people are in your family?'],['你今天怎么来的？','How did you get here today?'],['你会说汉语吗？','Can you speak Chinese?'],['你喜欢喝茶还是咖啡？','Do you prefer tea or coffee?'],['你今天早上吃了什么？','What did you eat this morning?']]},
   {title:'Part 3 · Answer questions',how:'Read the question and talk for up to 1.5 minutes.',mode:'talk',sec:90,items:[
     ['请介绍一下你的家。','Describe your family.'],['你周末一般做什么？','What do you usually do at the weekend?']]}]},
 {name:'Intermediate',for:'HSK 3–4 · about 900 words',prep:600,prepBefore:1,parts:[
   {title:'Part 1 · Listen and repeat',how:'You hear each sentence once. Repeat it straight away.',mode:'repeat',sec:10,items:[
     ['虽然今天下雨，但是我们还是去了公园。','Although it rained today, we still went to the park.'],['如果你有时间的话，我们一起去看电影吧。','If you have time, let’s go to a film together.'],['他已经在这家公司工作三年了。','He has worked at this company for three years.'],['我把作业忘在家里了。','I left my homework at home.'],
     ['这个周末我打算和朋友一起去爬山。','This weekend I plan to go hiking with friends.'],['他一边听音乐，一边做作业。','He does his homework while listening to music.'],['要是明天不下雨，我们就去公园。','If it doesn’t rain tomorrow, we’ll go to the park.'],['我已经习惯了这里的天气。','I have got used to the weather here.'],['这本书比那本有意思多了。','This book is much more interesting than that one.'],['请你把窗户打开，好吗？','Could you open the window, please?']]},
   {title:'Part 2 · Describe a picture',how:'Describe what you see for up to 2 minutes: who, where, what is happening and why.',mode:'picture',sec:120,items:[
     ['一家人在饭馆里吃饭，一个孩子在哭。','Picture: a family is eating at a restaurant and a child is crying.'],['一个年轻人在机场看手机，旁边有一个很大的行李箱。','Picture: a young person at an airport looks at a phone next to a big suitcase.']]},
   {title:'Part 3 · Answer questions',how:'Read the question and talk for up to 2 minutes.',mode:'talk',sec:120,items:[
     ['你觉得学习外语最难的是什么？','What is the hardest part of learning a foreign language?'],['请谈谈你最喜欢的一个城市。','Talk about the city you like most.']]}]},
 {name:'Advanced',for:'HSK 5–6 · 3,000+ words',prep:600,prepBefore:1,parts:[
   {title:'Part 1 · Listen and retell',how:'You hear a short passage once. Retell it in your own words.',mode:'retell',sec:120,items:[
     ['小王第一次去面试的时候非常紧张，说话的声音一直在发抖。面试结束后，他觉得自己一定没有希望了。没想到一个星期以后，公司打电话通知他被录取了。经理说，他们看重的不是他说得多流利，而是他回答问题时的真诚。','A nervous first interview; he got the job because of his sincerity.'],
     ['有一位老人每天早上都在公园里打扫落叶。有人问他为什么这么做，他笑着说：“公园是大家的，我只是做一点儿自己能做的事。”后来，越来越多的人加入了他，公园变得比以前更干净了。','An old man sweeps the park every morning; others join him.'],
     ['现在很多人习惯用手机付款，出门几乎不带现金。这种方式虽然方便，但也有人担心个人信息的安全。专家建议，大家在使用手机付款时，一定要设置密码，并且不要随便点击陌生的链接。','Mobile payment is convenient, but protect your information.']]},
   {title:'Part 2 · Read aloud',how:'Read the passage aloud clearly and naturally, within 2 minutes.',mode:'read',sec:120,items:[
     ['每天早上，我都会去公园跑步。公园里有很多老人在打太极拳，也有年轻人在遛狗。春天的时候，湖边的柳树长出新芽，空气里都是花的香味。跑完步，我喜欢坐在长椅上，看太阳慢慢升起来。这短短的一个小时，是我一天里最安静的时间。','A morning run in the park.']]},
   {title:'Part 3 · Answer questions',how:'Read the question and talk for up to 2.5 minutes.',mode:'talk',sec:150,items:[
     ['你认为科技让人与人之间的关系更近了还是更远了？','Has technology brought people closer or pushed them apart?'],['有人说“失败是成功之母”，你怎么看？','“Failure is the mother of success.” Do you agree?']]}]}
];
const MOCK_COUNTS={Beginner:[15,10,2],Intermediate:[10,2,2],Advanced:[3,1,2]};
function drawMock(i){
  // copy the level's structure and fill each part with fresh prompts from the HSKK bank
  const L=MOCK[i],bank=window.HSK_BANKS?HSK_BANKS.speaking:[];
  return Object.assign({},L,{parts:L.parts.map((p,pi)=>{const pool=bank.filter(x=>x.lvl===L.name&&x.mode===p.mode);const n=MOCK_COUNTS[L.name][pi];
    return Object.assign({},p,{items:pool.length>=n?shuffle(pool).slice(0,n).map(x=>[x.text,x.en]):p.items})})});
}
const MX={lvl:1,steps:[],i:0,stream:null,rec:null,chunks:[],clips:[],timer:null,left:0,running:false,id:null,started:0};
function buildSteps(L){
  const steps=[];
  L.parts.forEach((p,pi)=>{
    if(pi===L.prepBefore)steps.push({kind:'prep',sec:L.prep,parts:L.parts.slice(pi).map(x=>x)});
    steps.push({kind:'partIntro',part:p,pi});
    p.items.forEach((it,ii)=>steps.push({kind:'item',part:p,pi,ii,text:it[0],en:it[1],mode:p.mode,sec:p.sec}));
  });
  steps.push({kind:'end'});return steps;
}
function mxStage(html){$('#mxStage').innerHTML=html}
function mxClear(){clearInterval(MX.timer);MX.timer=null}
function mxCountdown(sec,onTick,onDone){mxClear();MX.left=sec;onTick(MX.left);MX.timer=setInterval(()=>{MX.left--;onTick(MX.left);if(MX.left<=0){mxClear();onDone()}},1000)}
function mxProgress(){const items=MX.steps.filter(s=>s.kind==='item'),cur=MX.steps.slice(0,MX.i+1).filter(s=>s.kind==='item').length;
  $('#mxBar').style.width=(cur/items.length*100)+'%';$('#mxPos').textContent=`${cur} / ${items.length} answers`}
async function mxStart(){
  const L=drawMock(MX.lvl);MX.L=L;MX.steps=buildSteps(L);MX.i=0;MX.clips=[];MX.id='M'+Date.now();MX.started=Date.now();MX.running=true;
  $('#mxSetup').hidden=true;$('#mxRun').hidden=false;$('#mxReview').hidden=true;
  try{if(navigator.mediaDevices&&window.MediaRecorder)MX.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch(e){MX.stream=null}
  $('#mxMic').textContent=MX.stream?'● Microphone on':'Microphone unavailable: answers will not be recorded';
  $('#mxMic').className=MX.stream?'chip':'chip warn-chip';
  mxStep();
}
function mxStop(){MX.running=false;mxClear();stopAudio();mxRecStop();if(MX.stream){MX.stream.getTracks().forEach(t=>t.stop());MX.stream=null}}
function mxRecStart(step){
  if(!MX.stream)return;MX.chunks=[];
  try{MX.rec=new MediaRecorder(MX.stream)}catch(e){MX.rec=null;return}
  const meta={part:step.part.title,mode:step.mode,text:step.text,en:step.en,start:Date.now()};
  MX.rec.ondataavailable=e=>{if(e.data.size)MX.chunks.push(e.data)};
  MX.rec.onstop=()=>{const blob=new Blob(MX.chunks,{type:MX.rec&&MX.rec.mimeType||'audio/webm'});meta.dur=Math.round((Date.now()-meta.start)/1000);meta.blob=blob;MX.clips.push(meta)};
  MX.rec.start();
}
function mxRecStop(){return new Promise(res=>{if(MX.rec&&MX.rec.state==='recording'){const r=MX.rec;const prev=r.onstop;r.onstop=e=>{prev&&prev(e);res()};r.stop()}else res()})}
async function mxNext(){mxClear();stopAudio();await mxRecStop();MX.i++;if(MX.running)mxStep()}
function mxStep(){
  if(!MX.running)return;const s=MX.steps[MX.i];mxProgress();
  if(s.kind==='prep'){
    mxStage(`<div class="eyebrow">Preparation time</div><h3>Prepare the next parts</h3>
      <p class="note">In the real test you get this time to read the questions below and plan your answers. You may take notes.</p>
      <ul class="prep-list">${s.parts.flatMap(p=>p.mode==='repeat'||p.mode==='answer'||p.mode==='retell'?[]:p.items.map(it=>`<li><span class="han">${esc(it[0])}</span> <span class="note">${esc(it[1])}</span></li>`)).join('')}</ul>
      <div class="toolbar"><span class="timer" id="mxT"></span><button class="btn" type="button" id="mxGo">I’m ready, start</button></div>`);
    $('#mxGo').onclick=mxNext;mxCountdown(s.sec,t=>{const e=$('#mxT');if(e){e.textContent=mmss(t);e.classList.toggle('low',t<=30)}},mxNext);return}
  if(s.kind==='partIntro'){
    mxStage(`<div class="eyebrow">${esc(MOCK[MX.lvl].name)}</div><h3>${esc(s.part.title)}</h3><p>${esc(s.part.how)}</p>
      <p class="note">${s.part.items.length} item${s.part.items.length>1?'s':''} · up to ${mmss(s.part.sec)} per answer. Recording starts automatically.</p>
      <div class="toolbar"><span class="timer" id="mxT"></span><button class="btn" type="button" id="mxGo">Start now</button></div>`);
    $('#mxGo').onclick=mxNext;mxCountdown(5,t=>{const e=$('#mxT');if(e)e.textContent=mmss(t)},mxNext);return}
  if(s.kind==='end'){mxFinish();return}
  // item
  const audio=s.mode==='repeat'||s.mode==='answer'||s.mode==='retell';
  const label={repeat:'Listen, then repeat',answer:'Listen, then answer',retell:'Listen, then retell',talk:'Answer the question',picture:'Describe the picture',read:'Read aloud'}[s.mode];
  mxStage(`<div class="eyebrow">${esc(s.part.title)} · ${s.ii+1} of ${s.part.items.length}</div><h3>${label}</h3>
    ${audio?'<p class="mx-listen" id="mxPrompt">🔊 Listen carefully…</p>':`<p class="prompt${s.mode==='read'?' readtext':''}">${esc(s.text)}</p>${s.mode==='picture'?`<p class="note">${esc(s.en)}</p>`:''}`}
    <div class="toolbar"><span class="phase" id="mxPh">${audio?'listening':'get ready'}</span><span class="timer" id="mxT"></span><button class="btn ghost" type="button" id="mxGo" disabled>Finish answer</button></div>`);
  const go=$('#mxGo');go.onclick=mxNext;
  const beginAnswer=()=>{if(!MX.running||MX.steps[MX.i]!==s)return;$('#mxPh').textContent=MX.stream?'● recording':'speak now';$('#mxPh').classList.add('rec-on');go.disabled=false;
    if(audio&&$('#mxPrompt'))$('#mxPrompt').textContent='Speak now.';
    mxRecStart(s);mxCountdown(s.sec,t=>{const e=$('#mxT');if(e){e.textContent=mmss(t);e.classList.toggle('low',t<=10)}},mxNext)};
  if(audio){const rate=s.mode==='retell'?0.88:MX.lvl===0?0.75:0.82;sayLines([['W',s.text]],rate).then(ok=>{if(ok)setTimeout(beginAnswer,300)})}
  else{const prep=s.mode==='read'?3:3;mxCountdown(prep,t=>{const e=$('#mxT');if(e)e.textContent='starts in '+t},beginAnswer)}
}
async function mxFinish(){
  MX.running=false;mxClear();stopAudio();await mxRecStop();
  if(MX.stream){MX.stream.getTracks().forEach(t=>t.stop());MX.stream=null}
  const L=MOCK[MX.lvl],total=Math.round((Date.now()-MX.started)/1000);
  const summary={id:MX.id,date:Date.now(),level:L.name,answers:MX.clips.length,items:MX.clips.map(c=>({part:c.part,mode:c.mode,text:c.text,en:c.en,dur:c.dur})),totalSec:total,recorded:MX.clips.some(c=>c.blob&&c.blob.size)};
  H.addMock(summary);
  try{for(let i=0;i<MX.clips.length;i++)if(MX.clips[i].blob&&MX.clips[i].blob.size)await idbPut(`${MX.id}:${i}`,MX.clips[i].blob);await idbPrune()}catch(e){}
  $('#mxRun').hidden=true;showReview(summary,MX.clips.map(c=>c.blob));renderHistory();
}
function showReview(sum,blobs){
  const r=$('#mxReview');r.hidden=false;
  const urls=(blobs||[]).map(b=>b&&b.size?URL.createObjectURL(b):null);
  r.innerHTML=`<div class="eyebrow">Mock test review</div><h3>HSKK ${esc(sum.level)} · ${new Date(sum.date).toLocaleString()}</h3>
    <p class="note">${sum.items.length} answers · ${mmss(sum.totalSec)} in total. Listen to each answer and compare it with the prompt. For tone feedback on single words, use pronunciation practice in Vocabulary.</p>
    <ol class="rv">${sum.items.map((it,i)=>`<li><div class="note">${esc(it.part)}</div><div class="han rv-text">${esc(it.text)}</div><div class="note">${esc(it.en)}</div>
      <div class="toolbar">${urls[i]?`<audio controls preload="none" src="${urls[i]}"></audio>`:'<span class="note">No recording</span>'}<button class="btn ghost small" type="button" data-say="${esc(it.text)}">▶ Model</button></div></li>`).join('')}</ol>
    <div class="toolbar"><button class="btn" type="button" id="mxAgain">Take another mock test</button></div>`;
  r.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>sayLines([['W',b.dataset.say]],0.85));
  $('#mxAgain').onclick=()=>{r.hidden=true;$('#mxSetup').hidden=false;$('#mock').scrollIntoView({behavior:'smooth'})};
  r.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderHistory(){
  const h=H.data.mock;const el=$('#mxHist');if(!el)return;
  el.innerHTML=h.length?h.map(m=>`<li><span><b>HSKK ${esc(m.level)}</b> · ${new Date(m.date).toLocaleDateString()} ${new Date(m.date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><span class="note">${m.answers} answers · ${mmss(m.totalSec)}${m.recorded?'':' · no audio'}</span><button class="btn ghost small" type="button" data-rv="${m.id}">Review</button></li>`).join(''):'<li class="note">Finished mock tests appear here, with your recordings saved in this browser.</li>';
}
async function reviewPast(id){const m=H.data.mock.find(x=>x.id===id);if(!m)return;const blobs=[];
  for(let i=0;i<m.items.length;i++){try{blobs.push(await idbGet(`${id}:${i}`))}catch(e){blobs.push(null)}}
  $('#mxSetup').hidden=true;$('#mxRun').hidden=true;showReview(m,blobs)}
function initMock(){
  seg($('#mxSeg'),MOCK.map(m=>'HSKK '+m.name),i=>{MX.lvl=i;mxInfo()},1);
  function mxInfo(){const L=MOCK[MX.lvl];const c=MOCK_COUNTS[L.name];const n=c.reduce((a,b)=>a+b,0);const pool=(window.HSK_BANKS?HSK_BANKS.speaking:[]).filter(x=>x.lvl===L.name).length;
    $('#mxInfo').innerHTML=`<b>${esc(L.for)}</b> · ${n} answers · ${mmss(L.prep)} preparation time · drawn from ${pool} prompts<br>${L.parts.map((p,i)=>`${esc(p.title)} <span class="note">(${c[i]} × up to ${mmss(p.sec)})</span>`).join('<br>')}`}
  mxInfo();
  $('#mxStart').onclick=mxStart;
  $('#mxQuit').onclick=()=>{mxStop();$('#mxRun').hidden=true;$('#mxSetup').hidden=false};
  $('#mxHist').addEventListener('click',e=>{const b=e.target.closest('[data-rv]');if(b)reviewPast(b.dataset.rv)});
  renderHistory();
}

/* IndexedDB for mock recordings (kept in this browser only) */
function idb(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no idb'));const r=indexedDB.open('hskStudio',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbTx(mode,fn){const db=await idb();return new Promise((res,rej)=>{const tx=db.transaction('audio',mode);const st=tx.objectStore('audio');const out=fn(st);tx.oncomplete=()=>res(out&&out.result);tx.onerror=()=>rej(tx.error)})}
const idbPut=(k,v)=>idbTx('readwrite',st=>st.put(v,k));
const idbGet=k=>idbTx('readonly',st=>st.get(k));
const idbClear=()=>idbTx('readwrite',st=>st.clear());
async function idbPrune(){const keep=new Set(H.data.mock.map(m=>m.id));const db=await idb();
  await new Promise(res=>{const tx=db.transaction('audio','readwrite');const st=tx.objectStore('audio');const rq=st.openKeyCursor();
    rq.onsuccess=()=>{const c=rq.result;if(!c)return;if(!keep.has(String(c.key).split(':')[0]))st.delete(c.key);c.continue()};tx.oncomplete=res;tx.onerror=res})}


/* ================= HSKK TASK DRILLS (bank) ================= */
const SP_MODES={Beginner:[['repeat','Listen & repeat'],['answer','Listen & answer'],['talk','Answer questions']],
  Intermediate:[['repeat','Listen & repeat'],['picture','Describe a picture'],['talk','Answer questions']],
  Advanced:[['retell','Listen & retell'],['read','Read aloud'],['talk','Answer questions']]};
const SP_SEC={repeat:0,answer:15,picture:120,read:120,retell:120,talk:{Beginner:90,Intermediate:120,Advanced:150}};
const SP={lvl:'Beginner',mode:'repeat',decks:{},shown:false,tid:null,left:0};
function spDeck(){const k=SP.lvl+'/'+SP.mode;return SP.decks[k]||(SP.decks[k]=Deck('speak-'+k,(window.HSK_BANKS?HSK_BANKS.speaking:[]).filter(x=>x.lvl===SP.lvl&&x.mode===SP.mode)))}
function spSecs(){const v=SP_SEC[SP.mode];return typeof v==='object'?v[SP.lvl]:v}
function spStopTimer(){clearInterval(SP.tid);SP.tid=null}
function spRender(){
  spStopTimer();stopAudio();const dk=spDeck(),it=dk.cur();if(!it)return;
  const audio=['repeat','answer','retell'].includes(SP.mode);SP.shown=!audio;
  $('#spPos').textContent=dk.label();
  $('#spHead').textContent=`HSKK ${SP.lvl} · ${SP_MODES[SP.lvl].find(m=>m[0]===SP.mode)[1]}`;
  const t=$('#spText');t.textContent=it.text;t.classList.toggle('masked',audio);t.classList.toggle('readtext',SP.mode==='read'||SP.mode==='retell');
  $('#spEn').textContent=it.en;$('#spEn').hidden=audio;
  $('#spShow').hidden=!audio;$('#spShow').textContent='Show text';
  $('#spPlay').textContent=audio?'▶ Play prompt':SP.mode==='read'?'▶ Hear a model reading':'▶ Hear the question';
  const secs=spSecs();$('#spTimerRow').hidden=!secs;$('#spTime').hidden=!secs;
  if(secs){$('#spTimer').textContent=mmss(secs);$('#spTimer').classList.remove('low');$('#spPhase').textContent='ready';$('#spTime').textContent='Start speaking'}
  $('#spRec').hidden=!(SP.mode==='repeat'||SP.mode==='read'||SP.mode==='retell');
}
function initSpeaking(){
  const lv=Object.keys(SP_MODES);
  const modeSeg=()=>{const el=$('#spMode');const ms=SP_MODES[SP.lvl];const fresh=el.cloneNode(false);el.replaceWith(fresh);seg(fresh,ms.map(m=>m[1]),i=>{SP.mode=ms[i][0];spRender()},0);SP.mode=ms[0][0]};
  seg($('#spLvl'),lv.map(x=>'HSKK '+x),i=>{SP.lvl=lv[i];modeSeg();spRender()},0);
  modeSeg();
  $('#spPlay').onclick=()=>{const it=spDeck().cur();sayLines([['W',it.text]],SP.mode==='retell'?0.88:0.82)};
  $('#spShow').onclick=()=>{SP.shown=!SP.shown;$('#spText').classList.toggle('masked',!SP.shown);$('#spEn').hidden=!SP.shown;$('#spShow').textContent=SP.shown?'Hide text':'Show text'};
  $('#spRec').onclick=()=>{const it=spDeck().cur();openPractice(it.text,'',it.en)};
  $('#spTime').onclick=()=>{
    if(SP.tid){spStopTimer();$('#spTime').textContent='Resume';$('#spPhase').textContent='paused';return}
    if(!SP.left||SP.left<=0)SP.left=spSecs();$('#spTime').textContent='Pause';$('#spPhase').textContent='speaking';
    SP.tid=setInterval(()=>{SP.left--;$('#spTimer').textContent=mmss(Math.max(SP.left,0));$('#spTimer').classList.toggle('low',SP.left<=15);
      if(SP.left<=0){spStopTimer();SP.left=0;$('#spPhase').textContent='time is up';$('#spTime').textContent='Start again'}},1000)};
  $('#spPrev').onclick=()=>{spDeck().prev();SP.left=0;spRender()};
  $('#spNext').onclick=()=>{spDeck().next();SP.left=0;spRender()};
  $('#spShuf').onclick=()=>{spDeck().shuffle();SP.left=0;spRender()};
  spRender();
}

/* ================= PRONUNCIATION DRILL (bank from the word list) ================= */
const PR={mode:0,decks:null,item:null,target:null,answered:false,opts:null};
function prDecks(){if(PR.decks||!VOCAB||!window.HSK_BANKS)return PR.decks;const P=HSK_BANKS.buildPron(VOCAB);PR.decks=[Deck('pron-pairs',P.pairs),Deck('pron-tones',P.sandhi)];return PR.decks}
function prRender(){
  PR.answered=false;$('#prReveal').innerHTML='';$('#prRec').hidden=true;
  const D=prDecks();if(!D){$('#prAsk').textContent='Loading words…';return}
  const dk=D[PR.mode],it=dk.cur();PR.item=it;$('#prPos').textContent=dk.label();
  if(PR.mode===0){
    PR.target=Math.random()<0.5?'a':'b';
    $('#prHead').textContent=it.label.split(':')[0];
    $('#prAsk').textContent='Play, then choose the word you heard.';
    $('#prChoices').innerHTML=['a','b'].map(k=>`<button class="choice" type="button" data-k="${k}"><span class="han">${esc(it[k][0])}</span><span class="pyl">${colorPinyin(esc(it[k][1]))}</span></button>`).join('');
  }else{
    $('#prHead').textContent=it.kind==='neutral'?'Neutral tone':'Tone change';
    $('#prAsk').innerHTML=`How is <span class="han" style="font-size:1.3rem">${esc(it.h)}</span> <span class="note">(${esc(it.en)})</span> actually said? Choose, then play to check.`;
    const syl=it.spoken.split(' ');const opts=new Set([it.spoken]);
    if(it.kind==='sandhi')opts.add(it.py);
    let g=0;while(opts.size<3&&g++<40){const k=it.kind==='neutral'?it.dict.findIndex(t=>t===0):Math.floor(Math.random()*syl.length);const t=1+Math.floor(Math.random()*4);if(k<0)break;opts.add(syl.map((s2,i)=>i===k?retone(s2,t):s2).join(' '))}
    PR.opts=shuffle([...opts]);
    $('#prChoices').innerHTML=PR.opts.map((o,i)=>`<button class="choice" type="button" data-o="${i}"><span class="py-choice">${colorPinyin(esc(o))}</span></button>`).join('');
  }
}
function prPlay(){const it=PR.item;if(!it)return;if(PR.mode===0)say(it[PR.target][0],{rate:0.6});else say(it.h,{rate:0.7})}
function initPron(){
  seg($('#prMode'),['Similar sounds','Tone changes'],i=>{PR.mode=i;prRender()},0);
  $('#prPlay').onclick=prPlay;
  $('#prNext').onclick=()=>{const D=prDecks();if(D)D[PR.mode].next();prRender();if(PR.mode===0)prPlay()};
  $('#prShuf').onclick=()=>{const D=prDecks();if(D)D[PR.mode].shuffle();prRender()};
  $('#prRec').onclick=()=>{const it=PR.item;if(!it)return;if(PR.mode===0){const w=it[PR.target];openPractice(w[0],w[1],w[2])}else openPractice(it.h,it.py,it.en)};
  $('#prChoices').addEventListener('click',e=>{const b=e.target.closest('.choice');if(!b||!PR.item)return;const it=PR.item;
    if(PR.answered){if(PR.mode===0)say(it[b.dataset.k][0],{rate:0.6});return}   // after answering, tap either word to compare
    PR.answered=true;
    if(PR.mode===0){const ok=b.dataset.k===PR.target;b.classList.add(ok?'right':'wrong');if(!ok)$(`#prChoices .choice[data-k="${PR.target}"]`).classList.add('right');
      const w=it[PR.target],o=it[PR.target==='a'?'b':'a'];
      $('#prReveal').innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> You heard <span class="han">${esc(w[0])}</span> ${colorPinyin(esc(w[1]))} <span class="note">${esc(w[2])}</span>, not <span class="han">${esc(o[0])}</span> ${colorPinyin(esc(o[1]))}. <span class="note">${esc(it.label.split(':').slice(1).join(':').trim()||'')} Tap each word to compare.</span>`;
    }else{const o=PR.opts[+b.dataset.o],ok=o===it.spoken;b.classList.add(ok?'right':'wrong');
      if(!ok)$('#prChoices').querySelectorAll('.choice').forEach(x=>{if(PR.opts[+x.dataset.o]===it.spoken)x.classList.add('right')});
      $('#prReveal').innerHTML=`<span class="verdict ${ok?'good':'bad'}">${ok?'Correct':'Not quite'}</span> <span class="han">${esc(it.h)}</span> is said ${colorPinyin(esc(it.spoken))}${it.spoken!==it.py?` <span class="note">(written ${esc(it.py)})</span>`:''}. ${esc(it.rule)}`;
      say(it.h,{rate:0.7})}
    $('#prRec').hidden=false;
  });
  prRender();
}

/* ---------- boot ---------- */
function boot(){
  initTones();initListening();initSpeaking();initPron();initVocabMarks();initProgress();initMock();
  // the word list loads asynchronously: refresh things that depend on it
  const wait=setInterval(()=>{if(VOCAB){clearInterval(wait);renderProgress();markCards();ttNew();prRender()}},300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.HSK_FEATURES={openListening,LISTEN,MOCK,MOCK_COUNTS,SINGLE_FALLBACK};
})();
