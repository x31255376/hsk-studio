/* On-device tone analysis: pitch tracking + tone classification. Shared by the page and tools/tone_check.js.
   Needs a global toneOf(pinyinSyllable). */
const TONE_SR=16000;
function trackPitch(pcm,sr=TONE_SR){
  // returns frames [{t, f0|0, rms}] every 10 ms, using a normalized-autocorrelation (YIN-style) pitch estimate
  const win=Math.round(sr*0.04),hop=Math.round(sr*0.01),minLag=Math.floor(sr/420),maxLag=Math.ceil(sr/65);
  const frames=[];let peak=0;
  for(let s=0;s+win+maxLag<pcm.length;s+=hop){let e=0;for(let i=0;i<win;i++)e+=pcm[s+i]*pcm[s+i];const rms=Math.sqrt(e/win);frames.push({t:s/sr,s,rms,f0:0});if(rms>peak)peak=rms}
  const gate=Math.max(peak*0.12,0.004);
  const d=new Float32Array(maxLag+1);
  for(const fr of frames){
    if(fr.rms<gate)continue;
    // difference function and cumulative mean normalisation
    d[0]=1;let run=0;
    for(let lag=1;lag<=maxLag;lag++){let sum=0;for(let i=0;i<win;i++){const x=pcm[fr.s+i]-pcm[fr.s+i+lag];sum+=x*x}run+=sum;d[lag]=run?sum*lag/run:1}
    let best=-1;
    for(let lag=minLag;lag<=maxLag;lag++){if(d[lag]<0.18){while(lag+1<=maxLag&&d[lag+1]<d[lag])lag++;best=lag;break}}
    if(best<0)continue;
    // parabolic interpolation
    const a=d[best-1]??d[best],b=d[best],c=d[best+1]??d[best];const den=a-2*b+c;const shift=den?0.5*(a-c)/den:0;
    fr.f0=sr/(best+shift);
  }
  return frames;
}
function medianOf(a){if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]}
function smoothPitch(frames){
  // remove octave jumps and smooth voiced runs with a 5-frame median
  const f=frames.map(x=>x.f0);const out=f.slice();
  for(let i=0;i<f.length;i++){if(!f[i])continue;const w=[];for(let k=-2;k<=2;k++)if(f[i+k])w.push(f[i+k]);out[i]=medianOf(w)}
  for(let i=1;i<out.length;i++){if(out[i]&&out[i-1]){const r=out[i]/out[i-1];if(r>1.8)out[i]/=2;else if(r<0.55)out[i]*=2}}
  return out;
}
function voicedRuns(f0,minLen=6,maxGap=5){
  const runs=[];let st=-1,last=-1;
  for(let i=0;i<f0.length;i++){if(f0[i]){if(st<0)st=i;else if(i-last>maxGap){runs.push([st,last]);st=i}last=i}}
  if(st>=0)runs.push([st,last]);
  return runs.filter(r=>r[1]-r[0]+1>=minLen);
}
function splitSyllables(f0,n,frames){
  let runs=voicedRuns(f0);
  if(!runs.length)return [];
  if(runs.length===n)return runs;
  // otherwise cut the voiced span at the quietest frames near each even boundary (syllables dip in loudness between them)
  const a=runs[0][0],b=runs[runs.length-1][1],len=(b-a+1)/n,cuts=[];
  for(let k=1;k<n;k++){const c=Math.round(a+k*len),w=Math.max(2,Math.round(len*0.3));let best=c,bv=Infinity;
    for(let i=Math.max(a+2,c-w);i<=Math.min(b-2,c+w);i++){const v=frames?(frames[i].rms*(f0[i]?1:0.5)):0;if(v<bv){bv=v;best=i}}cuts.push(best)}
  const out=[];let s=a;for(const c of cuts){out.push([s,c-1]);s=c+1}out.push([s,b]);
  return out.filter(r=>r[1]>r[0]).length===n?out:[];
}
function pct(a,p){if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.round(p*(s.length-1))))]}
function classifyTone(chao){
  // chao: pitch curve for one syllable on the 1–5 Chao scale (1 = bottom of the speaker's range, 5 = top)
  const n=chao.length;if(n<4)return {tone:0};
  const cut=Math.max(1,Math.floor(n*0.12));const c=chao.slice(cut,n-cut>cut+2?n-cut:n);
  const m=c.length,q=Math.max(1,Math.floor(m/4));
  const start=medianOf(c.slice(0,q)),end=medianOf(c.slice(m-q));
  let minV=Infinity,minI=0,maxV=-Infinity;c.forEach((v,i)=>{if(v<minV){minV=v;minI=i}if(v>maxV)maxV=v});
  const delta=end-start,minPos=minI/(m-1||1),mean=c.reduce((x,y)=>x+y,0)/m,dip=Math.min(start,end)-minV;
  let tone;
  if((dip>0.6&&minPos>0.2&&minPos<0.85&&minV<2.6)||
     (dip>0.25&&minPos>=0.35&&minPos<=0.8&&minV<2.0))tone=3;       // dip then rise: 214 (a 2nd tone may dip slightly, but only early and not to the floor)
  else if(delta<=-1){tone=start>=3.6&&delta<=-1.4?4:3}              // high fall 51 = 4th; low fall 21 = half-3rd
  else if(delta>=0.9){tone=start<=1.8&&minPos>0.25?3:2}             // rise 35 = 2nd; rise from the floor after a low part = 3rd
  else if(mean<2.4)tone=3;                                           // low and level
  else tone=1;                                                       // high level 55
  return {tone,start,end,minV,mean,delta,curve:c};
}
function analyseTones(pcm,nSyl,base){
  // base: optional {lo,hi} Hz range learned from this speaker's earlier recordings
  const frames=trackPitch(pcm);const f0=smoothPitch(frames);
  const voiced=f0.filter(Boolean);if(voiced.length<6)return null;
  let lo=pct(voiced,0.05),hi=pct(voiced,0.95);
  if(base&&base.lo&&base.hi){lo=Math.min(lo,base.lo);hi=Math.max(hi,base.hi)}
  // a single syllable or a narrow utterance tells us little about the range: assume at least ~7 semitones
  const span=12*Math.log2(hi/lo);
  if(span<7){const mid=Math.sqrt(lo*hi),half=2**(7/24);lo=mid/half;hi=mid*half}
  const toChao=f=>1+4*Math.max(0,Math.min(1,Math.log2(f/lo)/Math.log2(hi/lo)));
  const segs=splitSyllables(f0,nSyl,frames);if(segs.length!==nSyl)return null;
  return {lo:pct(voiced,0.05),hi:pct(voiced,0.95),syllables:segs.map(([a,b])=>{const ch=[];for(let i=a;i<=b;i++)if(f0[i])ch.push(toChao(f0[i]));return classifyTone(ch)})};
}

