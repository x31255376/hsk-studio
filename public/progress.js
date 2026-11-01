/* Progress store: everything lives in this browser's localStorage. No account, nothing uploaded. */
(function(){
  const KEY='hskStudio.progress.v1';
  const blank=()=>({known:{},review:{},tone:{right:0,total:0,conf:{}},listen:{byLevel:{},wrong:{}},pron:{attempts:0,syl:0,sylRight:0},
    secs:0,days:{},mock:[]});
  let P=blank();
  try{const raw=localStorage.getItem(KEY);if(raw){const v=JSON.parse(raw);P=Object.assign(blank(),v);
    P.tone=Object.assign(blank().tone,v.tone||{});P.listen=Object.assign(blank().listen,v.listen||{});P.pron=Object.assign(blank().pron,v.pron||{})}}catch(e){}
  let saveT=null;
  function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}},150);emit()}
  const subs=[];function emit(){subs.forEach(f=>{try{f(P)}catch(e){}})}
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

  /* practice time: counts while the page is visible and the learner touched it in the last 90 s */
  let lastAct=Date.now();
  ['pointerdown','keydown','scroll','touchstart'].forEach(ev=>addEventListener(ev,()=>{lastAct=Date.now()},{passive:true}));
  let pend=0;
  setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-lastAct<90000){pend+=5;if(pend>=15){P.secs+=pend;const d=today();P.days[d]=(P.days[d]||0)+pend;pend=0;save()}}},5000);

  window.HSKP={
    get data(){return P},
    onChange(f){subs.push(f)},
    isKnown:h=>!!P.known[h],isReview:h=>!!P.review[h],
    setKnown(h,lvl,on){if(on){P.known[h]=lvl||1;delete P.review[h]}else delete P.known[h];save()},
    setReview(h,lvl,on){if(on)P.review[h]=lvl||1;else delete P.review[h];save()},
    recordTone(want,got){P.tone.total++;if(want===got)P.tone.right++;else{const k=`${want}>${got}`;P.tone.conf[k]=(P.tone.conf[k]||0)+1}save()},
    recordListening(id,lvl,ok){const b=P.listen.byLevel[lvl]||(P.listen.byLevel[lvl]={right:0,total:0});b.total++;if(ok){b.right++;delete P.listen.wrong[id]}else P.listen.wrong[id]=Date.now();save()},
    recordPron(rows){P.pron.attempts++;rows.forEach(r=>{if(!r.want)return;P.pron.syl++;if(r.ok)P.pron.sylRight++;else{const k=`${r.want}>${r.got||0}`;P.tone.conf['say:'+k]=(P.tone.conf['say:'+k]||0)+1}});save()},
    addMock(m){P.mock.unshift(m);P.mock=P.mock.slice(0,10);save()},
    removeMock(id){P.mock=P.mock.filter(m=>m.id!==id);save()},
    streak(){
      // consecutive days with at least one minute of practice, ending today (or yesterday if today has not started yet)
      const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const d=new Date();if((P.days[key(d)]||0)<60)d.setDate(d.getDate()-1);
      let n=0;while((P.days[key(d)]||0)>=60){n++;d.setDate(d.getDate()-1)}return n},
    today,
    reset(){P=blank();try{localStorage.removeItem(KEY)}catch(e){}emit()}
  };
})();
