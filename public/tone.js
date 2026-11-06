/* On-device tone analysis: pitch tracking + tone classification. Shared by the page and tools/tone_check.js.
   Needs a global toneOf(pinyinSyllable). */
const TONE_SR=16000;
function trackPitch(pcm,sr=TONE_SR){
  // returns frames [{t, f0|0, rms}] every 10 ms, using a normalized-autocorrelation (YIN-style) pitch estimate
  const win=Math.round(sr*0.04),hop=Math.round(sr*0.01),minLag=Math.floor(sr/620),maxLag=Math.ceil(sr/65);
  const frames=[];let peak=0;
  for(let s=0;s+win+maxLag<pcm.length;s+=hop){let e=0;for(let i=0;i<win;i++)e+=pcm[s+i]*pcm[s+i];const rms=Math.sqrt(e/win);frames.push({t:s/sr,s,rms,f0:0});if(rms>peak)peak=rms}
  const gate=Math.max(peak*0.12,0.004);
  const d=new Float32Array(maxLag+1);
  for(const fr of frames){
    if(fr.rms<gate)continue;
    // difference function and cumulative mean normalisation
    d[0]=1;let run=0;
    for(let lag=1;lag<=maxLag;lag++){let sum=0;for(let i=0;i<win;i++){const x=pcm[fr.s+i]-pcm[fr.s+i+lag];sum+=x*x}run+=sum;d[lag]=run?sum*lag/run:1}
    let best=-1,gmin=Infinity,gi=-1;
    for(let lag=minLag;lag<=maxLag;lag++){if(d[lag]<gmin){gmin=d[lag];gi=lag}if(d[lag]<0.18){while(lag+1<=maxLag&&d[lag+1]<d[lag])lag++;best=lag;break}}
    if(best<0&&gmin<0.4&&fr.rms>gate*1.5)best=gi;   // no dip under the strict threshold: fall back to the deepest one (standard YIN step)
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
function contourFeatures(c){
  // c: one syllable's pitch curve (any scale). Trim the unstable edges, then describe its shape.
  const n=c.length;const cut=Math.max(1,Math.floor(n*0.08));const x=c.slice(cut,n-cut>cut+2?n-cut:n);
  const m=x.length,q=Math.max(1,Math.floor(m/4));
  const start=medianOf(x.slice(0,q)),end=medianOf(x.slice(m-q));
  let minV=Infinity,minI=0,maxV=-Infinity;x.forEach((v,i)=>{if(v<minV){minV=v;minI=i}if(v>maxV)maxV=v});
  // a 4th tone often holds high and drops only in its last frames: look at the untrimmed tail too
  // ignore the last two frames and any sudden collapse there: voices often go creaky as they stop, which fools pitch tracking
  const tail=c.slice(Math.floor(n*0.7),Math.max(Math.floor(n*0.7)+1,n-2)).filter(v=>v>start-TAIL_JUMP);const tailMin=tail.length?Math.min(...tail):end;
  const preMax=Math.max(...x.slice(0,minI+1));   // highest point before the low point: how far the voice fell first
  return {start,end,minV,maxV,minPos:minI/(m-1||1),delta:end-start,dip:Math.min(start,end)-minV,fall:preMax-minV,rise:end-minV,tailMin,mean:x.reduce((a,b)=>a+b,0)/m,curve:x};
}
let FALL_K=0.8,RISE_K=1.2,FALL_S=1.5,RISE_S=2.5,FALL4=0.45,TAIL_JUMP=2.5;
function classifyTone(chao,semi,known){
  // chao: curve on the speaker's 1–5 scale (may run past 5); semi: the same curve in semitones; known: is the speaker's range reliable?
  if(chao.length<4)return {tone:0};
  const f=contourFeatures(chao),s=contourFeatures(semi);let tone;
  if(known){
    // tuned on recorded native speech: 1st ≈ 55, 2nd ≈ 2→3 (may sag first), 3rd ≈ low, dipping, little rise unless word-final, 4th ≈ 5→2
    if(f.start>=3.4){
      if(f.delta<=-FALL4||f.tailMin<=f.start-1.2)tone=4;
      else tone=(f.delta>=0.8&&f.minPos<0.35)?2:1;
    }
    else if(f.minPos>=0.3&&f.fall>=FALL_K&&f.rise>=RISE_K)tone=3;   // full dipping-rising 214: falls first, then rises well above its low point
    else if(f.rise>=0.45&&f.end>=1.8)tone=2;                         // ends clearly above its low point: rising
    else if(f.delta<=-1&&f.start>=2.6)tone=4;                        // a 4th tone starting lower after another syllable
    else tone=f.mean>=3.2?1:3;
  }else{
    // range unknown (first recordings): judge by shape alone, in semitones
    if(s.delta<=-3||s.tailMin<=s.start-3.5)tone=4;
    else if(s.minPos>=0.3&&s.fall>=FALL_S&&s.rise>=RISE_S)tone=3;
    else if(s.rise>=1.4&&s.delta>=0.5)tone=2;
    else if(s.dip>=1.2&&s.minPos>=0.3&&s.minPos<=0.8)tone=3;
    else if(s.delta<=-1.8)tone=3;
    else tone=1;
  }
  return {tone,start:f.start,end:f.end,minV:f.minV,mean:f.mean,delta:f.delta,curve:f.curve};
}
function analyseTones(pcm,nSyl,base){
  // base: optional {lo,hi} Hz range learned from this speaker's earlier recordings
  const frames=trackPitch(pcm);const f0=smoothPitch(frames);
  const voiced=f0.filter(Boolean);if(voiced.length<6)return null;
  let lo=pct(voiced,0.05),hi=pct(voiced,0.95);const span=12*Math.log2(hi/lo);
  let known=false;
  if(base&&base.lo&&base.hi){lo=Math.min(lo,base.lo);hi=Math.max(hi,base.hi);known=true}
  else if(nSyl>1&&span>=6)known=true;               // a word with clearly different pitches shows the range by itself
  if(12*Math.log2(hi/lo)<7){const mid=Math.sqrt(lo*hi),half=2**(7/24);lo=mid/half;hi=mid*half}
  const ref=Math.sqrt(lo*hi);
  const toChao=f=>1+4*Math.max(-0.15,Math.min(1.3,Math.log2(f/lo)/Math.log2(hi/lo)));
  const segs=splitSyllables(f0,nSyl,frames);if(segs.length!==nSyl)return null;
  return {lo:pct(voiced,0.05),hi:pct(voiced,0.95),known,syllables:segs.map(([a,b])=>{const ch=[],se=[];for(let i=a;i<=b;i++)if(f0[i]){ch.push(toChao(f0[i]));se.push(12*Math.log2(f0[i]/ref))}return classifyTone(ch,se,known)})};
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
if(typeof module!=='undefined')module.exports={trackPitch,smoothPitch,analyseTones,classifyTone,expectedTones,retone,medianOf,splitSyllables,TONE_SR};
