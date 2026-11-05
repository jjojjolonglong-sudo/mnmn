/* mvtape.v1.js — 비디오테이프(VHS) 그림. mvmv와 fsfs가 같이 써요: 여기만 고치면 두 앱에 같이 반영돼요.
   사용: MvTape.html(영화행{id,name,c1..c4}, {on:true, attrs:'data-id="1"'})
   크기는 바깥 요소의 CSS 변수로 정해요: --th(높이) --tw(폭) --sl(제목 길이) */
(function(){
if(window.MvTape)return;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css=`.mvt-sk{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--s);border:1px solid #0007;box-shadow:inset 0 0 5px #0004,inset 6px 0 6px -6px #fff8;overflow:hidden}
.mvt-st{flex:1;min-height:0;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;font:bold 13px var(--se,'Do Hyeon','Gowun Dodum',sans-serif);color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:3px 0}
.mvt-lg{flex:none;height:15px;background:var(--l);color:#fff;font:bold 6px/15px var(--px,'Press Start 2P',monospace);text-align:center}
.mvtp.d1 .mvt-sk{border-top:6px solid var(--a)}.mvtp.d2 .mvt-sk{box-shadow:inset 0 6px 0 var(--a),inset 0 9px 0 var(--s),inset 0 12px 0 var(--b)}.mvtp.d3 .mvt-sk{background:linear-gradient(90deg,#fff3,#0000 45%,#0003),var(--s)}
.mvtp{width:var(--tw,29px);height:var(--th,170px);flex:none;position:relative;background:linear-gradient(90deg,#fff3,#0000 14%,#0000 84%,#0006),var(--p);border-radius:2px;border:1px solid #000c;box-shadow:inset 0 0 0 1px #ffffff22,0 3px 4px #000a;cursor:pointer;transition:.15s}
.mvtp::before{content:'';position:absolute;left:0;right:0;top:12.8%;height:1px;background:#000a;box-shadow:0 1px 0 #fff3}
.mvtp::after{content:'';position:absolute;left:0;right:0;bottom:2.4%;height:1px;background:#0009;box-shadow:0 1px 0 #fff2}
.mvt-sm{position:absolute;left:50%;top:0;height:12.8%;width:1px;margin-left:-.5px;background:#000b;box-shadow:1px 0 0 #fff3}
.mvt-rc{position:absolute;left:2px;right:2px;top:14.5%;bottom:4.6%;display:flex;padding:2px;background:#0002;border:1px solid #0009;border-radius:3px;box-shadow:inset 0 1px 2px #000a,0 1px 0 #ffffff33}
.mvt-rc .mvt-sk{flex:1;min-width:0}
.mvtp.on{transform:translateY(-8px);box-shadow:inset 0 0 0 1px #ffffff22,0 8px 8px #000d}
.mvt-nt{position:absolute;right:3px;top:calc(var(--th,170px)*.055);width:41%;height:calc(var(--th,170px)*.065);border:1px solid #000b;border-radius:1px;box-shadow:0 1px 0 #ffffff40,inset 0 1px 0 #ffffff24}
.mvtp.d2 .mvt-st{padding-top:14px}.mvt-tcy{text-combine-upright:all}`;
const st=document.createElement('style');st.id='mvtape-css';st.textContent=css;document.head.appendChild(st);
const hs=t=>[...String(t)].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7),hx=h=>{h=String(h||'#888888');if(h.length==4)h='#'+[...h.slice(1)].map(c=>c+c).join('');return[1,3,5].map(i=>parseInt(h.substr(i,2),16))},rgb=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join(''),mix=(h,t,k)=>rgb(hx(h).map((v,i)=>v+(t[i]-v)*k)),tint=(h,k)=>mix(h,[255,255,255],k),shade=(h,k)=>mix(h,[0,0,0],k),
lm=h=>{const[r,g,b]=hx(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b},cr=(a,b)=>{const x=lm(a),y=lm(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const html=(m,o)=>{o=o||{};const h=Math.abs(hs(m.id)),pl=[m.c1||'#2a2a3a',m.c2||'#ff2e97',m.c3||'#25e8ff',m.c4||(lm(m.c1||'#2a2a3a')>.35?'#15151b':'#f1ecdc')],neutral=h%10<3,bi=(h>>4)%4,
body=neutral?['#18181b','#30343a','#8e9298','#3c4c5c'][(h>>8)%4]:pl[bi],rest=[0,1,2,3].filter(i=>neutral||i!=bi),good=rest.filter(i=>cr(pl[i],body)>=1.4),pool=good.length?good:rest,si=pool[(h>>10)%pool.length],sk=pl[si],oth=[0,1,2,3].filter(i=>i!=si),
l=pl[oth[(h>>13)%3]],a=pl[oth[(h>>15)%3]],b=pl[oth[(h>>17)%3]],v=(h>>3)%4,
tc=[0,1,2,3].filter(i=>i!=si&&(neutral||i!=bi)).map(i=>pl[i]).sort((x,y)=>cr(y,sk)-cr(x,sk))[0],tx=(h>>19)%10>=3&&tc&&cr(tc,sk)>=3?tc:(cr(sk,'#111111')>=cr(sk,'#ffffff')?'#111':'#fff'),
ch=[...String(m.name)],nm=ch.slice(0,8).join('')+(ch.length>8?'…':''),N=Math.max(1,[...nm].reduce((x,c)=>x+(/[\x00-\x7f]/.test(c)?.55:1),0));
return`<div class="mvtp d${v} ${o.on?'on':''}" ${o.attrs||''} style="--a:${a};--b:${b};--p:${body};--s:${sk};--t:${tx};--l:${l}"><i class="mvt-nt"></i><i class="mvt-sm"></i><div class="mvt-rc"><div class="mvt-sk"><span class="mvt-st" style="font-size:min(14px,calc(var(--sl)/${N}))">${E(nm).replace(/\d+/g,d=>d.length==1?`<span class="mvt-tcy">${d}</span>`:d)}</span><b class="mvt-lg">VHS</b></div></div></div>`};
window.MvTape={html,size:th=>({'--th':th+'px','--tw':Math.round(th/5.8)+'px','--sl':Math.round(th*.62)+'px'})};
})();
