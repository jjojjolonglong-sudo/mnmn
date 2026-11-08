/* mvtape.v1.js — 비디오테이프(VHS) 그림. mvmv와 fsfs가 같이 써요: 여기만 고치면 두 앱에 같이 반영돼요.
   사용: MvTape.html(영화행{id,name,c1..c4,release}, {on:true, attrs:'data-id="1"', img:'배우 썸네일 주소'})
   크기는 바깥 요소의 CSS 변수로 정해요: --th(높이) --tw(폭) --sl(제목 길이)
   2026-11-08 개편
   - 본체 색: 영화 색 4개 중 가장 선명한(채도 높은) 색. 무채색 본체는 없음
   - 윗부분: 라벨 위 본체 칸을 길게(높이의 21%). 가운데 세로선 오른쪽 아래(라벨 바로 위)에 각진 네모 창, 창의 왼쪽 변이 세로선과 딱 겹침(폭이 달라도 유지)
   - 라벨: 띠 장식(굵기 여러 가지)·세로 면(반반 또는 가운데 대칭) 중 하나, 광택 없음, 일부는 배우 썸네일(o.img), 일부는 아래에 개봉 연도(VHS 글자 대신)
   - 모든 선택은 영화 id로 정해져서, 같은 영화는 늘 같은 모양이에요 */
