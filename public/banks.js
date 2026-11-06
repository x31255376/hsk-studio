/* Question banks for drilling. Generated items use a fixed seed, so the bank is the same on every device
   (and tools can list every text for audio generation). Exposes window.HSK_BANKS. */
(function(){
/* ---------- helpers ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
let R=rng(20261101);   // reseeded below for later additions, so earlier items never change
const ri=n=>Math.floor(R()*n);
const pk=a=>a[ri(a.length)];
function pickDistinct(pool,n,exclude){const out=[],ex=new Set(exclude||[]);let g=0;while(out.length<n&&g++<500){const x=pk(pool);const k=JSON.stringify(x);if(!ex.has(k)){ex.add(k);out.push(x)}}return out}
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
const D=['零','一','二','三','四','五','六','七','八','九'];
function zh(n){if(n<10)return D[n];if(n<20)return '十'+(n%10?D[n%10]:'');return D[Math.floor(n/10)]+'十'+(n%10?D[n%10]:'')}
const lz=n=>n===2?'两':zh(n);              // 两 before a measure word
const WEEK=['一','二','三','四','五','六','天'],WEEK_EN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// build a question with the correct option at a random position
function Q(q,qEn,correct,distractors,why,extra){
  const opts=shuf([correct,...distractors]);const ans=opts.indexOf(correct);
  return Object.assign({q,qEn,opts:opts.map(o=>o[0]),en:opts.map(o=>o[1]),ans,why},extra||{});
}
function makeBank(target,gens,lvl,seen){
  const out=[];seen=seen||new Set();let g=0;
  while(out.length<target&&g++<target*60){const gen=pk(gens);const it=gen(lvl);if(!it)continue;const k=it.lines.map(l=>l[1]).join('|')+'|'+it.qs[0].q;if(seen.has(k))continue;seen.add(k);it.lvl=lvl;it.gen=true;out.push(it)}
  return out;
}

/* ================= LISTENING GENERATORS ================= */
const ACTS=[['去学校','go to school'],['上班','go to work'],['吃午饭','have lunch'],['起床','get up'],['去医院','go to the hospital'],['回家','go home'],['去机场','go to the airport']];
const HOURS=[6,7,8,9,10,11,2,3,4,5];
const tz=(h,half)=>[`${lz(h)}点${half?'半':''}`,`${h}:${half?'30':'00'}`];
function gTime(lvl){
  const [a,aen]=pk(ACTS);const h=pk(HOURS),half=R()<0.4;const c=tz(h,half);
  if(lvl===1||R()<0.5){
    const ds=pickDistinct(HOURS.filter(x=>x!==h).map(x=>tz(x,half)),lvl>=4?3:2);
    return {type:'Short dialogue',lines:[['W',`你明天几点${a}？`],['M',`我${c[0]}${a}。`]],qs:[Q(`男的明天几点${a}？`,`When does the man ${aen} tomorrow?`,c,ds,`He says 我${c[0]}${a}: at ${c[1]}.`)]};
  }
  // inference: one hour earlier / later than usual
  const earlier=R()<0.5,h2=earlier?h-1:h+1;if(h2<2||h2>11)return null;const c2=tz(h2,half);
  const ds=[c,tz(earlier?h2-1:h2+1,half)].concat(lvl>=4?[tz(earlier?h+1:h-1,half)]:[]).filter(x=>x[0]!==c2[0]);
  return {type:'Short dialogue',lines:[['W',`你平时几点${a}？`],['M',`我平时${c[0]}${a}，明天要${earlier?'早':'晚'}一个小时。`]],
    qs:[Q(`男的明天几点${a}？`,`When will he ${aen} tomorrow?`,c2,ds.slice(0,lvl>=4?3:2),`He usually goes at ${c[1]}; 明天要${earlier?'早':'晚'}一个小时 means one hour ${earlier?'earlier':'later'}: ${c2[1]}.`)]};
}
const GOODS=[['杯子','cup'],['苹果','apple'],['西瓜','watermelon'],['面包','loaf of bread'],['包','bag'],['本子','notebook']];
function gPrice(lvl){
  const [g,gen]=pk(GOODS);
  if(lvl===1){const n=pk([3,5,6,8,9,10,12,15,20,25,30]);const c=[`${lz(n)}块`,`${n} yuan`];
    const ds=pickDistinct([3,5,6,8,9,10,12,15,20,25,30,40].filter(x=>x!==n).map(x=>[`${lz(x)}块`,`${x} yuan`]),2);
    return {type:'Short dialogue',lines:[['W',`这个${g}多少钱？`],['M',`${lz(n)}块。`]],qs:[Q(`这个${g}多少钱？`,`How much is the ${gen}?`,c,ds,`He answers ${lz(n)}块: ${n} yuan.`)]}}
  const n=pk([2,3,4,5,6,8]),k=pk([2,3,4]);const t=n*k;const c=[`${lz(t)}块`,`${t} yuan`];
  const ds=pickDistinct([...new Set([n,t+n,t-n,t+k,n+k,t+2,t-2,2*n+1])].filter(x=>x>0&&x!==t).map(x=>[`${lz(x)}块`,`${x} yuan`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['M',`${g}怎么卖？`],['W',`一个${lz(n)}块。`],['M',`我要${lz(k)}个。`]],qs:[Q('男的一共要付多少钱？','How much does the man pay in total?',c,ds,`${n} yuan each × ${k} = ${t} yuan.`)]};
}
const OBJS=[['手机','phone'],['书','book'],['杯子','cup'],['钥匙','keys'],['电脑','computer']];
const LOCS=[['桌子上','on the table'],['椅子下面','under the chair'],['电视旁边','next to the TV'],['包里','in the bag'],['床上','on the bed'],['门后面','behind the door']];
function gWhere(lvl){const [o,oen]=pk(OBJS);const l=pk(LOCS);const ds=pickDistinct(LOCS.filter(x=>x!==l),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W',`我的${o}在哪儿？`],['M',`在${l[0]}，你看看。`]],qs:[Q(`女的${o}在哪儿？`,`Where is her ${oen}?`,l,ds,`He says 在${l[0]}: ${l[1]}.`)]}}
const TRANS=[['坐出租车','by taxi'],['坐公共汽车','by bus'],['坐地铁','by subway'],['开车','by car'],['骑自行车','by bike'],['走路','on foot']];
const PLACES=[['公司','work'],['学校','school'],['机场','the airport'],['火车站','the railway station'],['医院','the hospital']];
function gTransport(lvl){
  const [p,pen]=pk(PLACES);
  if(lvl<=2){const t=pk(TRANS);const ds=pickDistinct(TRANS.filter(x=>x!==t),2);
    return {type:'Short dialogue',lines:[['M',`你每天怎么去${p}？`],['W',`我${t[0]}去。`]],qs:[Q(`女的怎么去${p}？`,`How does she get to ${pen}?`,t,ds,`She says 我${t[0]}去: ${t[1]}.`)]}}
  const [t1,t2]=pickDistinct(TRANS,2);const why=pk([['比较快','faster'],['比较方便','more convenient'],['比较便宜','cheaper']]);
  const ds=[t1,...pickDistinct(TRANS.filter(x=>x!==t1&&x!==t2),lvl>=4?2:1)];
  return {type:'Short dialogue',lines:[['M',`你现在还${t1[0]}去${p}吗？`],['W',`不了，以前${t1[0]}，现在${t2[0]}，${why[0]}。`]],qs:[Q(`女的现在怎么去${p}？`,`How does she get to ${pen} now?`,t2,ds,`以前 (before) ${t1[1]}; 现在 (now) ${t2[1]}, because it is ${why[1]}.`)]};
}
function gPeople(lvl){const n=pk([18,20,24,25,30,32,35,40]),m=pk([8,9,10,11,12,13,14,15]);if(m>=n)return null;const f=n-m;
  const c=[`${lz(f)}个`,`${f}`];const ds=pickDistinct([n,m,f+2,f-2,f+10].filter(x=>x>0&&x!==f).map(x=>[`${lz(x)}个`,`${x}`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W','你们班有多少个学生？'],['M',`${zh(n)}个，男生有${zh(m)}个。`]],qs:[Q('他们班有几个女学生？','How many female students are in his class?',c,ds,`${n} students, ${m} of them boys: ${n} − ${m} = ${f} girls.`)]}}
const WEATHER=[['会下雨','rain','别忘了带伞'],['很冷','very cold','多穿点儿衣服'],['很热','very hot','多喝点儿水'],['是晴天','sunny','我们可以去公园']];
function gWeather(lvl){const w=pk(WEATHER);const ds=pickDistinct(WEATHER.filter(x=>x!==w),2).map(x=>[x[0].replace('会',''),x[1]]);
  const c=[w[0].replace('会',''),w[1]];
  return {type:'Short dialogue',lines:[['M','明天天气怎么样？'],['W',`听说明天${w[0]}，${w[2]}。`]],qs:[Q('明天天气怎么样？','What will the weather be like tomorrow?',c,ds,`听说明天${w[0]}: it will be ${w[1]}.`)]}}
function gWeekday(lvl){const d=ri(5);const plus=pk([1,2]);const t=d+plus;const c=[`星期${WEEK[t]}`,WEEK_EN[t]];
  const ds=pickDistinct([d,t+1,t-1].filter(x=>x>=0&&x<=6&&x!==t).map(x=>[`星期${WEEK[x]}`,WEEK_EN[x]]),2);
  return {type:'Short dialogue',lines:[['M','今天星期几？'],['W',`今天星期${WEEK[d]}。我们${plus===1?'明天':'后天'}去看电影吧。`]],qs:[Q('他们星期几去看电影？','Which day will they see a film?',c,ds,`Today is ${WEEK_EN[d]}; ${plus===1?'明天 (tomorrow)':'后天 (the day after tomorrow)'} is ${WEEK_EN[t]}.`)]}}
const REL=[['哥哥','older brother',1],['姐姐','older sister',1],['弟弟','younger brother',-1],['妹妹','younger sister',-1]];
function gAge(lvl){const [r,ren,s]=pk(REL);const a=pk([18,20,22,24,25,26,28,30]),n=pk([2,3,4,5]);const t=a+s*n;
  const c=[`${zh(t)}岁`,`${t}`];const ds=pickDistinct([a,a-s*n,t+1,t-1].filter(x=>x!==t).map(x=>[`${zh(x)}岁`,`${x}`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['M',`你${r}今年多大？`],['W',`${s>0?'他比我大':'他比我小'}${lz(n)}岁，我今年${zh(a)}岁。`.replace(/他/,r.includes('姐')||r.includes('妹')?'她':'他')]],
    qs:[Q(`女的${r}今年多大？`,`How old is her ${ren}?`,c,ds,`She is ${a}; her ${ren} is ${n} years ${s>0?'older':'younger'}: ${t}.`)]}}
const NAMES=['小王','小李','小张','小刘','小陈'];
const ATTR=[['高','tallest','比','高'],['跑得快','fastest','跑得比','快'],['大','oldest','比','大']];
function gCompare(lvl){const [a,b,c3]=pickDistinct(NAMES,3);const at=pk(ATTR);
  const s1=at[0]==='跑得快'?`${a}跑得比${b}快`:`${a}比${b}${at[0]}`;const s2=at[0]==='跑得快'?`${c3}跑得比${a}还快`:`${c3}比${a}还${at[0]}`;
  const q=at[0]==='跑得快'?'谁跑得最快？':`谁最${at[0]}？`;
  return {type:'Short dialogue',lines:[['W',`${s1}。`],['M',`是吗？可是${s2}。`]],qs:[Q(q,`Who is the ${at[1]}?`,[c3,c3],[[a,a],[b,b]].concat(lvl>=4?[['一样',"they're the same"]]:[]),`${a} > ${b}, and ${c3} is even more (还) than ${a}, so ${c3} is the ${at[1]}.`)]}}
const EVENTS=[['会议','the meeting'],['考试','the exam'],['比赛','the match']];
const SLOTS=[];for(let d=0;d<5;d++)for(const [p,pen] of [['上午','morning'],['下午','afternoon']])SLOTS.push([`星期${WEEK[d]}${p}`,`${WEEK_EN[d]} ${pen}`]);
function gChange(lvl){const [e,een]=pk(EVENTS);const [s1,s2]=pickDistinct(SLOTS,2);const ds=[s1,...pickDistinct(SLOTS.filter(x=>x!==s1&&x!==s2),lvl>=4?2:1)];
  return {type:'Short dialogue',lines:[['M',`${e}还是${s1[0]}吗？`],['W',`不是了，改到${s2[0]}了。`]],qs:[Q(`${e}现在是什么时候？`,`When is ${een} now?`,s2,ds,`改到${s2[0]}了: moved to ${s2[1]}. ${s1[1]} was the old time.`)]}}
function gDuration(lvl){const y1=pk([2019,2020,2021,2022,2023]),y2=2026;const n=y2-y1;const what=pk([['来中国','in China','来'],['学汉语','studying Chinese','开始学汉语'],['在这家公司工作','at this company','来这家公司']]);
  const c=[`${lz(n)}年`,`${n} years`];const ds=pickDistinct([n-1,n+1,n+2,1].filter(x=>x>0&&x!==n).map(x=>[`${lz(x)}年`,`${x} years`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W',`你${what[0]}多长时间了？`],['M',`我是${y1}年${what[2]}的，今年是${y2}年。`]],qs:[Q(`男的${what[0]}多长时间了？`,`How long has he been ${what[1]}?`,c,ds,`From ${y1} to ${y2}: ${n} years.`)]}}
const LIKES=[[['米饭','rice'],['面条','noodles'],['饺子','dumplings'],['包子','steamed buns']],[['茶','tea'],['咖啡','coffee'],['牛奶','milk'],['果汁','juice']],[['打篮球','playing basketball'],['游泳','swimming'],['跑步','running'],['踢足球','playing football']]];
function gLike(lvl){const cat=pk(LIKES);const [a,b,c3]=pickDistinct(cat,3);const verb=cat===LIKES[0]?'吃':cat===LIKES[1]?'喝':'';
  return {type:'Short dialogue',lines:[['W',`你喜欢${verb}${a[0]}还是${b[0]}？`],['M',`我不太喜欢${verb}${a[0]}，我喜欢${verb}${b[0]}。`]],qs:[Q('男的喜欢什么？','What does the man like?',b,[a,c3].concat(lvl>=4?[cat.find(x=>x!==a&&x!==b&&x!==c3)]:[]),`不太喜欢${a[0]} (not keen on ${a[1]}), 喜欢${b[0]} (likes ${b[1]}).`)]}}
function gJudge(lvl){
  // true/false: hear one sentence, judge the printed statement (HSK 1–4 style)
  const kind=ri(3);let line,claim,claimEn,truth,why;
  if(kind===0){const [a,aen]=pk(ACTS);const h=pk(HOURS);const say=tz(h,false);const shown=R()<0.5?say:tz(pk(HOURS.filter(x=>x!==h)),false);truth=shown===say;
    line=`我明天${say[0]}${a}，别忘了提醒我。`;claim=`★ 他明天${shown[0]}${a}。`;claimEn=`True or false: he will ${aen} at ${shown[1]} tomorrow.`;why=`He says 我明天${say[0]}${a}: at ${say[1]}.`}
  else if(kind===1){const t=pk(TRANS);const [p,pen]=pk(PLACES);const shown=R()<0.5?t:pk(TRANS.filter(x=>x!==t));truth=shown===t;
    line=`我家离${p}不远，我每天都${t[0]}去。`;claim=`★ 他每天${shown[0]}去${p}。`;claimEn=`True or false: he goes to ${pen} ${shown[1]} every day.`;why=`He says 每天都${t[0]}去: ${t[1]}.`}
  else{const cat=pk(LIKES);const [a,b]=pickDistinct(cat,2);const verb=cat===LIKES[0]?'吃':cat===LIKES[1]?'喝':'';const shown=R()<0.5?b:a;truth=shown===b;
    line=`我不太喜欢${verb}${a[0]}，我更喜欢${verb}${b[0]}。`;claim=`★ 他喜欢${verb}${shown[0]}。`;claimEn=`True or false: he likes ${shown[1]}.`;why=`He prefers ${b[1]} (更喜欢${b[0]}), not ${a[1]}.`}
  const q={q:claim,qEn:claimEn,opts:['对','错'],en:['true','false'],ans:truth?0:1,why,read:false};
  return {type:'True or false',lines:[['M',line]],qs:[q]};
}
function gDiscount(lvl){const p=pk([200,300,400,500,600,800]),k=pk([5,6,7,8,9]);const t=p*k/10;const item=pk([['这件衣服','this item of clothing'],['这双鞋','these shoes'],['这个包','this bag']]);
  const c=[`${t}元`,`${t} yuan`];const ds=pickDistinct([p,p*(10-k)/10,p-k*10,t+50].filter(x=>x>0&&x!==t).map(x=>[`${x}元`,`${x} yuan`]),3);
  return {type:'Short dialogue',lines:[['W',`${item[0]}原价${p}元，今天打${zh(k)}折。`],['M','这么便宜？那我就买了吧。']],qs:[Q(`${item[0]}今天多少钱？`,`How much is ${item[1]} today?`,c,ds,`打${zh(k)}折 means paying ${k*10}% of the price: ${p} × ${k/10} = ${t} yuan.`)]}}
const REASONS=[['生病了','he is ill','发烧到三十九度'],['孩子病了','his child is ill','他得在家照顾孩子'],['去外地出差了','he is on a business trip','下个星期才回来'],['家里有点儿事','something came up at home','请了一天假'],['路上堵车','he is stuck in traffic','可能要晚一个小时']];
function gReason(lvl){const r=pk(REASONS);const n=pk(['小王','小李','小张','老刘','小陈']);const ds=pickDistinct(REASONS.filter(x=>x!==r),3);
  return {type:'Short dialogue',lines:[['M',`${n}今天怎么没来上班？`],['W',`听说他${r[0]}，${r[2]}。`]],qs:[Q(`${n}为什么没来上班？`,`Why isn't ${n} at work?`,[r[0],r[1]],ds.map(x=>[x[0],x[1]]),`听说他${r[0]}: ${r[1]}.`)]}}
const PLANS=[[['去海边旅游','travel to the seaside'],['在家休息','rest at home'],'机票太贵了'],[['坐飞机去','fly there'],['坐高铁去','take the high-speed train'],'高铁更方便'],[['买新车','buy a new car'],['买二手车','buy a used car'],'预算不够'],[['自己开车去','drive there'],['坐地铁去','take the subway'],'那边不好停车'],[['在外面吃饭','eat out'],['在家做饭','cook at home'],'最近想省点儿钱'],[['周末加班','work overtime at the weekend'],['周末去爬山','go hiking at the weekend'],'工作提前做完了']];
function gPlan(lvl){const [a,b,why]=pk(PLANS);const others=pickDistinct(PLANS.filter(p=>p[0]!==a),2).map(p=>p[1]);
  return {type:'Short dialogue',lines:[['W',`你还打算${a[0]}吗？`],['M',`本来打算${a[0]}，但是${why}，所以改成${b[0]}了。`]],qs:[Q('男的现在打算怎么做？','What does the man plan to do now?',b,[a,...others],`本来 (originally) ${a[1]}, but ${why}, so 改成 (changed to) ${b[1]}.`)]}}
const CITIES=['这座城市','我们省','这个景区'];
function gPercent(lvl){const n=pk([5,8,10,12,15,20,25,30]);const up=R()<0.6;const subj=pk([['游客人数','the number of tourists'],['网上购物的人数','the number of online shoppers'],['新能源汽车的销量','sales of electric cars']]);const where=pk(CITIES);
  const c=[`${up?'增长':'减少'}了${n}%`,`${up?'up':'down'} ${n}%`];
  const ds=[[`${up?'减少':'增长'}了${n}%`,`${up?'down':'up'} ${n}%`],[`${up?'增长':'减少'}了${n+5}%`,`${up?'up':'down'} ${n+5}%`],['没有变化','no change']];
  return {type:'Passage',lines:[['W',`据统计，今年${where}${subj[0]}比去年${up?'增长':'减少'}了百分之${zh(n)}，${up?'这说明人们的消费需求正在恢复':'有关部门正在分析原因'}。`]],qs:[Q(`今年${subj[0]}有什么变化？`,`How did ${subj[1]} change this year?`,c,ds,`比去年${up?'增长':'减少'}了百分之${zh(n)}: ${up?'up':'down'} ${n}% on last year.`)]}}
function gRevenue(lvl){const a=pk([80,100,120,150,200]),d=pk([20,30,40,50]);const up=R()<0.6;const b=up?a+d:a-d;
  const yen=x=>'¥'+(x*10000).toLocaleString('en-US');const c=[`${d}万元`,yen(d)];const ds=pickDistinct([a,b,d+10,d*2].filter(x=>x!==d).map(x=>[`${x}万元`,yen(x)]),3);
  return {type:'Short dialogue',lines:[['M','你们公司今年的情况怎么样？'],['W',`去年收入是${a}万元，今年是${b}万元，${up?'比我们预想的要好':'市场竞争太激烈了'}。`]],qs:[Q(`今年的收入比去年${up?'多':'少'}了多少？`,`How much ${up?'more':'less'} did they earn this year?`,c,ds,`${up?b+' − '+a:a+' − '+b} = ${d}万元 (万 = 10,000).`)]}}

/* extra handwritten items, HSK 4–6 */
const HAND=[
 {lvl:4,type:'Short dialogue',lines:[['W','你周末去看那个展览了吗？'],['M','本来想去的，结果到了门口才发现要提前在网上预约，只好回来了。']],qs:[{q:'男的为什么没看展览？',qEn:'Why didn’t he see the exhibition?',opts:['门票太贵','没有提前预约','展览已经结束','他生病了'],en:['tickets too expensive','didn’t book in advance','it had ended','he was ill'],ans:1,why:'要提前在网上预约: you had to book online in advance.'}]},
 {lvl:4,type:'Short dialogue',lines:[['M','你的护照办好了吗？'],['W','还没有，材料交上去了，说要等两个星期。']],qs:[{q:'女的护照什么时候能办好？',qEn:'When will her passport be ready?',opts:['今天','明天','大概两个星期后','已经办好了'],en:['today','tomorrow','in about two weeks','already done'],ans:2,why:'要等两个星期: she has to wait two weeks.'}]},
 {lvl:4,type:'Short dialogue',lines:[['W','这次活动的负责人是谁？'],['M','原来是小刘，不过他下个月要出国，所以换成了小陈。']],qs:[{q:'现在谁负责这次活动？',qEn:'Who is in charge of the event now?',opts:['小刘','小陈','男的','女的'],en:['Xiao Liu','Xiao Chen','the man','the woman'],ans:1,why:'原来是小刘 (originally Xiao Liu), 换成了小陈 (changed to Xiao Chen).'}]},
 {lvl:4,type:'Short dialogue',lines:[['M','我想把客厅重新布置一下，你有什么建议？'],['W','沙发可以靠窗放，这样光线好，看书也方便。']],qs:[{q:'女的建议把沙发放在哪儿？',qEn:'Where does she suggest putting the sofa?',opts:['门口','窗户旁边','电视对面','卧室里'],en:['by the door','by the window','opposite the TV','in the bedroom'],ans:1,why:'沙发可以靠窗放: put the sofa against the window.'}]},
 {lvl:4,type:'Short dialogue',lines:[['W','你怎么突然对做饭感兴趣了？'],['M','外卖吃多了对身体不好，而且自己做也省钱。']],qs:[{q:'男的为什么开始自己做饭？',qEn:'Why did he start cooking?',opts:['外卖太慢','想当厨师','健康又省钱','女朋友要求'],en:['delivery is slow','wants to be a chef','healthier and cheaper','his girlfriend asked'],ans:2,why:'对身体不好 (takeaway is unhealthy) and 省钱 (saves money).'}]},
 {lvl:4,type:'Short dialogue',lines:[['M','明天的面试你准备好了吗？'],['W','差不多了，就是有点儿紧张，怕到时候回答不出来。']],qs:[{q:'女的现在感觉怎么样？',qEn:'How does she feel?',opts:['很轻松','有点儿紧张','很生气','很失望'],en:['relaxed','a bit nervous','angry','disappointed'],ans:1,why:'就是有点儿紧张: just a bit nervous.'}]},
 {lvl:5,type:'Short dialogue',lines:[['W','这款手机刚上市就降价了，你说现在买划算吗？'],['M','我建议再等等，一般新品上市三个月以后价格会更稳定。']],qs:[{q:'男的建议怎么做？',qEn:'What does he suggest?',opts:['马上买','再等一段时间','买别的品牌','去国外买'],en:['buy now','wait a while','buy another brand','buy abroad'],ans:1,why:'我建议再等等: wait; prices settle about three months after launch.'}]},
 {lvl:5,type:'Short dialogue',lines:[['M','你觉得在家办公效率高吗？'],['W','因人而异吧。我不用花时间通勤，但家里干扰也多，得特别自律才行。']],qs:[{q:'女的认为在家办公需要什么？',qEn:'What does working from home require, in her view?',opts:['更大的房子','很强的自律','更快的网络','同事的帮助'],en:['a bigger flat','strong self-discipline','faster internet','help from colleagues'],ans:1,why:'得特别自律才行: you need to be very self-disciplined.'}]},
 {lvl:5,type:'Passage',lines:[['W','很多城市开始推广共享单车。它不仅方便了市民短距离出行，还减少了汽车尾气的排放。但是，也出现了一些问题，比如有人乱停乱放，影响了交通。因此，有关部门规定了专门的停车区域。']],qs:[
   {q:'共享单车的好处是什么？',qEn:'What is good about shared bikes?',opts:['价格很贵','方便短距离出行、减少污染','速度很快','可以随便停放'],en:['expensive','handy for short trips, less pollution','very fast','can be parked anywhere'],ans:1,why:'方便了市民短距离出行，还减少了汽车尾气的排放.'},
   {q:'有关部门采取了什么措施？',qEn:'What did the authorities do?',opts:['禁止使用共享单车','规定了停车区域','提高了价格','增加了公交车'],en:['banned shared bikes','set parking areas','raised prices','added buses'],ans:1,why:'规定了专门的停车区域: designated parking areas.'}]},
 {lvl:5,type:'Short dialogue',lines:[['W','听说你们公司要搬到郊区去了？'],['M','是啊，那边租金便宜一半，不过员工上下班就远了，公司打算安排班车。']],qs:[{q:'公司为什么搬到郊区？',qEn:'Why is the company moving to the suburbs?',opts:['交通更方便','租金更便宜','环境更好','离客户更近'],en:['better transport','cheaper rent','nicer environment','closer to clients'],ans:1,why:'租金便宜一半: rent is half the price.'}]},
 {lvl:5,type:'Short dialogue',lines:[['M','这篇论文你改了几遍了？'],['W','第五遍了。导师说结构没问题，就是数据部分还不够充分，让我再补充一些调查结果。']],qs:[{q:'论文主要的问题是什么？',qEn:'What is the main problem with the paper?',opts:['结构不清楚','数据不够充分','题目不合适','字数太少'],en:['unclear structure','not enough data','wrong topic','too short'],ans:1,why:'数据部分还不够充分: the data section is not sufficient.'}]},
 {lvl:5,type:'Short dialogue',lines:[['W','你为什么选择学医？'],['M','小时候奶奶生病，是医生救了她。从那时候起，我就想成为一名医生。']],qs:[{q:'男的为什么学医？',qEn:'Why did he study medicine?',opts:['父母要求','收入高','小时候的经历','朋友建议'],en:['his parents wanted it','good pay','a childhood experience','a friend suggested it'],ans:2,why:'A doctor saved his grandmother when he was little: 从那时候起，我就想成为一名医生.'}]},
 {lvl:6,type:'Short dialogue',lines:[['M','这个项目拖了这么久，问题到底出在哪儿？'],['W','说白了就是部门之间沟通不畅，每个人都只管自己那一块，没人从整体上把关。']],qs:[{q:'女的认为问题出在哪里？',qEn:'Where does she think the problem lies?',opts:['资金不足','技术太难','部门之间缺乏沟通','时间太短'],en:['not enough money','too difficult technically','poor communication between departments','too little time'],ans:2,why:'部门之间沟通不畅: departments do not communicate well.'}]},
 {lvl:6,type:'Passage',lines:[['W','心理学家发现，人们在做决定时往往会受到“第一印象”的影响。比如，同一件商品，如果先看到一个很高的价格，再看到打折后的价格，人们就会觉得很便宜，即使这个价格并不低。商家正是利用了这种心理来促进销售。']],qs:[
   {q:'人们做决定时容易受到什么影响？',qEn:'What easily influences people’s decisions?',opts:['朋友的建议','第一印象','广告的长短','天气的变化'],en:['friends’ advice','first impressions','length of adverts','the weather'],ans:1,why:'往往会受到“第一印象”的影响.'},
   {q:'商家利用这种心理来做什么？',qEn:'What do sellers use this for?',opts:['降低成本','促进销售','招聘员工','提高质量'],en:['cut costs','boost sales','hire staff','improve quality'],ans:1,why:'利用了这种心理来促进销售: to boost sales.'}]},
 {lvl:6,type:'Short dialogue',lines:[['W','你对这次的谈判结果满意吗？'],['M','谈不上满意，但也算是双方各让一步吧，能达成协议已经不容易了。']],qs:[{q:'男的对谈判结果是什么态度？',qEn:'How does he feel about the outcome?',opts:['非常满意','完全不能接受','可以接受','很后悔'],en:['very satisfied','unacceptable','acceptable','regretful'],ans:2,why:'谈不上满意 (not exactly satisfied), but reaching an agreement 已经不容易了: acceptable.'}]},
 {lvl:6,type:'Short dialogue',lines:[['M','现在的孩子从小就上各种兴趣班，你怎么看？'],['W','培养兴趣本身没错，可如果完全是家长的意愿，孩子反而会产生抵触情绪。']],qs:[{q:'女的担心什么？',qEn:'What is she worried about?',opts:['兴趣班太贵','孩子没有时间学习','孩子会产生抵触情绪','老师不专业'],en:['classes are expensive','no time to study','children will resist','teachers are unqualified'],ans:2,why:'孩子反而会产生抵触情绪: children may start to resent it.'}]},
 {lvl:6,type:'Passage',lines:[['W','随着人口老龄化的加剧，越来越多的社区开始建立养老服务中心。这些中心为老人提供餐饮、医疗和文化活动等服务，让老人在熟悉的环境中安度晚年。同时，这也减轻了子女的负担。']],qs:[
   {q:'社区养老服务中心提供什么服务？',qEn:'What do community elderly-care centres provide?',opts:['只提供医疗','餐饮、医疗和文化活动','帮老人找工作','免费旅游'],en:['medical care only','meals, medical care and activities','job hunting','free travel'],ans:1,why:'提供餐饮、医疗和文化活动等服务.'},
   {q:'这种服务对子女有什么好处？',qEn:'How does it help the children of the elderly?',opts:['增加收入','减轻负担','提供工作机会','方便出国'],en:['more income','lighter burden','job opportunities','easier to go abroad'],ans:1,why:'减轻了子女的负担.'}]},
 {lvl:6,type:'Short dialogue',lines:[['W','听说你辞掉了稳定的工作去做自由职业？'],['M','嗯，收入确实没以前稳定，但时间自由了，能做自己真正喜欢的事，我觉得值得。']],qs:[{q:'男的怎么看自己的选择？',qEn:'How does he see his choice?',opts:['很后悔','觉得值得','收入更高了','想回原来的公司'],en:['regrets it','thinks it is worth it','earns more','wants his old job back'],ans:1,why:'我觉得值得: I think it is worth it.'}]}
];

const PLAN_L={1:[gTime,gPrice,gWhere,gLike,gTransport],2:[gTime,gPrice,gPeople,gTransport,gWeather,gWeekday,gAge,gLike,gWhere],
  3:[gTransport,gCompare,gChange,gDuration,gPeople,gAge,gJudge,gTime],4:[gCompare,gChange,gDiscount,gReason,gPlan,gJudge,gDuration,gTime,gPrice],
  5:[gDiscount,gReason,gPlan,gPercent,gRevenue],6:[gPercent,gRevenue,gPlan,gReason]};
const TARGET={1:50,2:50,3:50,4:44,5:38,6:40};
const listening=[...HAND];
for(let l=1;l<=6;l++)listening.push(...makeBank(TARGET[l],PLAN_L[l],l));

/* ================= HSKK SPEAKING BANK ================= */
const sp=[];const add=(lvl,mode,text,en)=>sp.push({lvl,mode,text,en});
// Beginner: listen and repeat (pattern sentences)
{const S=[['我','I',false],['他','he',true],['我们','we',false],['我朋友','my friend',true],['她','she',true]];
 const T=[['每天','every day'],['明天','tomorrow'],['周末','at the weekend']];
 const P={在家:'at home',在学校:'at school',在公园:'in the park'};
 const V=[['看书','read','reads',['在家','在学校','在公园']],['学习汉语','study Chinese','studies Chinese',['在家','在学校']],['跑步','go running','goes running',['在公园','在学校']],['喝茶','drink tea','drinks tea',['在家','在公园']],['听音乐','listen to music','listens to music',['在家','在公园']],['做饭','cook','cooks',['在家']]];
 const all=[];S.forEach(s=>T.forEach(t=>V.forEach(v=>v[3].forEach(p=>{
   const en=t[0]==='明天'?`${s[1]} will ${v[1]} ${P[p]} tomorrow.`:`${s[1]} ${s[2]?v[2]:v[1]} ${P[p]} ${t[1]}.`;
   all.push([`${s[0]}${t[0]}${p}${v[0]}。`,en[0].toUpperCase()+en.slice(1)])}))));
 shuf(all).slice(0,70).forEach(x=>add('Beginner','repeat',x[0],x[1]));
 ['我每天七点起床。|I get up at seven every day.','这个苹果很好吃。|This apple is delicious.','你明天去哪儿？|Where are you going tomorrow?','我想喝一杯水。|I would like a glass of water.','他是我的中国朋友。|He is my Chinese friend.','我们明天下午去看电影。|We are going to a film tomorrow afternoon.','请问，火车站怎么走？|Excuse me, how do I get to the station?','我的手机在桌子上。|My phone is on the table.','今天太冷了，我不想出去。|It is too cold today; I don’t want to go out.','她每天晚上九点睡觉。|She goes to bed at nine every evening.']
  .forEach(s=>{const [a,b]=s.split('|');add('Beginner','repeat',a,b)});}
// Beginner: listen and answer
'你叫什么名字？|What is your name?;你是哪国人？|Where are you from?;你今年多大？|How old are you?;你住在哪儿？|Where do you live?;你家有几口人？|How many people are in your family?;你喜欢什么颜色？|What color do you like?;你喜欢吃什么水果？|What fruit do you like?;你每天几点起床？|What time do you get up?;你今天怎么来的？|How did you get here today?;你会说汉语吗？|Can you speak Chinese?;你喜欢喝茶还是咖啡？|Tea or coffee?;你今天早上吃了什么？|What did you eat this morning?;你周末一般做什么？|What do you usually do at the weekend?;你有哥哥吗？|Do you have an older brother?;你的生日是几月几号？|When is your birthday?;你喜欢什么运动？|What sport do you like?;你会做饭吗？|Can you cook?;你喜欢看电影吗？|Do you like films?;你住的地方离这儿远吗？|Is your home far from here?;今天天气怎么样？|What is the weather like today?;你的手机是什么颜色的？|What color is your phone?;你喜欢狗还是猫？|Dogs or cats?;你昨天晚上几点睡觉的？|What time did you go to bed last night?;你学汉语多长时间了？|How long have you studied Chinese?;你在哪儿工作？|Where do you work?;你在哪儿学习汉语？|Where do you study Chinese?;你喜欢唱歌吗？|Do you like singing?;你最喜欢星期几？|Which day of the week do you like best?;你每天怎么去学校？|How do you get to school?;你有中国朋友吗？|Do you have Chinese friends?;你想去哪儿旅游？|Where would you like to travel?;你喜欢冬天还是夏天？|Winter or summer?;你家附近有商店吗？|Is there a shop near your home?;你一般在哪儿吃午饭？|Where do you usually have lunch?;你喜欢吃米饭还是面条？|Rice or noodles?;你会开车吗？|Can you drive?;你今天忙不忙？|Are you busy today?;你明天有时间吗？|Are you free tomorrow?;你喜欢听什么音乐？|What music do you like?;你家有几个房间？|How many rooms does your home have?;你最近身体怎么样？|How have you been feeling lately?;你喜欢早上还是晚上学习？|Do you study in the morning or evening?;你一个星期运动几次？|How often do you exercise a week?;你喜欢在家吃饭还是在外面吃？|Eat at home or eat out?;你去过中国吗？|Have you been to China?;你的好朋友叫什么名字？|What is your good friend’s name?;你每天睡几个小时？|How many hours do you sleep?;你喜欢下雨天吗？|Do you like rainy days?;你会游泳吗？|Can you swim?;你喜欢什么动物？|What animal do you like?'
 .split(';').forEach(s=>{const [a,b]=s.split('|');add('Beginner','answer',a,b)});
// Beginner: answer questions (talk 1.5 min)
'请介绍一下你的家。|Describe your family.;你周末一般做什么？|What do you usually do at the weekend?;请介绍一下你的一个朋友。|Describe one of your friends.;你喜欢吃什么菜？为什么？|What food do you like, and why?;请说说你的一天。|Describe your day.;你喜欢什么运动？为什么？|What sport do you like, and why?;请介绍一下你的学校。|Describe your school.;请介绍一下你住的地方。|Describe where you live.;你最喜欢哪个季节？为什么？|Which season do you like best, and why?;请说说你的爱好。|Talk about your hobbies.;你喜欢去哪儿买东西？|Where do you like to go shopping?;你为什么学习汉语？|Why do you study Chinese?;请介绍一下你的老师。|Describe your teacher.;你过生日的时候一般做什么？|What do you do on your birthday?;你喜欢什么动物？为什么？|What animal do you like, and why?;请说说你最喜欢的一个地方。|Talk about your favourite place.;你早饭一般吃什么？|What do you usually have for breakfast?;你喜欢看什么电视节目？|What TV programmes do you like?;请介绍一下你的国家。|Describe your country.;这个周末你想去哪儿玩？|Where would you like to go this weekend?'
 .split(';').forEach(s=>{const [a,b]=s.split('|');add('Beginner','talk',a,b)});
// Intermediate: listen and repeat (patterns)
{const CR=[['不下雨','it doesn’t rain'],['天气好','the weather is good'],['有时间','we have time'],['不太忙','we aren’t too busy']];const RR=[['去爬山','go hiking'],['去公园散步','go for a walk in the park'],['一起去看电影','go to a film together'],['去海边玩','go to the seaside']];
 CR.forEach(c=>RR.forEach(r=>add('Intermediate','repeat',`如果明天${c[0]}，我们就${r[0]}。`,`If ${c[1]} tomorrow, we will ${r[1]}.`)));
 const PAIR=[['听音乐','做作业','listens to music while doing homework'],['喝咖啡','看报纸','reads the paper while drinking coffee'],['走路','打电话','talks on the phone while walking'],['吃饭','看电视','watches TV while eating'],['唱歌','跳舞','sings while dancing']];
 [['他','He'],['我妹妹','My younger sister'],['我朋友','My friend']].forEach(s=>PAIR.forEach(p=>add('Intermediate','repeat',`${s[0]}一边${p[0]}，一边${p[1]}。`,`${s[1]} ${p[2]}.`)));
 '虽然今天很冷，但是我们还是去跑步了。|Although it was cold today, we still went running.;虽然这件衣服有点儿贵，但是质量非常好。|Although this is a bit expensive, the quality is excellent.;虽然他学汉语的时间不长，但是说得很流利。|Although he hasn’t studied Chinese long, he speaks fluently.;虽然工作很忙，但是他每天都坚持运动。|Although work is busy, he exercises every day.;虽然这个问题很难，但是她很快就回答出来了。|Although the question was hard, she answered it quickly.;虽然外面下着大雨，但是他还是准时到了。|Although it was pouring, he still arrived on time.;虽然那家饭馆离这儿很远，但是菜特别好吃。|Although that restaurant is far, the food is great.;请你把窗户打开，好吗？|Could you open the window, please?;请你把门关上，好吗？|Could you close the door, please?;请你把空调关了，好吗？|Could you turn off the air conditioner, please?;请你把这本书还给图书馆，好吗？|Could you return this book to the library, please?;请你把这些水果放进冰箱，好吗？|Could you put this fruit in the fridge, please?;请你把名字写在这儿，好吗？|Could you write your name here, please?;这本书比那本有意思多了。|This book is much more interesting than that one.;今天比昨天冷多了。|Today is much colder than yesterday.;坐地铁比坐公共汽车快多了。|The subway is much faster than the bus.;这个房间比那个干净多了。|This room is much cleaner than that one.;他的汉语比我好多了。|His Chinese is much better than mine.;我在这家公司工作三年了。|I have worked at this company for three years.;他学汉语学了两年了。|He has been studying Chinese for two years.;我已经习惯了这里的天气。|I have got used to the weather here.;我把作业忘在家里了。|I left my homework at home.;他已经在这家公司工作三年了。|He has worked at this company for three years.;这个周末我打算和朋友一起去爬山。|This weekend I plan to go hiking with friends.;下个月我打算搬家。|I plan to move next month.;明年我打算去北京学习。|I plan to study in Beijing next year.;我打算这个暑假学开车。|I plan to learn to drive this summer.;她打算换一份新工作。|She plans to find a new job.;要是明天不下雨，我们就去公园。|If it doesn’t rain tomorrow, we’ll go to the park.'
  .split(';').forEach(s=>{const [a,b]=s.split('|');add('Intermediate','repeat',a,b)});}
// Intermediate: describe a picture
'一家人在饭馆里吃饭，一个孩子在哭。|Picture: a family is eating at a restaurant and a child is crying.;一个年轻人在机场看手机，旁边有一个很大的行李箱。|Picture: a young person at an airport looks at a phone next to a big suitcase.;两个学生在图书馆里看书，桌子上有很多书。|Picture: two students reading in a library, with lots of books on the table.;一位老人在公园里打太极拳，旁边有几个孩子在看。|Picture: an old man doing tai chi in a park while some children watch.;一个女孩在超市里买水果，手里拿着一个西瓜。|Picture: a girl buying fruit in a supermarket, holding a watermelon.;下雨了，一个男人没带伞，站在商店门口等雨停。|Picture: it is raining; a man without an umbrella waits in a shop doorway.;一个医生在给一个小孩子看病，妈妈在旁边很着急。|Picture: a doctor examining a small child while the worried mother watches.;几个朋友在家里过生日，桌子上有一个大蛋糕。|Picture: friends celebrating a birthday at home with a big cake.;早上地铁里人很多，大家都在看手机。|Picture: a crowded morning subway; everyone is looking at their phones.;一个人在厨房里做饭，锅里冒着烟。|Picture: someone cooking in a kitchen; smoke is rising from the pan.;两个人在打羽毛球，其中一个人摔倒了。|Picture: two people playing badminton; one of them has fallen over.;一个男孩在教室里举手回答问题。|Picture: a boy raising his hand to answer a question in class.;一对年轻人在搬家，房间里都是箱子。|Picture: a young couple moving house; the room is full of boxes.;一个司机在路边修车，看起来很累。|Picture: a driver repairing a car by the roadside, looking tired.;一个女人在咖啡馆里用电脑工作，桌子上有一杯咖啡。|Picture: a woman working on a laptop in a café with a coffee on the table.;很多人在火车站排队买票。|Picture: lots of people queuing for tickets at a railway station.;一个孩子在河边钓鱼，爸爸在旁边帮他。|Picture: a child fishing by a river with his father helping.;一位服务员不小心把饮料倒在了客人身上。|Picture: a waiter accidentally spills a drink on a customer.;一只小狗在门口等主人回家。|Picture: a little dog waiting at the door for its owner.;两个人在商店里讨论买哪个手机。|Picture: two people in a shop discussing which phone to buy.'
 .split(';').forEach(s=>{const [a,b]=s.split('|');add('Intermediate','picture',a,b)});
// Intermediate: answer questions
'你觉得学习外语最难的是什么？|What is the hardest part of learning a foreign language?;请谈谈你最喜欢的一个城市。|Talk about the city you like most.;你更喜欢一个人旅游还是和朋友一起？为什么？|Travelling alone or with friends, and why?;你觉得住在城市好还是住在农村好？|City life or country life?;请谈谈你最难忘的一次旅行。|Talk about your most memorable trip.;你怎么看网上购物？|What do you think of online shopping?;你觉得运动对身体有什么好处？|How does exercise help your health?;请介绍一个对你影响很大的人。|Describe someone who has influenced you.;你平时怎么减轻压力？|How do you relieve stress?;你觉得学生应该打工吗？为什么？|Should students have part-time jobs?;你喜欢看书还是看电影？为什么？|Books or films, and why?;请谈谈你理想的工作。|Describe your ideal job.;你觉得手机给生活带来了哪些变化？|How have phones changed daily life?;你怎么看养宠物？|What do you think about keeping pets?;请谈谈你的一个好习惯。|Talk about one of your good habits.;你觉得朋友多好还是少好？|Is it better to have many friends or a few?;你周末喜欢待在家里还是出去玩？|Stay home or go out at the weekend?;请说说你学习汉语的方法。|How do you study Chinese?;你觉得什么样的老师是好老师？|What makes a good teacher?;你怎么看早睡早起？|What do you think about early nights and early mornings?;请谈谈你小时候的一件事。|Tell a story from your childhood.;你觉得在大城市生活压力大吗？|Is life in a big city stressful?;你喜欢自己做饭还是去饭馆吃？|Cook at home or eat out?;你觉得旅游的意义是什么？|What is the point of travelling?;请谈谈你们国家的一个节日。|Talk about a festival in your country.;你怎么安排自己的时间？|How do you manage your time?;你觉得健康和工作哪个更重要？|Health or work: which matters more?;你会选择坐飞机还是坐火车旅行？|Would you rather travel by plane or train?;你觉得应该怎样保护环境？|How should we protect the environment?;请谈谈你最近读过的一本书或看过的一部电影。|Talk about a book or film you enjoyed recently.'
 .split(';').forEach(s=>{const [a,b]=s.split('|');add('Intermediate','talk',a,b)});
// Advanced: answer questions
'你认为科技让人与人之间的关系更近了还是更远了？|Has technology brought people closer or pushed them apart?;有人说“失败是成功之母”，你怎么看？|“Failure is the mother of success.” Do you agree?;你认为大学教育最重要的是什么？|What matters most in university education?;你怎么看待“躺平”这种生活态度？|What do you think of “lying flat” as an attitude to life?;人工智能会不会取代人类的工作？请谈谈你的看法。|Will AI replace human jobs?;你认为城市化带来了哪些问题？|What problems has urbanisation brought?;有人认为孩子应该从小学习多种技能，你同意吗？|Should children learn many skills from an early age?;你怎么看待网络上的信息真假难辨的问题？|How should we deal with misinformation online?;你认为选择工作时，兴趣和收入哪个更重要？|Interest or income: which matters more when choosing a job?;谈谈你对终身学习的理解。|What does lifelong learning mean to you?;你认为社交媒体对年轻人有什么影响？|How does social media affect young people?;有人说“读万卷书不如行万里路”，你怎么看？|“Travelling ten thousand miles beats reading ten thousand books.” Discuss.;你怎么看待越来越多的人选择不结婚？|What do you think about more people choosing not to marry?;你认为环境保护应该由政府负责还是每个人负责？|Is environmental protection the government’s job or everyone’s?;谈谈竞争的好处和坏处。|Discuss the pros and cons of competition.;你认为成功的标准是什么？|What is your definition of success?;你怎么看待“网红经济”？|What do you think of the influencer economy?;如果可以改变一个社会问题，你会选择什么？为什么？|If you could fix one social problem, which would it be?;你认为传统文化在现代社会还重要吗？|Does traditional culture still matter today?;谈谈你对远程办公的看法。|What do you think about remote work?;你认为金钱能买到幸福吗？|Can money buy happiness?;老年人越来越多，社会应该怎么应对？|How should society respond to an ageing population?;你怎么看待父母为孩子安排未来？|Should parents plan their children’s future?;你认为学习外语最好的方法是什么？|What is the best way to learn a foreign language?;谈谈一次让你改变想法的经历。|Describe an experience that changed your mind.;你认为快节奏的生活方式好吗？|Is a fast-paced lifestyle good?;有人说“细节决定成败”，你同意吗？|“Details decide success or failure.” Do you agree?;你认为应该怎样解决交通堵塞问题？|How should traffic congestion be solved?;你怎么看待消费贷款越来越普遍？|What do you think of the spread of consumer loans?;你认为一个好的领导应该具备哪些能力？|What qualities should a good leader have?'
 .split(';').forEach(s=>{const [a,b]=s.split('|');add('Advanced','talk',a,b)});
// Advanced: read aloud
[['每天早上，我都会去公园跑步。公园里有很多老人在打太极拳，也有年轻人在遛狗。春天的时候，湖边的柳树长出新芽，空气里都是花的香味。跑完步，我喜欢坐在长椅上，看太阳慢慢升起来。这短短的一个小时，是我一天里最安静的时间。','A morning run in the park.'],
 ['小时候，我最喜欢的地方是外婆家的院子。院子里种着一棵大枣树，每到秋天，树上就挂满了红红的枣子。外婆总是一边摘枣，一边给我讲故事。现在外婆已经老了，可那些故事，我到今天还记得清清楚楚。','Grandmother’s courtyard and her stories.'],
 ['很多人觉得读书没有用，因为书里的知识在生活中好像用不上。其实，读书最大的作用不是记住多少知识，而是让我们学会思考。一本好书就像一位老朋友，在我们迷茫的时候，给我们方向和力量。','Why reading matters.'],
 ['第一次来到这座城市的时候，我一个朋友也没有。语言不通，生活不习惯，常常一个人在房间里发呆。后来，我参加了一个语言交换活动，认识了很多当地的朋友。他们教我说汉语，带我吃地道的小吃。慢慢地，这座城市成了我的第二个家。','Making a strange city home.'],
 ['时间是最公平的。不管你是谁，每个人每天都只有二十四个小时。有的人把时间用在学习和工作上，有的人却在手机上浪费了大半天。一年以后，两个人的差距就会变得很明显。所以，学会管理时间，就是学会管理自己的生活。','Time is fair to everyone.'],
 ['去年夏天，我和几个朋友去云南旅行。我们在古城里住了三天，每天早上都被鸟叫声叫醒。白天我们骑着自行车去看雪山，晚上坐在小饭馆里吃当地的菜。那次旅行虽然很累，却是我这几年最开心的一段时间。','A trip to Yunnan.']]
 .forEach(([a,b])=>add('Advanced','read',a,b));
// Advanced: listen and retell
[['小王第一次去面试的时候非常紧张，说话的声音一直在发抖。面试结束后，他觉得自己一定没有希望了。没想到一个星期以后，公司打电话通知他被录取了。经理说，他们看重的不是他说得多流利，而是他回答问题时的真诚。','A nervous first interview; sincerity got him the job.'],
 ['有一位老人每天早上都在公园里打扫落叶。有人问他为什么这么做，他笑着说：“公园是大家的，我只是做一点儿自己能做的事。”后来，越来越多的人加入了他，公园变得比以前更干净了。','An old man sweeps the park; others join him.'],
 ['现在很多人习惯用手机付款，出门几乎不带现金。这种方式虽然方便，但也有人担心个人信息的安全。专家建议，大家在使用手机付款时，一定要设置密码，并且不要随便点击陌生的链接。','Mobile payment: convenient, but protect your data.'],
 ['一个年轻人想学画画，去找一位有名的画家。画家给了他一张白纸，让他每天只画一个圆。年轻人画了一个月，觉得很无聊，就去问画家为什么。画家说：“只有基本功练好了，以后才能画出好作品。”','A painter makes his student draw circles.'],
 ['最近，一家超市推出了“不打包”活动：顾客自己带袋子和盒子来买东西，就可以享受九折优惠。活动开始以后，超市每天使用的塑料袋少了一半。很多顾客说，这样既省钱又环保，希望其他超市也能这样做。','A supermarket rewards shoppers who bring bags.'],
 ['有个人在路上捡到一个钱包，里面有很多现金和一张身份证。他按照身份证上的地址找到了失主。失主非常感动，想给他一些钱表示感谢，他却拒绝了。他说：“如果是我丢了钱包，我也希望有人能还给我。”','Returning a lost wallet.'],
 ['一位妈妈发现孩子每天放学后都玩很长时间的游戏。她没有直接批评孩子，而是和孩子一起制定了一个计划：先完成作业，再玩半个小时。几个星期以后，孩子不但成绩提高了，和妈妈的关系也变得更好了。','A mother and child agree on a gaming plan.'],
 ['有一家小饭馆生意一直不好。老板发现，客人最大的问题是等菜的时间太长。于是他简化了菜单，只保留了最受欢迎的十道菜。没想到，菜少了，客人反而多了起来。','A restaurant cuts its menu and gains customers.'],
 ['科学家研究发现，每天散步三十分钟，可以降低患心脏病的风险。而且，散步不需要任何器材，也不受年龄限制。研究人员建议，上班族可以选择提前一站下车，走路去公司。','Thirty minutes of walking a day.'],
 ['小李大学毕业后回到了家乡的小村子。他利用网络，把村里的水果卖到了全国各地。第一年，村民的收入就增加了一倍。现在，越来越多的年轻人愿意回到村里工作了。','A graduate sells village fruit online.']]
 .forEach(([a,b])=>add('Advanced','retell',a,b));

/* ================= ADDITIONS (Nov 2026): new seed, appended after the original banks ================= */
R=rng(20261106);
const MONTH_EN=['','January','February','March','April','May','June','July','August','September','October','November','December'];
function gBirthday(lvl){const m=1+ri(12),d=1+ri(28);const c=[`${zh(m)}月${zh(d)}号`,`${MONTH_EN[m]} ${d}`];
  const cand=[[m,d+10],[m,d>10?d-10:d+5],[m===12?1:m+1,d],[m===1?12:m-1,d]];if(d<=12&&d!==m)cand.push([d,m]);
  const ds=pickDistinct(cand.filter(([a,b])=>b>=1&&b<=31).map(([a,b])=>[`${zh(a)}月${zh(b)}号`,`${MONTH_EN[a]} ${b}`]).filter(x=>x[0]!==c[0]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W','你的生日是几月几号？'],['M',`我的生日是${zh(m)}月${zh(d)}号。`]],qs:[Q('男的生日是几月几号？','When is the man’s birthday?',c,ds,`He says ${zh(m)}月${zh(d)}号: ${MONTH_EN[m]} ${d}.`)]}}
const PLACE_ACT=[['商店','买东西','the shop','buy things'],['医院','看病','the hospital','see a doctor'],['学校','上课','school','go to class'],['饭馆','吃饭','a restaurant','have a meal'],['火车站','接朋友','the station','meet a friend'],['图书馆','看书','the library','read'],['超市','买水果','the supermarket','buy fruit']];
function gGoWhere(lvl){const [p,a,pen,aen]=pk(PLACE_ACT);const others=pickDistinct(PLACE_ACT.filter(x=>x[0]!==p),lvl>=4?3:2);const askPlace=R()<0.5;
  const lines=[['W',`你现在去哪儿？`],['M',`我去${p}${a}。`]];
  return askPlace?{type:'Short dialogue',lines,qs:[Q('男的去哪儿？','Where is the man going?',[p,pen],others.map(x=>[x[0],x[2]]),`我去${p}: he is going to ${pen}.`)]}
    :{type:'Short dialogue',lines,qs:[Q('男的去做什么？','What is the man going to do?',[a,aen],others.map(x=>[x[1],x[3]]),`去${p}${a}: he is going to ${aen}.`)]}}
const THINGS=[['个','苹果','apples'],['本','书','books'],['个','杯子','cups'],['只','猫','cats'],['件','衣服','items of clothing'],['个','朋友','friends']];
function gCount(lvl){const [m,t,ten]=pk(THINGS);const n=2+ri(8);const c=[`${lz(n)}${m}`,`${n}`];const ds=pickDistinct([n-1,n+1,n+2,n*2].filter(x=>x>0&&x!==n).map(x=>[`${lz(x)}${m}`,`${x}`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W',`你有几${m}${t}？`],['M',`我有${lz(n)}${m}。`]],qs:[Q(`男的有几${m}${t}？`,`How many ${ten} does the man have?`,c,ds,`我有${lz(n)}${m}: ${n} ${ten}.`)]}}
const JOBS=[['医生','a doctor','医院'],['老师','a teacher','学校'],['司机','a driver','出租车公司'],['服务员','a waiter','饭馆'],['工程师','an engineer','一家电脑公司'],['律师','a lawyer','律师事务所'],['护士','a nurse','医院']];
const RELS=[['姐姐','sister','她'],['哥哥','brother','他'],['妈妈','mother','她'],['爸爸','father','他'],['朋友','friend','他']];
function gJob(lvl){const j=pk(JOBS);const [r,ren,pr]=pk(RELS);const ds=pickDistinct(JOBS.filter(x=>x!==j),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W',`你${r}做什么工作？`],['M',`${pr}是${j[0]}，在${j[2]}工作。`]],qs:[Q(`男的${r}是做什么的？`,`What does the man’s ${ren} do?`,[j[0],j[1]],ds.map(x=>[x[0],x[1]]),`${pr}是${j[0]}: ${j[1]}.`)]}}
function gMeet(lvl){const h=2+ri(8);const c=[`${lz(h)}点半`,`${h}:30`];const ds=[[`${lz(h)}点`,`${h}:00`],[`${lz(h+1)}点`,`${h+1}:00`],[`${lz(h-1)}点半`,`${h-1}:30`]].slice(0,lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['W','我们明天几点见面？'],['M',`本来说好${lz(h)}点，可是我得晚半个小时，${lz(h)}点半吧。`]],qs:[Q('他们明天几点见面？','When will they meet tomorrow?',c,ds,`Originally ${h}:00, but he will be half an hour (半个小时) late: ${h}:30.`)]}}
const SPOTS=[['邮局','the post office'],['银行','the bank'],['地铁站','the subway station'],['超市','the supermarket'],['医院','the hospital']];
function gRoute(lvl){const [p,pen]=pk(SPOTS);const n=1+ri(3);const dir=pk([['左','left'],['右','right']]);const askN=R()<0.5;
  const lines=[['M',`请问，去${p}怎么走？`],['W',`一直往前走，到第${zh(n)}个路口往${dir[0]}拐就到了。`]];
  if(askN){const c=[`第${zh(n)}个`,`the ${['','first','second','third'][n]}`];const ds=[1,2,3,4].filter(x=>x!==n).map(x=>[`第${zh(x)}个`,`the ${['','first','second','third','fourth'][x]}`]).slice(0,lvl>=4?3:2);
    return {type:'Short dialogue',lines,qs:[Q(`去${p}要在第几个路口拐？`,`At which crossing should he turn for ${pen}?`,c,ds,`到第${zh(n)}个路口: the ${['','first','second','third'][n]} crossing.`)]}}
  const c=[`往${dir[0]}拐`,`turn ${dir[1]}`];const o=dir[0]==='左'?['往右拐','turn right']:['往左拐','turn left'];
  return {type:'Short dialogue',lines,qs:[Q('到了路口应该怎么走？','What should he do at the crossing?',c,[o,['一直往前走','keep going straight']].concat(lvl>=4?[['往回走','go back']]:[]),`往${dir[0]}拐: turn ${dir[1]}.`)]}}
function gHotel(lvl){const p=pk([200,250,300,350,400]),n=2+ri(3);const t=p*n;const c=[`${t}元`,`${t} yuan`];const ds=pickDistinct([...new Set([p,t+p,t-p,p*(n+1),t+50,t-50])].filter(x=>x>0&&x!==t).map(x=>[`${x}元`,`${x} yuan`]),lvl>=4?3:2);
  return {type:'Short dialogue',lines:[['M',`你好，我想订一个房间，住${lz(n)}天。`],['W',`好的，一天${p}元，需要先付钱。`]],qs:[Q('男的一共要付多少钱？','How much will the man pay in total?',c,ds,`${p} yuan a night × ${n} nights = ${t} yuan.`)]}}
const EXCH=[['有点儿大','a bit big','小'],['有点儿小','a bit small','大']];
function gExchange(lvl){const e=pk(EXCH);const item=pk([['这件衣服','this top'],['这条裤子','these trousers'],['这双鞋','these shoes']]);
  return {type:'Short dialogue',lines:[['W',`${item[0]}${e[0]}，能换一下吗？`],['M',`可以，我给您拿${e[2]}一号的。`]],qs:[Q(`女的为什么要换${item[0].slice(2)}？`,`Why does she want to exchange ${item[1]}?`,[e[0],e[1]],[EXCH.find(x=>x!==e).slice(0,2),['颜色不好看','she doesn’t like the color'],['质量不好','poor quality']],`${e[0]}: it is ${e[1]}, so he fetches one size ${e[2]==='小'?'smaller':'bigger'}.`)]}}
const EVENTS2=[['足球比赛','the football match'],['运动会','the sports day'],['音乐节','the music festival']];
const DAYS2=[['星期六','Saturday'],['星期天','Sunday'],['下个星期','next week']];
function gPostpone(lvl){const [ev,een]=pk(EVENTS2);const w=pk([['大雨','heavy rain'],['大风','strong wind'],['大雪','heavy snow']]);const d2=pk(DAYS2);const askWhy=R()<0.5;
  const lines=[['W',`天气预报说明天有${w[0]}，${ev}推迟到${d2[0]}了。`],['M','那我们就${d2[0]}再去吧。'.replace('${d2[0]}',d2[0])]];
  return askWhy?{type:'Short dialogue',lines,qs:[Q(`${ev}为什么推迟了？`,`Why was ${een} postponed?`,[`明天有${w[0]}`,`${w[1]} tomorrow`],[['场地还没准备好','the venue isn’t ready'],['参加的人太少','too few people signed up'],['门票卖完了','tickets sold out']],`天气预报说明天有${w[0]}: ${w[1]} is forecast.`)]}
    :{type:'Short dialogue',lines,qs:[Q(`${ev}推迟到什么时候了？`,`When was ${een} moved to?`,d2,DAYS2.filter(x=>x!==d2).concat([['明天','tomorrow']]).slice(0,3),`推迟到${d2[0]}: postponed to ${d2[1]}.`)]}}
const SURVEYS=[[['大学生','university students'],[['每天运动','exercise every day'],['每周运动一两次','exercise once or twice a week'],['几乎不运动','hardly ever exercise']]],
 [['上班族','office workers'],[['用手机看新闻','read news on their phones'],['看电视了解新闻','watch the news on TV'],['看报纸','read newspapers']]],
 [['年轻人','young people'],[['周末喜欢待在家里','like staying home at weekends'],['周末喜欢出去玩','like going out at weekends'],['周末常常加班','often work at weekends']]],
 [['家长','parents'],[['支持孩子学乐器','support children learning an instrument'],['觉得应该自己选择','think children should choose'],['不太支持','are not very supportive']]]];
function gSurvey(lvl){const [g,opts]=pk(SURVEYS);const p1=pk([45,50,55,60,62,68]),p2=pk([20,25,28,30]);const p3=100-p1-p2;if(p3<=0)return null;
  const ord=shuf([0,1,2]);const ps=[p1,p2,p3];const say=ord.map((oi,k)=>`百分之${zh(ps[k])}的${k?'人':g[0]}${opts[oi][0]}`);
  const top=ord[0];
  return {type:'Passage',lines:[['W',`一项调查显示，${say[0]}，${say[1]}，其余的${g[0]}${opts[ord[2]][0]}。`]],qs:[Q(`根据调查，比例最高的是哪种${g[0]}？`,`According to the survey, which group of ${g[1]} is largest?`,[opts[top][0]+'的',`those who ${opts[top][1]}`],[[opts[ord[1]][0]+'的',`those who ${opts[ord[1]][1]}`],[opts[ord[2]][0]+'的',`those who ${opts[ord[2]][1]}`],['三种人一样多','all three are equal']],`${p1}% ${opts[top][1]}, the largest share (${p2}% and ${p3}% for the others).`)]}}
const BR_REASON=[['当地市场需求很大','strong local demand'],['那里的租金比较便宜','cheaper rent there'],['想吸引更多年轻顾客','to attract more young customers'],['当地政府提供了优惠政策','local government incentives']];
function gBranch(lvl){const city=pk(['成都','杭州','西安','武汉','重庆']);const n=pk([3,5,8,10]);const r=pk(BR_REASON);const when=pk([['明年','next year'],['今年下半年','later this year']]);
  return {type:'Passage',lines:[['W',`这家公司计划${when[0]}在${city}开${zh(n)}家新店，主要是因为${r[0]}。负责人表示，如果效果好，还会继续扩大规模。`]],qs:[Q('公司为什么要在那里开新店？','Why is the company opening new stores there?',r,BR_REASON.filter(x=>x!==r),`主要是因为${r[0]}: mainly ${r[1]}.`)]}}
const POLICIES=[['在地铁里禁止大声打电话','为乘客提供安静的环境','give passengers a quiet ride'],['对新能源汽车免费开放部分停车场','鼓励市民使用新能源汽车','encourage electric cars'],['延长图书馆的开放时间','方便上班族晚上读书','let office workers read in the evening'],['在老城区增加公交线路','缓解交通压力','ease traffic'],['对垃圾分类做得好的小区给予奖励','提高居民的环保意识','raise environmental awareness']];
function gPolicy(lvl){const city=pk(['本市','这座城市','北京','上海']);const p=pk(POLICIES);const others=pickDistinct(POLICIES.filter(x=>x!==p),3);
  return {type:'Passage',lines:[['W',`从下个月起，${city}将${p[0]}，目的是${p[1]}。这项措施公布以后，受到了很多市民的欢迎。`]],qs:[Q('这项措施的目的是什么？','What is the aim of the measure?',[p[1],p[2]],others.map(x=>[x[1],x[2]]),`目的是${p[1]}: to ${p[2]}.`)]}}
const PLAN_X={1:[gTime,gPrice,gWhere,gLike,gTransport,gBirthday,gGoWhere,gCount],2:[gBirthday,gGoWhere,gJob,gWeekday,gAge,gWeather,gPeople,gTime,gPrice,gCount],
  3:[gMeet,gRoute,gHotel,gJob,gTransport,gCompare,gChange,gDuration,gJudge,gAge],4:[gRoute,gHotel,gExchange,gPostpone,gDiscount,gReason,gPlan,gJudge,gCompare,gChange],
  5:[gPostpone,gSurvey,gBranch,gDiscount,gReason,gPlan,gPercent,gRevenue],6:[gSurvey,gBranch,gPolicy,gPercent,gRevenue,gPlan]};
const TARGET_X={1:100,2:100,3:100,4:100,5:95,6:95};
{const seen=new Set(listening.map(it=>it.lines.map(l=>l[1]).join('|')+'|'+it.qs[0].q));
 for(let l=1;l<=6;l++)listening.push(...makeBank(TARGET_X[l],PLAN_X[l],l,seen));}

/* HSKK additions */
{const have=new Set(sp.map(x=>x.lvl+'|'+x.text));const addU=(lvl,mode,text,en)=>{if(have.has(lvl+'|'+text))return;have.add(lvl+'|'+text);add(lvl,mode,text,en)};
 const list=(lvl,mode,str)=>str.split(';').forEach(s=>{const [a,b]=s.split('|');addU(lvl,mode,a.trim(),b.trim())});
 const cap=e=>e[0].toUpperCase()+e.slice(1);
 // Beginner repeat: remaining subject/time/place/activity combinations
 {const S=[['我','I',false],['他','he',true],['我们','we',false],['我朋友','my friend',true],['她','she',true]];
  const T=[['每天','every day'],['明天','tomorrow'],['周末','at the weekend']];
  const P={在家:'at home',在学校:'at school',在公园:'in the park'};
  const V=[['看书','read','reads',['在家','在学校','在公园']],['学习汉语','study Chinese','studies Chinese',['在家','在学校']],['跑步','go running','goes running',['在公园','在学校']],['喝茶','drink tea','drinks tea',['在家','在公园']],['听音乐','listen to music','listens to music',['在家','在公园']],['做饭','cook','cooks',['在家']]];
  const all=[];S.forEach(s=>T.forEach(t=>V.forEach(v=>v[3].forEach(p=>{const en=t[0]==='明天'?`${s[1]} will ${v[1]} ${P[p]} tomorrow.`:`${s[1]} ${s[2]?v[2]:v[1]} ${P[p]} ${t[1]}.`;all.push([`${s[0]}${t[0]}${p}${v[0]}。`,cap(en)])}))));
  shuf(all).forEach(x=>addU('Beginner','repeat',x[0],x[1]));
  const LS=[['我','I',false],['他','He',true],['她','She',true],['我妈妈','My mother',true],['我们老师','Our teacher',true]];
  const LX=[['吃饺子','eating dumplings'],['喝咖啡','drinking coffee'],['看电影','watching films'],['打篮球','playing basketball'],['唱歌','singing'],['去旅游','travelling'],['学汉语','learning Chinese'],['听中国音乐','listening to Chinese music']];
  LS.forEach(s=>LX.forEach(x=>addU('Beginner','repeat',`${s[0]}很喜欢${x[0]}。`,`${s[1]} ${s[2]?'likes':'like'} ${x[1]} a lot.`)));
  const BUY=[['个','苹果','apples'],['本','书','books'],['杯','咖啡','cups of coffee'],['张','电影票','film tickets'],['斤','水果','jin of fruit']];
  [2,3,4,5].forEach(n=>BUY.forEach(b=>addU('Beginner','repeat',`我想买${lz(n)}${b[0]}${b[1]}。`,`I would like to buy ${n} ${b[2]}.`)));
  list('Beginner','repeat','今天天气很好，我们去公园走走吧。|The weather is nice today, let’s go for a walk in the park.;今天太热了，我们在家看电视吧。|It’s too hot today, let’s watch TV at home.;下雨了，我们明天再去吧。|It’s raining, let’s go tomorrow instead.;外面很冷，你多穿点儿衣服。|It’s cold outside, wear more clothes.;我的手机没电了。|My phone has run out of battery.;你的汉语说得很好。|You speak Chinese very well.;这家饭馆的菜很好吃。|The food at this restaurant is very good.;我昨天晚上没睡好。|I didn’t sleep well last night.;请你再说一遍。|Please say it again.;我们一起去吃饭吧。|Let’s go and eat together.');
 }
 // Beginner answer: question templates
 '吃饺子|eating dumplings;喝咖啡|drinking coffee;看书|reading;打篮球|playing basketball;踢足球|playing football;看电视|watching TV;听音乐|listening to music;去公园|going to the park;下雪|snow;吃水果|eating fruit;唱歌|singing;旅游|travelling'.split(';').forEach(s=>{const [a,b]=s.split('|');addU('Beginner','answer',`你喜欢${a}吗？`,`Do you like ${b}?`)});
 '开车|drive;游泳|swim;做饭|cook;唱中文歌|sing Chinese songs;写汉字|write Chinese characters;骑自行车|ride a bike;打乒乓球|play table tennis;用筷子|use chopsticks'.split(';').forEach(s=>{const [a,b]=s.split('|');addU('Beginner','answer',`你会${a}吗？`,`Can you ${b}?`)});
 '商店|a shop;医院|a hospital;公园|a park;饭馆|a restaurant;地铁站|a subway station;银行|a bank;超市|a supermarket;学校|a school'.split(';').forEach(s=>{const [a,b]=s.split('|');addU('Beginner','answer',`你家附近有${a}吗？`,`Is there ${b} near your home?`)});
 list('Beginner','answer','你今天吃早饭了吗？|Did you have breakfast today?;你昨天做什么了？|What did you do yesterday?;你喜欢什么水果？|What fruit do you like?;你一般几点吃晚饭？|When do you usually have dinner?;你最喜欢的颜色是什么？|What is your favourite color?;你明天想做什么？|What do you want to do tomorrow?;你有几个好朋友？|How many good friends do you have?;你喜欢一个人吃饭吗？|Do you like eating alone?;你家离学校远吗？|Is your home far from school?;你现在住的地方大不大？|Is the place you live big?;你今天几点起床的？|What time did you get up today?;你喜欢春天还是秋天？|Spring or autumn?;你每天学习汉语多长时间？|How long do you study Chinese each day?;你觉得汉语难吗？|Do you think Chinese is hard?;你的生日快到了吗？|Is your birthday coming soon?');
 // Beginner talk
 list('Beginner','talk','请介绍一下你自己。|Introduce yourself.;请说说你的周末。|Describe your weekend.;你喜欢什么水果？为什么？|What fruit do you like, and why?;请介绍一下你的房间。|Describe your room.;你一般怎么去学校或者公司？|How do you usually get to school or work?;请说说你喜欢的一个电影。|Talk about a film you like.;你喜欢什么天气？为什么？|What weather do you like, and why?;请说说你的一个好朋友。|Talk about a good friend.;你昨天做了什么？|What did you do yesterday?;请介绍一下你家附近的地方。|Describe the area near your home.;你喜欢喝什么？为什么？|What do you like to drink, and why?;你学习汉语的时候觉得什么最难？|What is hardest for you when learning Chinese?;请说说你最喜欢的一个节日。|Talk about your favourite festival.;你想去哪个国家旅游？为什么？|Which country would you like to visit, and why?;请说说你的家人喜欢做什么。|What does your family like to do?;你喜欢早上还是晚上？为什么？|Do you prefer mornings or evenings, and why?;请介绍一下你喜欢的一家饭馆。|Describe a restaurant you like.;你平时怎么学习汉语？|How do you usually study Chinese?;你最喜欢穿什么颜色的衣服？|What color clothes do you like to wear?;请说说你明天的计划。|Talk about your plans for tomorrow.');
 // Intermediate repeat: more patterns
 {const CR=[['不下雨','it doesn’t rain'],['天气好','the weather is good'],['有时间','we have time'],['不太忙','we aren’t too busy'],['你也有空','you are free too'],['作业不多','there isn’t much homework']];
  const RR=[['去爬山','go hiking'],['去公园散步','go for a walk in the park'],['一起去看电影','go to a film together'],['去海边玩','go to the seaside'],['去朋友家玩','visit a friend'],['去超市买东西','go shopping at the supermarket']];
  CR.forEach(c=>RR.forEach(r=>addU('Intermediate','repeat',`如果明天${c[0]}，我们就${r[0]}。`,`If ${c[1]} tomorrow, we will ${r[1]}.`)));
  const PAIR=[['听音乐','做作业','listens to music while doing homework'],['喝咖啡','看报纸','reads the paper while drinking coffee'],['走路','打电话','talks on the phone while walking'],['吃饭','看电视','watches TV while eating'],['唱歌','跳舞','sings while dancing'],['做饭','听新闻','listens to the news while cooking'],['开车','听音乐','listens to music while driving'],['喝茶','聊天','chats while drinking tea']];
  [['他','He'],['我妹妹','My younger sister'],['我朋友','My friend'],['我爸爸','My father'],['她','She']].forEach(s=>PAIR.forEach(p=>addU('Intermediate','repeat',`${s[0]}一边${p[0]}，一边${p[1]}。`,`${s[1]} ${p[2]}.`)));
  const PLN=[['去北京旅游','travel to Beijing'],['搬家','move house'],['学开车','learn to drive'],['换一份工作','change jobs'],['回国看父母','go home to see my parents']];
  const PS=[['我','I','plan'],['他','He','plans'],['我姐姐','My sister','plans']];const PT=[['这个周末','this weekend'],['下个月','next month'],['明年','next year']];
  PS.forEach(s=>PT.forEach(t=>PLN.forEach(p=>addU('Intermediate','repeat',`${s[0]}打算${t[0]}${p[0]}。`,`${s[1]} ${s[2]} to ${p[1].replace('my parents',s[0]==='我'?'my parents':s[0]==='他'?'his parents':'her parents')} ${t[1]}.`))));
  list('Intermediate','repeat','因为昨天下大雨，所以比赛推迟了。|The match was postponed because of heavy rain yesterday.;因为他每天坚持练习，所以汉语进步得很快。|Because he practises every day, his Chinese improved quickly.;因为路上堵车，所以我迟到了十分钟。|I was ten minutes late because of traffic.;因为这家店的菜很便宜，所以每天都有很多人。|This restaurant is always busy because it is cheap.;因为明天要考试，所以今天晚上我得好好复习。|I have an exam tomorrow, so I must revise tonight.;因为天气太冷，所以我们没出去。|It was too cold, so we stayed in.;因为她很喜欢中国文化，所以决定来中国留学。|She loves Chinese culture, so she decided to study in China.;因为手机坏了，所以我没接到你的电话。|My phone broke, so I missed your call.;虽然他很年轻，但是工作经验很丰富。|Although he is young, he is very experienced.;虽然这个房子不大，但是很干净。|Although the flat isn’t big, it is very clean.;虽然汉字很难写，但是我觉得很有意思。|Characters are hard to write, but I find them interesting.;虽然我们很久没见面了，但是一直保持联系。|Although we haven’t met for ages, we keep in touch.;虽然考试没考好，但是他没有放弃。|He didn’t do well in the exam, but he didn’t give up.;请你把手机关了，好吗？|Could you turn off your phone, please?;请你把这封信交给王老师，好吗？|Could you give this letter to Teacher Wang, please?;请你把桌子上的东西收拾一下，好吗？|Could you tidy up the table, please?;我已经把作业做完了。|I have finished my homework.;他把钥匙忘在办公室了。|He left his keys in the office.;她把房间打扫得很干净。|She cleaned the room very well.;这家饭馆比那家便宜多了。|This restaurant is much cheaper than that one.;今年夏天比去年热多了。|This summer is much hotter than last year.;坐高铁比坐飞机方便多了。|The high-speed train is much more convenient than flying.;我的房间比你的小一点儿。|My room is a bit smaller than yours.;他跑得比我快多了。|He runs much faster than me.;我学汉语已经学了一年半了。|I have been learning Chinese for a year and a half.;我们在这儿等了半个小时了。|We have been waiting here for half an hour.;他每天都要跑五公里。|He runs five kilometres every day.;你最好早点儿去，不然会没有座位。|You’d better go early or there won’t be seats.;只要你努力，就一定能通过考试。|As long as you work hard, you will pass.;我不但喜欢看中国电影，而且喜欢听中国歌。|I like Chinese films and Chinese songs too.;这件事你最好先问问老师。|You’d better ask the teacher first.;你别着急，慢慢说。|Don’t worry, take your time.');
 }
 // Intermediate: pictures
 list('Intermediate','picture','一位老师在黑板上写字，学生们在认真听。|Picture: a teacher writing on the board while students listen carefully.;一家人在海边玩，孩子在堆沙子。|Picture: a family at the beach, a child is building a sandcastle.;一个人在雨中跑向公共汽车站。|Picture: someone running through the rain to a bus stop.;一个男孩在过马路，交通灯是红色的。|Picture: a boy crossing the road while the light is red.;几个人在公园里跳广场舞。|Picture: a group of people square-dancing in a park.;一个女孩坐在窗边看书，外面在下雪。|Picture: a girl reading by the window while it snows outside.;一个快递员在门口按门铃，手里拿着一个大箱子。|Picture: a delivery driver ringing a doorbell, holding a big box.;医院里很多人在排队挂号。|Picture: many people queuing to register at a hospital.;一个小孩在生日蛋糕前许愿。|Picture: a child making a wish in front of a birthday cake.;一个人在健身房里跑步，满头大汗。|Picture: someone running on a treadmill in a gym, dripping with sweat.;两个人在饭馆里为了谁付钱而争论。|Picture: two people in a restaurant arguing over who pays.;一个老人在帮小朋友过马路。|Picture: an old man helping a child cross the road.;一个人站在地图前，看起来迷路了。|Picture: someone standing in front of a map, looking lost.;一个学生在考试，看起来很紧张。|Picture: a student taking an exam, looking nervous.;一个女人在花店里买花。|Picture: a woman buying flowers in a florist.;两个孩子在吵架，妈妈在旁边劝他们。|Picture: two children quarrelling while their mother calms them.;一个男人在厨房里洗碗，碗很多。|Picture: a man washing a big pile of dishes in a kitchen.;一群年轻人在山顶上拍照。|Picture: a group of young people taking photos on a mountain top.;一个人在机场的行李转盘前等行李。|Picture: someone waiting at the baggage carousel in an airport.;一位顾客在超市收银台付钱，后面排着长队。|Picture: a customer paying at a supermarket checkout with a long queue behind.');
 // Intermediate: talk
 list('Intermediate','talk','你觉得一个人生活好还是和家人一起生活好？|Living alone or with family: which is better?;请谈谈你最喜欢的一种运动。|Talk about your favourite sport.;你平时怎么锻炼身体？|How do you keep fit?;你觉得上网课和去教室上课哪个更好？|Online classes or classroom classes?;请谈谈你第一次来中国或者第一次学汉语的经历。|Describe your first time in China or first Chinese lesson.;你觉得应该怎样和邻居相处？|How should you get along with neighbours?;你最喜欢的中国菜是什么？为什么？|What is your favourite Chinese dish, and why?;请谈谈你的家乡有什么特别的地方。|What is special about your hometown?;你觉得周末应该休息还是学习？|Should weekends be for rest or study?;请谈谈你买东西时最看重什么。|What matters most to you when shopping?;你觉得孩子应该从小学外语吗？|Should children learn a foreign language early?;请说说你遇到过的一次困难，你是怎么解决的。|Describe a difficulty you faced and how you solved it.;你喜欢什么样的天气？为什么？|What weather do you like, and why?;你觉得什么样的朋友是好朋友？|What makes a good friend?;请谈谈你最近学会的一件事。|Talk about something you learned recently.;你觉得手机会影响学习吗？|Do phones affect studying?;你觉得应该怎样节约用水？|How can we save water?;请谈谈你理想中的家。|Describe your ideal home.;你觉得旅游的时候跟团好还是自由行好？|Group tours or independent travel?;请介绍一下你们国家的一种传统食物。|Describe a traditional food from your country.;你一般怎么过春节或者新年？|How do you spend New Year?;你觉得早上运动好还是晚上运动好？|Exercise in the morning or the evening?;请谈谈你喜欢的一个季节。|Talk about a season you like.;你觉得学习汉语对你的工作有什么帮助？|How does Chinese help your work?;你觉得城市里应该多建公园吗？|Should cities build more parks?;请谈谈你小时候的梦想。|Talk about your childhood dream.;你平时喜欢在哪里学习？为什么？|Where do you like to study, and why?;你觉得网上的评价可以相信吗？|Can you trust online reviews?;请谈谈你最喜欢的一个老师。|Talk about your favourite teacher.;你怎么看待在网上交朋友？|What do you think of making friends online?');
 // Advanced: talk
 list('Advanced','talk','你认为人们为什么越来越重视健康饮食？|Why do people care more about healthy eating?;有人说“压力就是动力”，你同意吗？|“Pressure is motivation.” Do you agree?;你怎么看待大学生毕业后先旅行再工作？|Should graduates travel before working?;你认为城市应该限制私家车吗？|Should cities limit private cars?;谈谈你对“慢生活”的看法。|What do you think of “slow living”?;你认为网络购物对实体店有什么影响？|How does online shopping affect physical shops?;有人说“兴趣是最好的老师”，你怎么看？|“Interest is the best teacher.” Discuss.;你怎么看待年轻人频繁跳槽？|What do you think of young people changing jobs often?;你认为应该怎样培养孩子的阅读习惯？|How can we build children’s reading habits?;谈谈科技发展给老年人带来的困难。|What difficulties does technology create for the elderly?;你认为旅游业的发展对当地有什么利弊？|Pros and cons of tourism for local places?;有人认为考试不能反映真实能力，你同意吗？|Do exams fail to reflect real ability?;你怎么看待“断舍离”这种生活方式？|What do you think of decluttering as a lifestyle?;你认为外卖行业的发展带来了哪些问题？|What problems has food delivery brought?;谈谈你对团队合作的理解。|What does teamwork mean to you?;你认为应该怎样看待失败？|How should we view failure?;有人说“距离产生美”，你怎么看？|“Distance makes the heart grow fonder.” Discuss.;你认为城市和农村的教育差距应该怎样缩小？|How can the urban–rural education gap be narrowed?;你怎么看待人们在社交媒体上展示生活？|What do you think of showing your life on social media?;你认为一个国家的发展最需要什么？|What does a country need most to develop?;谈谈你对“工作和生活平衡”的看法。|What do you think about work–life balance?;你认为应该怎样减少浪费粮食？|How can we reduce food waste?;有人说“性格决定命运”，你同意吗？|“Character determines fate.” Do you agree?;你怎么看待越来越多的人养宠物？|What do you think of more people keeping pets?;你认为学历和能力哪个更重要？|Which matters more, qualifications or ability?;谈谈你对网络语言的看法。|What do you think of internet slang?;你认为应该怎样保护传统手工艺？|How should traditional crafts be protected?;有人说“读书改变命运”，你怎么看？|“Education changes destiny.” Discuss.;你怎么看待人们越来越晚结婚？|What do you think of people marrying later?;你认为人工智能会怎样改变教育？|How will AI change education?');
 // Advanced: read aloud
 [['我的爷爷是一位退休的老师。他每天早上六点起床，先去公园散步，然后回家看报纸。他常说，人老了不能停止学习。去年，他开始学用智能手机，现在不但会视频聊天，还会在网上买东西。看着他认真的样子，我觉得学习真的没有年龄限制。','Grandfather keeps learning.'],
  ['在城市里生活久了，很多人都想念乡村的安静。周末的时候，我喜欢开车去郊外，走一走田间的小路，看一看蓝天白云。虽然只有短短的两天，却能让我忘记工作的压力。回到城市以后，我又有了新的力气。','Weekends in the countryside.'],
  ['学习一门外语，最重要的是坚持。刚开始的时候，每个人都会遇到困难，比如听不懂、说不好。这时候，很多人选择了放弃。其实，只要每天花一点时间练习，慢慢地就会发现自己的进步。语言就像一颗种子，需要时间才能长大。','Learning a language takes persistence.'],
  ['我家楼下有一家小面馆，开了快二十年了。老板是一对老夫妻，每天天不亮就开始和面。他们的面条很筋道，汤也特别香。附近的居民都喜欢来这儿吃早饭。对我来说，这碗面已经不只是一顿饭，而是家的味道。','The noodle shop downstairs.'],
  ['手机让我们的生活变得更方便了。我们可以用它付钱、叫车、看新闻、和朋友聊天。可是，也有人整天低头看手机，忽视了身边的人。有一次，我和家人吃饭的时候，大家都在看手机，没有人说话。从那以后，我们约定吃饭的时候不用手机。','Phones at the dinner table.'],
  ['秋天是我最喜欢的季节。天气不冷也不热，天空又高又蓝。公园里的树叶变成了黄色和红色，风一吹，叶子就像蝴蝶一样飞下来。每到这个时候，我都会约上几个朋友，一起去爬山，拍照，享受秋天的美好。','Autumn, my favourite season.']].forEach(([a,b])=>addU('Advanced','read',a,b));
 // Advanced: retell
 [['小张很喜欢拍照，可是他一直觉得自己的照片不够好。有一天，他把照片发到网上，没想到很多人都很喜欢，还有一家杂志联系他，想用他的照片。小张这才明白，只要坚持做自己喜欢的事，总会有人欣赏。','A photographer finds an audience.'],
  ['一位年轻的妈妈发现，孩子总是不爱吃蔬菜。后来，她让孩子和她一起去菜市场买菜，回家后一起做饭。孩子自己做的菜，吃得特别香。妈妈说，让孩子参与，比强迫他吃更有效。','Getting a child to eat vegetables.'],
  ['有一家公司规定，员工每天下午可以休息十五分钟，喝喝茶、聊聊天。刚开始，有人担心这样会影响工作。可是几个月以后，大家发现工作效率反而提高了，员工也更愿意留在公司。','A company introduces afternoon breaks.'],
  ['小王第一次去外地出差，下了飞机才发现钱包丢了。正在着急的时候，机场的工作人员找到了他的钱包，里面的东西一样也没少。小王非常感动，回去以后专门写了一封感谢信。','A lost wallet at the airport.'],
  ['有个年轻人每天上班要坐一个小时的地铁。他觉得这段时间很浪费，于是开始在地铁上听英语课。一年以后，他的英语水平提高了很多，还因此得到了一个去国外工作的机会。','Using the commute to learn English.'],
  ['在一个小城市里，有一位老人开了一家免费的修车店，专门帮学生修自行车。他说，自己年轻的时候也很穷，得到过别人的帮助，现在想把这份温暖传下去。','An old man repairs students’ bikes for free.'],
  ['研究发现，经常和别人一起吃饭的人，心情往往更好。专家认为，吃饭的时候聊天，可以减轻压力，增进感情。因此，他们建议大家，无论工作多忙，每周都要和家人或朋友一起吃几顿饭。','Eating together improves mood.'],
  ['一家书店的生意越来越差。老板想了一个办法：把书店的一部分改成咖啡馆，还经常举办读书活动。没想到，来的人越来越多，书也卖得更好了。现在，这家书店成了年轻人周末最喜欢去的地方。','A bookshop adds a café.'],
  ['小李大学学的是计算机，但是他最喜欢的是做饭。毕业以后，他没有去公司上班，而是开了一个美食视频账号，教大家做家常菜。现在，他已经有了几十万粉丝，还出版了自己的菜谱。','A graduate becomes a cooking video creator.'],
  ['有一位老师发现，班上有个学生上课总是不说话。老师没有批评他，而是请他负责照顾班里的植物。慢慢地，这个学生变得开朗了，还主动在课上分享了自己养植物的经验。','A quiet student finds his voice.']].forEach(([a,b])=>addU('Advanced','retell',a,b));
}

/* HSKK additions, part 2 */
{const have=new Set(sp.map(x=>x.lvl+'|'+x.text));const addU=(lvl,mode,text,en)=>{if(have.has(lvl+'|'+text))return;have.add(lvl+'|'+text);add(lvl,mode,text,en)};
 // Beginner: going somewhere
 const S=[['我','I','am'],['他','He','is'],['我们','We','are'],['我朋友','My friend','is'],['她','She','is']];
 const T=[['明天','tomorrow'],['下午','this afternoon'],['周末','at the weekend']];
 const G=[['商店','the shop'],['医院','the hospital'],['北京','Beijing'],['朋友家','a friend’s home'],['学校','school'],['饭馆','a restaurant'],['火车站','the station']];
 S.forEach(s=>T.forEach(t=>G.forEach(g=>addU('Beginner','repeat',`${s[0]}${t[0]}要去${g[0]}。`,`${s[1]} ${s[2]} going to ${g[1]} ${t[1]}.`))));
 // Intermediate: in progress / duration
 const S2=[['我','I','am','have'],['他','He','is','has'],['我妈妈','My mother','is','has'],['我们','We','are','have'],['她','She','is','has']];
 const V2=[['做饭','cooking'],['看书','reading'],['打电话','on the phone'],['开会','in a meeting'],['写作业','doing homework'],['洗衣服','doing the laundry'],['睡觉','sleeping'],['上课','in class']];
 S2.forEach(s=>V2.forEach(v=>addU('Intermediate','repeat',`${s[0]}正在${v[0]}呢，等一会儿再说吧。`,`${s[1]} ${s[2]} ${v[1]} right now, let’s talk a bit later.`)));
 const D2=[['在中国住','lived in China'],['学汉语','studied Chinese'],['在这家公司工作','worked at this company']];
 S2.forEach(s=>D2.forEach(d=>[2,3,5].forEach(n=>addU('Intermediate','repeat',`${s[0]}${d[0]}了${lz(n)}年了。`,`${s[1]} ${s[3]} ${d[1]} for ${n} years.`))));
}

/* ================= PRONUNCIATION BANK (needs the word list) ================= */
const INITIALS=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
function splitPy(py){const base=py.normalize('NFD').replace(/[̄́̌̀]/g,'').normalize('NFC').toLowerCase();const ini=INITIALS.find(i=>base.startsWith(i))||'';return {base,ini,fin:base.slice(ini.length)}}
const CONTRAST=[['z','zh','ini','z vs zh: tongue flat behind the teeth vs curled back'],['c','ch','ini','c vs ch'],['s','sh','ini','s vs sh'],['n','l','ini','n vs l'],['f','h','ini','f vs h'],['r','l','ini','r vs l'],['j','zh','ini','j vs zh'],['q','ch','ini','q vs ch'],['x','sh','ini','x vs sh'],
 ['en','eng','fin','en vs eng: front vs back nasal'],['in','ing','fin','in vs ing'],['an','ang','fin','an vs ang'],['ian','iang','fin','ian vs iang']];
function buildPron(VOCAB){
  const singles=[];const seen=new Set();
  VOCAB.slice(0,4).forEach((l,li)=>l.forEach(w=>{if([...w[0]].length===1&&!w[1].includes(' ')&&toneOf(w[1])&&!/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(w[1])&&!seen.has(w[0])){seen.add(w[0]);singles.push({h:w[0],py:w[1],en:w[2],t:toneOf(w[1]),...splitPy(w[1])})}}));
  const pairs=[];const pseen=new Set();
  for(const [a,b,kind,label] of CONTRAST){
    for(const x of singles){
      let mate=null;
      if(kind==='ini'&&x.ini===a){mate=singles.find(y=>y.ini===b&&y.fin===x.fin&&y.t===x.t)||singles.find(y=>y.ini===b&&y.fin===x.fin)}
      if(kind==='fin'&&x.fin===a){mate=singles.find(y=>y.fin===b&&y.ini===x.ini&&y.t===x.t)||singles.find(y=>y.fin===b&&y.ini===x.ini)}
      if(!mate)continue;const k=x.h+mate.h;if(pseen.has(k))continue;pseen.add(k);
      pairs.push({kind:'pair',label,a:[x.h,x.py,x.en],b:[mate.h,mate.py,mate.en]});
    }
  }
  // tone changes
  const sandhi=[];
  VOCAB.slice(0,4).forEach(l=>l.forEach(w=>{const n=[...w[0]].length;if(n<2||n>4||/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(w[1]))return;const e=expectedTones(w[1],w[0]);if(!e)return;const dict=e.syl.map(toneOf);
    const changed=e.tones.some((t,i)=>t&&t!==dict[i]);const neutral=dict.includes(0)&&dict.some(Boolean);
    if(!changed&&!neutral)return;
    let rule;if(w[0].includes('一')&&changed)rule='一 changes: yí before a 4th tone, yì before tones 1–3.';else if(w[0].includes('不')&&changed)rule='不 becomes bú before a 4th tone.';else if(changed)rule='Two 3rd tones in a row: the first is said as a 2nd tone.';else rule='Neutral tone: the unmarked syllable is short and light.';
    const spoken=e.syl.map((s,i)=>e.tones[i]!==dict[i]?retone(s,e.tones[i]):s).join(' ');
    sandhi.push({kind:changed?'sandhi':'neutral',h:w[0],py:w[1],en:w[2],spoken,rule,tones:e.tones,dict})}));
  return {pairs,sandhi};
}

window.HSK_BANKS={listening,speaking:sp,buildPron};
})();