function expectedTones(py,text){
  // dictionary tones -> spoken tones: 3-3 sandhi, 一 and 不 changes; 0 = neutral tone
  const syl=py.trim().split(/\s+/);const chars=[...text];
  if(syl.length!==chars.length)return null;
  const t=syl.map(toneOf);
  for(let i=0;i<t.length-1;i++){
    if(chars[i]==='一'&&t[i]===1&&t[i+1])t[i]=t[i+1]===4?2:4;
    else if(chars[i]==='不'&&t[i]===4&&t[i+1]===4)t[i]=2;
  }
  for(let i=t.length-2;i>=0;i--)if(t[i]===3&&t[i+1]===3)t[i]=2;
  return {syl,tones:t};
}

function retone(syl,t){
  // put tone mark t (0 = none) on the vowel that carries the mark in this syllable
  const marks={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};
  const base=syl.normalize('NFD').replace(/[\u0304\u0301\u030c\u0300]/g,'').normalize('NFC');
  const idx=[...syl].findIndex(ch=>/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(ch));if(idx<0)return syl;
  const chars=[...base],v=chars[idx];if(!t||!marks[v])return chars.join('');
  chars[idx]=marks[v][t-1];return chars.join('');
}
if(typeof module!=='undefined')module.exports={trackPitch,smoothPitch,analyseTones,classifyTone,expectedTones,retone,medianOf,TONE_SR};
