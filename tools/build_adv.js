// Builds public/adv.js from the hand-written files in tools/adv/. Checks every item and stops on errors.
// Run: node tools/build_adv.js
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'adv');
const rd=f=>fs.readFileSync(path.join(D,f),'utf8').split('\n').map(l=>l.replace(/\r$/,'')).filter(l=>l.trim()&&!l.startsWith('#'));
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const R=rng(20261107);const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const errs=[];
// show the whole sentence that contains a clue, not a fragment
const sentOf=(text,clue)=>{const ss=(text.match(/[^。！？]+[。！？”]*/g)||[text]);return (ss.find(x=>x.includes(clue))||clue).trim()};const fail=(where,msg)=>errs.push(`${where}: ${msg}`);
const GAP=/\[([^\]]+)\]/g;
const strip=t=>t.replace(GAP,(_,g)=>g.split('/')[0]);
const sentences=t=>(t.match(/[^。！？]+[。！？”]*/g)||[t]).map(s=>s.trim()).filter(Boolean);
function choice(where,ok,no,clue,text){
  if(no.length!==3)fail(where,'needs 3 false statements');
  if(new Set([ok,...no]).size!==4)fail(where,'statements repeat');
  if(!text.includes(clue))fail(where,`clue not in text: ${clue}`);
  const opts=shuf([ok,...no]);return {opts,ans:opts.indexOf(ok)}}

/* reading passages (HSK 5–6) */
const reading=[];
['reading1.txt','reading2.txt','reading3.txt'].forEach(f=>rd(f).forEach((l,i)=>{const where=`${f}:${i+1}`;const p=l.split('|').map(s=>s.trim());
  if(p.length!==6){fail(where,`expected 6 fields, got ${p.length}`);return}
  const [raw,ok,n1,n2,n3,clue]=p;const plain=strip(raw);
  const gaps=[...raw.matchAll(GAP)].map(m=>m[1].split('/'));
  if(gaps.length<2)fail(where,'needs at least 2 gaps');
  gaps.forEach(g=>{if(g.length!==4||new Set(g).size!==4)fail(where,`gap needs 4 different options: ${g.join('/')}`)});
  const c=choice(where,ok,[n1,n2,n3],clue,plain);
  // passage cloze: number the gaps
  let k=0;const shown=raw.replace(GAP,()=>`（${++k}）`);
  const gq=gaps.map(g=>{const o=shuf(g);return {opts:o,ans:o.indexOf(g[0])}});
  reading.push({t:plain,cloze:shown,gaps:gq,gist:{opts:c.opts,ans:c.ans,clue:sentOf(plain,clue)},n:sentences(plain).length})}));

/* sentence insertion (选句填空) built from the reading passages */
// units are clauses (split after ，；。！？), like the real HSK 6 part 3, where most gaps are clauses
const units=t=>{const out=[];const re=/[^，；。！？]+[，；。！？”]*/g;let m;while((m=re.exec(t)))out.push(m[0]);return out};
const body=u=>u.replace(/[，；。！？”]+$/,'');
const bal=u=>(u.match(/“/g)||[]).length===(u.match(/”/g)||[]).length;
reading.forEach((p,i)=>{const us=units(p.t);
  const inQuote=j=>{let open=0;for(let k=0;k<j;k++){open+=(us[k].match(/“/g)||[]).length-(us[k].match(/”/g)||[]).length}return open>0};
  // a gap must be a whole clause of 6–24 characters that does not open the passage and is not inside quoted speech
  const cand=us.map((u,j)=>j).filter(j=>{const b=body(us[j]);const L=[...b].length;return j>0&&L>=6&&L<=30&&bal(us[j])&&!/：/.test(us[j])&&!inQuote(j)});
  const nBlank=Math.min(3,cand.length);if(nBlank<2)return;
  const step=cand.length/nBlank;const pick=[];for(let b=0;b<nBlank;b++)pick.push(cand[Math.min(cand.length-1,Math.floor(b*step+R()*step))]);
  let blanks=[...new Set(pick)].sort((a,b)=>a-b);const spread=blanks.filter((j,k,a)=>k===0||j-a[k-1]>1);if(spread.length>=2)blanks=spread;
  if(blanks.length<2)blanks=[...new Set([cand[0],cand[cand.length-1]])];if(blanks.length<2)return;
  const other=reading[(i+37)%reading.length];const os=units(other.t).map(body).filter(b=>{const L=[...b].length;return L>=6&&L<=30&&bal(b)&&!/：/.test(b)});
  const extra=os[Math.floor(R()*os.length)];
  const opts=shuf([...blanks.map(j=>body(us[j])),extra]);if(new Set(opts).size!==opts.length)return;
  let k=0;const shown=us.map((u,j)=>blanks.includes(j)?`（${++k}）`+u.slice(body(u).length):u).join('');
  p.insert={text:shown,opts,ans:blanks.map(j=>opts.indexOf(body(us[j])))}});

/* listening passages (HSK 6 part 1) */
const listen=[];
['listen1.txt','listen2.txt'].forEach(f=>rd(f).forEach((l,i)=>{const where=`${f}:${i+1}`;const p=l.split('|').map(s=>s.trim());
  if(p.length!==6){fail(where,`expected 6 fields, got ${p.length}`);return}
  const [t,ok,n1,n2,n3,clue]=p;const c=choice(where,ok,[n1,n2,n3],clue,t);listen.push({t,opts:c.opts,ans:c.ans,clue:sentOf(t,clue)})}));