(function(){
if(window.MvTape)return;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css=`.mvtp{width:var(--tw,29px);height:var(--th,170px);flex:none;position:relative;background:linear-gradient(90deg,#fff3,#0000 14%,#0000 84%,#0006),var(--p);border-radius:2px;border:1px solid #000c;box-shadow:inset 0 0 0 1px #ffffff22,0 3px 4px #000a;cursor:pointer;transition:.15s}
.mvtp.on{transform:translateY(-8px);box-shadow:inset 0 0 0 1px #ffffff22,0 8px 8px #000d}
.mvtp::before{content:'';position:absolute;left:0;right:0;top:21%;height:1px;background:#000a;box-shadow:0 1px 0 #fff3}
.mvtp::after{content:'';position:absolute;left:0;right:0;bottom:2.4%;height:1px;background:#0009;box-shadow:0 1px 0 #fff2}
.mvt-tp{position:absolute;left:0;right:0;top:0;height:21%;display:flex}
.mvt-tl{flex:1;border-right:1px solid #000b}
.mvt-tr{flex:1;margin-left:-1px;padding:0 3px calc(var(--th,170px)*.014) 0;display:flex;flex-direction:column;justify-content:flex-end}
.mvt-nt{display:block;height:calc(var(--th,170px)*.065);border:1px solid #000b;border-radius:0;box-shadow:0 1px 0 #ffffff40,inset 0 1px 0 #ffffff24}
.mvt-rc{position:absolute;left:2px;right:2px;top:23%;bottom:4.6%;display:flex;padding:2px;background:#0002;border:1px solid #0009;border-radius:3px;box-shadow:inset 0 1px 2px #000a,0 1px 0 #ffffff33}
.mvt-sk{flex:1;min-width:0;min-height:0;position:relative;display:flex;flex-direction:column;background:var(--s);border:1px solid #0007;box-shadow:inset 0 0 4px #0003;overflow:hidden}
.mvt-bd{flex:none;display:block;position:relative}
.mvt-sd{position:absolute;top:0;bottom:0;left:0;width:50%}.mvt-sd.c{left:28%;width:44%}
.mvt-ph{flex:none;display:block;position:relative;height:calc(var(--tw,29px) - 14px);background:#0003 center/cover no-repeat}
.mvt-st{flex:1;min-height:0;position:relative;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;font:bold 13px var(--se,'Do Hyeon','Gowun Dodum',sans-serif);color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:3px 0}
.mvt-yr{flex:none;position:relative;background:var(--l);color:var(--lt);font:bold min(8px,calc((var(--tw,29px) - 12px)/2.4))/1 var(--se,'Do Hyeon',sans-serif);text-align:center;padding:3px 0;letter-spacing:.2px}
.mvt-tcy{text-combine-upright:all}`;
const st=document.createElement('style');st.id='mvtape-css';st.textContent=css;document.head.appendChild(st);
const hs=t=>{let a=[...String(t)].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7);a^=a>>>16;a=Math.imul(a,0x85ebca6b);a^=a>>>13;a=Math.imul(a,0xc2b2ae35);a^=a>>>16;return a&0x7fffffff},hx=h=>{h=String(h||'#888888');if(h.length==4)h='#'+[...h.slice(1)].map(c=>c+c).join('');return[1,3,5].map(i=>parseInt(h.substr(i,2),16)||0)},
lm=h=>{const[r,g,b]=hx(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b},cr=(a,b)=>{const x=lm(a),y=lm(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)},
vivid=h=>{const[r,g,b]=hx(h).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;return(mx-mn)*(1-Math.abs(l-.5)*.6)};   // 선명함 = 채도(너무 밝거나 어두우면 조금 깎음)
const ink=bg=>cr(bg,'#111111')>=cr(bg,'#ffffff')?'#111':'#fff';
const html=(m,o)=>{o=o||{};const h=hs(m.id),bit=(s,n)=>(h>>>s)%n;
const pl=[m.c1||'#2a2a3a',m.c2||'#ff2e97',m.c3||'#25e8ff',m.c4||'#f1ecdc'];
/* 본체 = 가장 선명한 색 */
const bi=[0,1,2,3].sort((x,y)=>vivid(pl[y])-vivid(pl[x])||x-y)[0],body=pl[bi];
/* 라벨지 = 본체와 구분되는 나머지 색 중 하나 (없으면 크림/먹색) */
const rest=[0,1,2,3].filter(i=>i!=bi),good=rest.filter(i=>cr(pl[i],body)>=1.4);
const si=good.length?good[bit(10,good.length)]:-1,sk=si>=0?pl[si]:(lm(body)>.3?'#15151b':'#f1ecdc');
/* 장식 색 = 라벨지와 구분되는 색 (본체 포함) */
const dc=[0,1,2,3].filter(i=>i!=si).map(i=>pl[i]).filter(c=>cr(c,sk)>=1.3),acc=dc.length?dc:[ink(sk)];
const a=acc[bit(13,acc.length)],b=acc[bit(15,acc.length)],l=acc[bit(17,acc.length)];
const tc=dc.slice().sort((x,y)=>cr(y,sk)-cr(x,sk))[0],tx=bit(19,10)>=3&&tc&&cr(tc,sk)>=3?tc:ink(sk);
/* 라벨 장식: 0 없음 · 1 위 띠 · 2 위 띠 두 줄 · 3 위아래 가는 띠 · 4 세로 면(라벨색과 가장 비슷한 색, 왼쪽 절반 또는 가운데 대칭, 맨 뒤에 깔림) */
const v=bit(3,5),t1=3+bit(21,10),t2=2+bit(23,4),t3=2+bit(25,4);
const cd=(x,y)=>{const[p,q]=[hx(x),hx(y)],r=(p[0]+q[0])/2,d=p.map((v,i)=>v-q[i]);return Math.sqrt((2+r/256)*d[0]*d[0]+4*d[1]*d[1]+(2+(255-r)/256)*d[2]*d[2])};   /* 눈으로 본 색 차이(대략) */
const near=pl.filter((c,i)=>i!=si&&cd(c,sk)>40).sort((x,y)=>cd(x,sk)-cd(y,sk))[0]||(lm(sk)>.5?'#0000001f':'#ffffff26');
const band=(px,c)=>`<i class="mvt-bd" style="height:${px}px;background:${c}"></i>`,gap=px=>`<i class="mvt-bd" style="height:${px}px"></i>`;
let top='',bot='',over='';
if(v==1)top=band(t1,a);
else if(v==2)top=band(t1,a)+gap(2)+band(t2,b);
else if(v==3){top=band(t2,a);bot=band(t3,b)}
else if(v==4)over=`<i class="mvt-sd${bit(21,2)?' c':''}" style="background:${near}"></i>`;
/* 배우 썸네일: 있으면 10개 중 4개꼴 · 연도: 10개 중 5개꼴 */
const ph=o.img&&bit(5,10)<4?`<i class="mvt-ph" style="background-image:url('${E(o.img)}')"></i>`:'';
const yr=String(o.year||m.release||m.year||'').slice(0,4),ys=/^\d{4}$/.test(yr)&&bit(7,10)<5?`<b class="mvt-yr">${yr}</b>`:'';
const ch=[...String(m.name||'')],nm=ch.slice(0,8).join('')+(ch.length>8?'…':''),N=Math.max(1,[...nm].reduce((x,c)=>x+(/[\x00-\x7f]/.test(c)?.55:1),0));
const F=(1-(ph?.32:0)-(ys?.1:0)-(top?.08:0)-(bot?.04:0)).toFixed(2);
return`<div class="mvtp ${o.on?'on':''}" ${o.attrs||''} style="--a:${a};--b:${b};--p:${body};--s:${sk};--t:${tx};--l:${l};--lt:${ink(l)}"><div class="mvt-tp"><i class="mvt-tl"></i><div class="mvt-tr"><i class="mvt-nt"></i></div></div><div class="mvt-rc"><div class="mvt-sk">${over}${top}${ph}<span class="mvt-st" style="font-size:min(14px,calc(var(--sl)*${F}/${N}))">${E(nm).replace(/\d+/g,d=>d.length==1?`<span class="mvt-tcy">${d}</span>`:d)}</span>${bot}${ys}</div></div></div>`};
window.MvTape={html,size:th=>({'--th':th+'px','--tw':Math.round(th/5.8)+'px','--sl':Math.round(th*.62)+'px'})};
})();
