/* Pre-generated neural voice clips (public/audio/*.mp3), made once by tools/gen_audio.py.
   File name = FNV-1a 64-bit hash of "<speaker>|<text>", so the page and the generator agree without a manifest.
   If a clip is missing, callers fall back to the device's built-in voice. */
(function(){
  const OFF=0xcbf29ce484222325n,PRIME=0x100000001b3n,MASK=0xffffffffffffffffn;
  function fnv(str){let h=OFF;for(const b of new TextEncoder().encode(str)){h^=BigInt(b);h=(h*PRIME)&MASK}return h.toString(16).padStart(16,'0')}
  const missing=new Set();let cur=null;
  function clipUrl(text,speaker){return 'audio/'+fnv((speaker||'W')+'|'+text)+'.mp3'}
  function stopClip(){if(cur){const a=cur;cur=null;try{a.pause()}catch(e){}if(a._done)a._done('stopped')}}
  // resolves 'ended' when played through, 'missing' if there is no clip, 'stopped' if interrupted
  function playClip(text,{speaker='W',rate=1}={}){
    stopClip();
    const url=clipUrl(text,speaker);
    if(missing.has(url))return Promise.resolve('missing');
    return new Promise(res=>{
      const a=new Audio();let started=false,settled=false;
      const done=r=>{if(settled)return;settled=true;if(cur===a)cur=null;res(r)};
      a._done=done;cur=a;
      a.preload='auto';a.playbackRate=rate;a.preservesPitch=true;
      a.onplaying=()=>{started=true};
      a.onended=()=>done('ended');
      a.onerror=()=>{if(!started){missing.add(url);done('missing')}else done('ended')};
      a.src=url;
      const p=a.play();if(p&&p.catch)p.catch(err=>{if(err&&err.name==='NotAllowedError')done('missing');else if(!started&&a.error){missing.add(url);done('missing')}});
    });
  }
  // map the old speech-synthesis rates (0.6–0.95) onto gentle playback speeds for natural clips
  const playbackFor=r=>Math.max(0.85,Math.min(1.05,0.55+(r||0.85)*0.5));
  window.HSKAudio={playClip,stopClip,clipUrl,playbackFor,fnv};
})();