/* interviews (HSK 6 part 2) */
const interviews=[];let cur=null;
rd('interviews.txt').forEach((l,i)=>{const where=`interviews.txt:${i+1}`;
  if(l.startsWith('===')){const [zh,en]=l.slice(3).split('|').map(s=>s.trim());cur={title:zh,en,lines:[],qs:[]};interviews.push(cur);return}
  if(/^[WM]: /.test(l)){cur.lines.push([l[0],l.slice(3).trim()]);return}
  if(l.startsWith('? ')){const p=l.slice(2).split('|').map(s=>s.trim());if(p.length!==7){fail(where,`question needs 7 fields, got ${p.length}`);return}
    const [q,a,b,c,d,ans,clue]=p;const opts=[a,b,c,d];if(new Set(opts).size!==4)fail(where,'options repeat');
    const full=cur.lines.map(x=>x[1]).join('');if(!full.includes(clue))fail(where,`clue not in interview: ${clue}`);
    const right=opts[+ans];const o=shuf(opts);const line=cur.lines.find(x=>x[1].includes(clue));cur.qs.push({q,opts:o,ans:o.indexOf(right),clue:line?sentOf(line[1],clue):clue});return}
  fail(where,'unrecognised line')});
interviews.forEach(v=>{if(v.qs.length!==5)fail(v.title,`has ${v.qs.length} questions`)});

/* faulty sentences (病句) */
const bjRows=rd('bingju.txt').map(l=>l.split('|').map(s=>s.trim()));
const goodPool=[...new Set([...bjRows.map(r=>r[1]),...bjRows.filter(r=>r[2].startsWith('(')).map(r=>r[0])])];
const bingju=[];
bjRows.forEach((r,i)=>{if(r.length!==3){fail(`bingju.txt:${i+1}`,'expected 3 fields');return}if(r[2].startsWith('('))return;
  if(r[0]===r[1])fail(`bingju.txt:${i+1}`,'faulty and corrected sentences are the same');
  const others=shuf(goodPool.filter(s=>s!==r[1]&&s!==r[0])).slice(0,3);const opts=shuf([r[0],...others]);
  bingju.push({opts,ans:opts.indexOf(r[0]),good:r[1],why:r[2]})});

/* summaries (缩写) */
const suoxie=[];let sx=null,part='story';
rd('suoxie.txt').forEach(l=>{if(l.startsWith('===')){const [zh,en]=l.slice(3).split('|').map(s=>s.trim());sx={title:zh,en,story:[],model:''};suoxie.push(sx);part='story';return}
  if(l.trim()==='---'){part='model';return}if(part==='story')sx.story.push(l.trim());else sx.model+=l.trim()});
suoxie.forEach(s=>{const n=[...s.story.join('')].length,m=[...s.model].length;s.len=n;s.aim=Math.round(m/10)*10;if(n<350)fail(s.title,`story only ${n} characters`);if(m<120||m>n*0.6)fail(s.title,`model summary is ${m} characters`)});

/* true / false (HSK 3–4) */
const judge=rd('judge.txt').map((l,i)=>{const p=l.split('|').map(s=>s.trim());if(p.length!==5)fail(`judge.txt:${i+1}`,'expected 5 fields');
  const [lvl,t,claim,tf,why]=p;if(!/^[TF]$/.test(tf))fail(`judge.txt:${i+1}`,'truth must be T or F');if(sentences(t).length!==3)fail(`judge.txt:${i+1}`,`text should have 3 sentences, has ${sentences(t).length}`);
  return {lvl:+lvl,t,claim,truth:tf==='T',why}});

/* HSKK prompts */
const speaking=rd('speaking.txt').map((l,i)=>{const p=l.split('|').map(s=>s.trim());if(p.length!==4)fail(`speaking.txt:${i+1}`,'expected 4 fields');return {lvl:p[0],mode:p[1],text:p[2],en:p[3]}});

if(errs.length){console.error(errs.join('\n'));console.error(`\n${errs.length} problem(s); public/adv.js not written.`);process.exit(1)}
const out={reading,listen,interviews,bingju,suoxie,judge,speaking};
fs.writeFileSync(path.join(__dirname,'..','public','adv.js'),'/* Generated by tools/build_adv.js from tools/adv/*.txt. Edit those files, not this one. */\nwindow.HSK_ADV='+JSON.stringify(out)+';\n');
const tf={T:judge.filter(j=>j.truth).length,F:judge.filter(j=>!j.truth).length};
console.log(`reading ${reading.length} (insert ${reading.filter(r=>r.insert).length}, gaps ${reading.reduce((a,r)=>a+r.gaps.length,0)}), listening ${listen.length}, interviews ${interviews.length} (${interviews.reduce((a,v)=>a+v.qs.length,0)} questions), 病句 ${bingju.length}, 缩写 ${suoxie.length}, true/false ${judge.length} ${JSON.stringify(tf)}, HSKK prompts ${speaking.length}`);
