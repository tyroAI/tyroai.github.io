import{i as e,t}from"./react-DB-4Zxce.js";import{t as n}from"./jsx-runtime-BtH0gOTJ.js";var r=e(t(),1),i=[[`neutral`,`Nötr`,`Buradayım. Hazır olduğunda başlayabiliriz.`],[`attentive`,`Dikkatli`,`Tüm dikkatim sende.`],[`happy`,`Mutlu`,`Güzel bir sonuç.`],[`excited`,`Heyecanlı`,`Yeni bir şeye başlayalım.`],[`curious`,`Meraklı`,`Biraz daha yakından bakalım.`],[`thinking`,`Düşünceli`,`Olasılıkları değerlendiriyorum.`],[`surprised`,`Şaşkın`,`Bu beklenmedik bir gelişme.`],[`sad`,`Üzgün`,`Bir şeyler yolunda gitmedi.`],[`determined`,`Kararlı`,`Çözümü birlikte bulacağız.`],[`wink`,`Göz kırp`,`Anlaştık.`],[`sleepy`,`Uykulu`,`Biraz yavaşlayalım.`],[`sleeping`,`Uyuyor`,`İhtiyacın olduğunda buradayım.`],[`listening`,`Dinliyor`,`Seni dinliyorum.`],[`processing`,`Düşünüyor`,`Verileri bir araya getiriyorum.`],[`speaking`,`Konuşuyor`,`Bulgularımı paylaşıyorum.`]];function a(e=`neutral`,t=`currentColor`){let n=(e,t,n,r)=>`<rect x="${e}" y="${t}" width="${n}" height="${r}" rx="${n/2}"/>`,r=e=>`<path d="${e}" fill="none" stroke="${t}" stroke-width="12" stroke-linecap="round"/>`,i;switch(e){case`happy`:i=r(`M171 247 Q186 218 201 247 M239 247 Q254 218 269 247`);break;case`excited`:i=n(169,212,32,59)+n(239,212,32,59);break;case`curious`:i=n(171,212,29,54)+n(241,228,25,34);break;case`thinking`:case`processing`:i=n(171,242,29,12)+n(240,218,29,44);break;case`surprised`:i=`<circle cx="186" cy="240" r="19"/><circle cx="254" cy="240" r="19"/>`;break;case`sad`:i=`<path d="M170 231 L201 215 V252 Q201 267 185 267 Q170 267 170 252Z M239 215 L270 231 V252 Q270 267 254 267 Q239 267 239 252Z"/>`;break;case`determined`:i=`<path d="M170 218 L201 234 V251 Q201 265 185 265 Q170 265 170 251Z M239 234 L270 218 V251 Q270 265 254 265 Q239 265 239 251Z"/>`;break;case`wink`:i=n(171,217,29,47)+r(`M240 244 Q254 236 269 244`);break;case`sleepy`:i=n(171,244,29,10)+n(240,244,29,10);break;case`sleeping`:i=r(`M173 240 Q186 250 199 240 M241 240 Q254 250 267 240`);break;case`attentive`:case`listening`:i=n(172,212,27,56)+n(241,212,27,56);break;default:i=n(171,220,29,44)+n(240,220,29,44)}return`<g fill="${t}">${i}</g>`}var o=[[`insta`,`Insta`,[`#ffd65b`,`#f34c9b`,`#8534ba`]],[`ocean-breeze`,`Ocean Breeze`,[`#24c6f2`,`#12aedd`,`#06bea7`]],[`ocean-breeze-v2`,`Ocean Breeze v2`,[`#007aaa`,`#00b8dd`,`#36cddd`]],[`arctic-mint`,`Arctic Mint`,[`#245eff`,`#12cbbb`,`#a0f5cf`]],[`rose-blush`,`Rose Blush`,[`#8e063d`,`#ed668e`,`#ffc0c8`]],[`peach-sorbet`,`Peach Sorbet`,[`#ff7852`,`#ffb0a2`,`#d890f0`]],[`sunset`,`Sunset Gradient`,[`#ff7900`,`#ffb900`,`#ffe32a`]],[`pastel-lavender`,`Pastel Lavender`,[`#6640a5`,`#9970cb`,`#c5a3e5`]],[`green-garden`,`Green Garden`,[`#355622`,`#6d913b`,`#b3ca7c`]],[`fiery-red`,`Fiery Red`,[`#751b10`,`#ee4c13`,`#ffab0c`]],[`chocolate`,`Chocolate Delight`,[`#29100b`,`#783719`,`#c77812`]],[`midnight`,`Midnight`,[`#17263f`,`#516582`,`#b1c7e9`]]],s=[[`greeting`,`Selamlıyor`,`Hafifçe yükselir, başını eğip selam verir.`,`happy`],[`idle`,`Idle`,`Sakin bir nefes, hafif süzülme.`,`neutral`],[`thinking`,`Düşünüyor`,`İç ışık döner, bakış yukarı kayar.`,`thinking`],[`speaking`,`Konuşuyor`,`Gözler ve küre konuşma ritmiyle hareket eder.`,`neutral`],[`orbiting`,`Yörüngede`,`Işık kürenin çevresinde dolaşır.`,`curious`],[`listening`,`Dinliyor`,`Hafifçe yaklaşır, dikkatle dinler.`,`attentive`],[`logging-in`,`Giriş yapıyor`,`Işık halkası bağlantıyı kurar.`,`attentive`],[`searching`,`Araştırıyor`,`Bakış iki yana tarar, ışık takip eder.`,`curious`],[`planning`,`Planlıyor`,`Üç adımlı, ölçülü bir düşünme ritmi.`,`thinking`],[`working`,`Çalışıyor`,`Kararlı bir ritimle işine odaklanır.`,`determined`],[`syncing`,`Senkronize`,`İki ışık akışı birbirini yakalar.`,`neutral`],[`waiting`,`Onay bekliyor`,`Hafifçe yana eğilir ve bekler.`,`curious`],[`success`,`Tamamlandı`,`Kısa bir sevinç hareketi, ardından sakinleşir.`,`happy`],[`error`,`Sorun oluştu`,`Kısa bir baş hareketiyle sorunu bildirir.`,`sad`],[`sleeping`,`Uyku`,`Hareketler yavaşlar, gözler kapanır.`,`sleeping`],[`thumbs-up`,`Thumbs up`,`Aksiyon başarıyla tamamlandı.`,`happy`],[`thumbs-down`,`Thumbs down`,`Aksiyon tamamlanamadı.`,`sad`]],c=e=>/^#[a-f0-9]{6}$/i.test(e||``),l=(e,t,n)=>`#`+[1,3,5].map(r=>Math.round(parseInt(e.slice(r,r+2),16)*(1-n)+parseInt(t.slice(r,r+2),16)*n).toString(16).padStart(2,`0`)).join(``);function u(e,t){let n=e=>`<circle cx="${e}" cy="242" r="32" fill="#ffffff" fill-opacity=".13" stroke="${t}" stroke-width="7"/>`;return`<g id="${e}" fill="none" stroke-linecap="round">${n(185.5)}${n(254.5)}
 <path d="M216 236Q220 228 224 236" stroke="${t}" stroke-width="6"/>
 <path d="M154 234L117 222M286 234L323 222" stroke="${t}" stroke-width="6" opacity=".8"/>
 <path d="M164 226Q170 215 182 212M233 226Q239 215 251 212" stroke="#ffffff" stroke-width="4" opacity=".55"/></g>`}function d(e,t,{b:n,c:r,deep:i,light:a}){if(!t)return``;let o=[];if(t.hat===`party`){let t=l(n,i,.5),a=l(n,i,.3);o.push(`<g transform="rotate(20 238 70)">
 <ellipse cx="238" cy="78" rx="56" ry="11" fill="${i}" opacity=".42" filter="url(#${e(`soft`)})"/>
 <path d="${f}" fill="url(#${e(`hat-fill`)})"/>
 <g clip-path="url(#${e(`hat-clip`)})" fill="none">
  <path d="M150 50Q238 74 326 50" stroke="${n}" stroke-width="14"/>
  <path d="M150 20Q238 42 326 20" stroke="${a}" stroke-width="12"/>
  <path d="M150-8Q238 12 326-8" stroke="${n}" stroke-width="11"/>
  <path d="M150-34Q238-16 326-34" stroke="${a}" stroke-width="10"/>
  <circle cx="226" cy="40" r="3" fill="#ffffff" opacity=".9"/><circle cx="252" cy="8" r="2.6" fill="#ffffff" opacity=".9"/><circle cx="232" cy="-22" r="2.2" fill="#ffffff" opacity=".9"/><circle cx="214" cy="12" r="2.2" fill="#f6c54a"/><circle cx="262" cy="44" r="2.4" fill="#f6c54a"/>
  <rect x="150" y="-80" width="180" height="170" fill="url(#${e(`hat-shade`)})"/>
 </g>
 <path d="${f}" fill="none" stroke="${t}" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M190 69Q238 87 286 69" fill="none" stroke="${l(r,`#ffffff`,.5)}" stroke-width="12" stroke-linecap="round"/>
 <path d="M190 68Q238 86 286 68" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-dasharray=".1 12.5"/>
 <path d="M196 65Q238 80 280 65" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".9"/>
 <g transform="translate(238 -58)">
  <circle r="16" fill="${l(r,`#ffffff`,.45)}"/>
  <circle cx="-3" cy="-3" r="12.5" fill="#ffffff"/>
  <circle cx="9" cy="-8" r="6" fill="#ffffff"/><circle cx="-12" cy="4" r="6" fill="#ffffff"/><circle cx="7" cy="9" r="6" fill="${l(r,`#ffffff`,.65)}"/><circle cx="-6" cy="-12" r="5" fill="#ffffff"/>
  <circle cx="-5" cy="-6" r="4" fill="#ffffff" opacity=".9"/>
 </g>
 </g>`)}else if(t.hat===`tophat`){let t=l(n,`#0b0f19`,.86),r=l(n,i,.15);o.push(`<g transform="rotate(-10 214 64)">
 <ellipse cx="214" cy="74" rx="80" ry="11" fill="${i}" opacity=".45" filter="url(#${e(`soft`)})"/>
 <path d="${p}" fill="url(#${e(`hat-fill`)})"/>
 <path d="M166 36Q214 47 262 36L263 55Q214 66 165 55Z" fill="url(#${e(`band`)})"/>
 <path d="M166 38Q214 49 262 38" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.5"/>
 <g transform="translate(244 47)">
  <path d="M0 0L-15-9Q-18 0-15 9Z" fill="${r}" stroke="${l(r,i,.4)}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M0 0L15-9Q18 0 15 9Z" fill="${r}" stroke="${l(r,i,.4)}" stroke-width="1.2" stroke-linejoin="round"/>
  <rect x="-4" y="-5" width="8" height="10" rx="3" fill="${l(r,i,.35)}"/>
 </g>
 <path d="${p}" fill="none" stroke="${a}" stroke-opacity=".3" stroke-width="2"/>
 <ellipse cx="214" cy="-22" rx="45" ry="8.5" fill="${l(n,`#0b0f19`,.74)}" stroke="${a}" stroke-opacity=".4" stroke-width="2"/>
 <path d="M178-14Q175 12 178 32" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".16"/>
 <ellipse cx="214" cy="64" rx="88" ry="16" fill="${t}" stroke="${a}" stroke-opacity=".55" stroke-width="2.5"/>
 <path d="M134 60Q214 46 294 60" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".28"/>
 </g>`)}if(t.outfit===`medal`){let a=Number(t.years),s=Number.isFinite(a)&&a>=1&&a<=99?Math.round(a):null,c=s===null?`<path d="M220 301l4.4 9 10 1.4-7.2 7 1.7 9.9-8.9-4.7-8.9 4.7 1.7-9.9-7.2-7 10-1.4Z" fill="#7a4d00" opacity=".85"/>`:`<text x="220" y="${s>9?326:328}" text-anchor="middle" font-family="Inter Variable, Inter, system-ui, sans-serif" font-weight="800" font-size="${s>9?23:28}" letter-spacing="-1" fill="#6b4300">${s}</text>`;o.push(`<g>
 <path d="M170 272L194 268L228 309L210 315Z" fill="${n}" stroke="${l(n,i,.4)}" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="M270 272L246 268L212 309L230 315Z" fill="${l(r,`#ffffff`,.15)}" stroke="${l(r,i,.4)}" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="M180 272L191 270L221 307" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>
 <ellipse cx="220" cy="348" rx="31" ry="5.5" fill="${i}" opacity=".35" filter="url(#${e(`soft`)})"/>
 <circle cx="220" cy="318" r="29" fill="url(#${e(`gold`)})" stroke="#b07a10" stroke-width="2.5"/>
 <circle cx="220" cy="318" r="22.5" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".75"/>
 <path d="M202 306Q208 296 219 294" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
 ${c}
 </g>`)}return`<g id="${e(`costume`)}" data-costume="${t.hat||``}:${t.outfit||``}">${o.join(``)}</g>`}var f=`M190 68L238-56L286 68Q238 86 190 68Z`,p=`M164 62L170-20Q214-29 258-20L264 62Q214 74 164 62Z`;function m(e){if(!e||typeof e!=`object`)return null;let t=[`party`,`tophat`].includes(e.hat)?e.hat:null,n=e.outfit===`medal`?`medal`:null;return t||n?{hat:t,outfit:n,years:e.years}:null}function h(e,t,{b:n,c:r,deep:i}){if(!t)return``;let a=[];return t.hat===`party`?(a.push(`<clipPath id="${e(`hat-clip`)}"><path d="${f}"/></clipPath>`),a.push(`<linearGradient id="${e(`hat-fill`)}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${l(r,`#ffffff`,.62)}"/></linearGradient>`),a.push(`<linearGradient id="${e(`hat-shade`)}" x1="0" y1="0" x2="1" y2="0"><stop offset=".22" stop-color="#ffffff" stop-opacity=".38"/><stop offset=".46" stop-color="#ffffff" stop-opacity="0"/><stop offset=".62" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="${i}" stop-opacity=".42"/></linearGradient>`)):t.hat===`tophat`&&(a.push(`<linearGradient id="${e(`hat-fill`)}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${l(n,`#0b0f19`,.9)}"/><stop offset=".22" stop-color="${l(n,`#0b0f19`,.62)}"/><stop offset=".5" stop-color="${l(n,`#0b0f19`,.8)}"/><stop offset="1" stop-color="${l(n,`#0b0f19`,.94)}"/></linearGradient>`),a.push(`<linearGradient id="${e(`band`)}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${l(n,i,.2)}"/><stop offset=".3" stop-color="${n}"/><stop offset="1" stop-color="${l(r,i,.25)}"/></linearGradient>`)),t.outfit===`medal`&&a.push(`<radialGradient id="${e(`gold`)}" cx="38%" cy="32%" r="75%"><stop stop-color="#fff1b8"/><stop offset=".45" stop-color="#f6c54a"/><stop offset="1" stop-color="#c98a14"/></radialGradient>`),a.join(``)}function g(e={}){let t=s.some(t=>t[0]===e.state)?e.state:{processing:`thinking`,listening:`listening`,speaking:`speaking`}[e.expression]||`idle`,n=s.find(e=>e[0]===t),r=i.some(t=>t[0]===e.expression)?e.expression:n[3],f=String(e.id||`tyro`).replace(/[^a-zA-Z0-9_-]/g,``)||`tyro`,p=o.find(t=>t[0]===e.palette)||o[2],[g,_,v]=Array.isArray(e.colors)&&e.colors.length===3&&e.colors.every(c)?e.colors:p[2],y=c(e.accent)?e.accent:_,b=l(g,`#030913`,.8),x=l(g,`#071020`,.5),S=l(v,`#ffffff`,.74),C=(e,t,n,r)=>Math.max(n,Math.min(r,Number.isFinite(e)?e:t)),w=e.motion!==!1,T=e.blink!==!1&&![`sleeping`,`sleepy`,`happy`,`wink`].includes(r),E=C(e.glow,.55,0,1),D=C(e.gloss,.8,0,1),O=C(e.speed,1,.4,2),k=e=>`${f}-${e}`,A=C(e.lookX,0,-12,12),j=C(e.lookY,0,-9,9),M=(e,t,n=`infinite`,r=0)=>w?`animation:${k(e)} ${t/O}s ${r/O}s ease-in-out ${n} both;`:``,N={"thumbs-up":[`celebrate`,1.3,`1`],"thumbs-down":[`shake`,.65,`1`],greeting:[`greet`,2.4,`1`],idle:[`float`,6],thinking:[`tilt`,5],speaking:[`body-talk`,1.1],orbiting:[`orbit`,6],listening:[`listen`,3.2],"logging-in":[`connect`,3],searching:[`scan-body`,5],planning:[`plan`,4.5],working:[`work`,2.2],syncing:[`float`,3],waiting:[`wait`,7],success:[`celebrate`,1.3,`1`],error:[`shake`,.65,`1`],sleeping:[`breathe`,9]}[t],P={thinking:[`think`,4],speaking:[`talk`,.8],orbiting:[`yaw`,6],listening:[`focus`,3.2],searching:[`scan`,5],planning:[`steps`,4.5],working:[`focus`,2.2],waiting:[`think`,7]}[t],F=[`orbiting`,`logging-in`,`syncing`,`searching`].includes(t),I=i.find(e=>e[0]===r)[1];return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 470" role="img" aria-labelledby="${k(`title`)}" style="display:block;width:100%;height:auto;overflow:visible"><title id="${k(`title`)}">TYRO — ${n[1]}, ${I}</title>
 <defs>
 <clipPath id="${k(`clip`)}"><circle cx="220" cy="221" r="170"/></clipPath>
 <radialGradient id="${k(`halo`)}"><stop stop-color="${y}" stop-opacity=".32"/><stop offset="1" stop-color="${y}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${k(`body`)}" cx="30%" cy="22%" r="82%"><stop stop-color="${l(g,S,.22)}"/><stop offset=".33" stop-color="${x}"/><stop offset=".7" stop-color="${b}"/><stop offset=".9" stop-color="${l(_,b,.6)}"/><stop offset="1" stop-color="${l(v,b,.2)}"/></radialGradient>
 <radialGradient id="${k(`bloom`)}"><stop stop-color="${_}" stop-opacity=".95"/><stop offset=".44" stop-color="${_}" stop-opacity=".58"/><stop offset="1" stop-color="${_}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${k(`color`)}"><stop stop-color="${v}" stop-opacity=".87"/><stop offset=".5" stop-color="${v}" stop-opacity=".38"/><stop offset="1" stop-color="${v}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${k(`first`)}"><stop stop-color="${g}"/><stop offset="1" stop-color="${g}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${k(`depth`)}" cx="49%" cy="43%" r="57%"><stop offset=".35" stop-color="${b}" stop-opacity="0"/><stop offset=".74" stop-color="${b}" stop-opacity=".14"/><stop offset=".9" stop-color="${b}" stop-opacity=".77"/><stop offset=".97" stop-color="${b}" stop-opacity=".32"/><stop offset="1" stop-color="${S}" stop-opacity=".45"/></radialGradient>
 <radialGradient id="${k(`fresnel`)}"><stop offset=".82" stop-color="${S}" stop-opacity="0"/><stop offset=".965" stop-color="${S}" stop-opacity=".07"/><stop offset="1" stop-color="${S}" stop-opacity=".55"/></radialGradient>
 <linearGradient id="${k(`rim`)}" x1="10%" y1="0" x2="85%" y2="100%"><stop stop-color="${S}"/><stop offset=".32" stop-color="${v}" stop-opacity=".15"/><stop offset=".64" stop-color="${b}" stop-opacity=".8"/><stop offset="1" stop-color="${S}" stop-opacity=".7"/></linearGradient>
 <linearGradient id="${k(`shine`)}" x1="0" y1="0" x2="65%" y2="100%"><stop stop-color="#ffffff" stop-opacity=".95"/><stop offset=".4" stop-color="${S}" stop-opacity=".42"/><stop offset="1" stop-color="${S}" stop-opacity="0"/></linearGradient>
 <linearGradient id="${k(`eye`)}" x1="0" y1="0" x2="0" y2="100%"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${l(v,`#ffffff`,.85)}"/></linearGradient>
 <filter id="${k(`soft`)}" x="-60%" y="-100%" width="220%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="${k(`blur`)}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="13"/></filter>
 <filter id="${k(`light`)}" x="-80%" y="-100%" width="260%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
 ${h(k,m(e.costume),{b:_,c:v,deep:b})}
 </defs>
 <style>
 @keyframes ${k(`greet`)}{0%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-14px) rotate(-9deg)}45%{transform:translateY(-10px) rotate(8deg)}65%{transform:translateY(-6px) rotate(-5deg)}82%{transform:translateY(2px) rotate(2deg)}100%{transform:translateY(0) rotate(0deg)}}
 @keyframes ${k(`float`)}{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
 @keyframes ${k(`tilt`)}{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(4deg) translateY(-5px)}}
 @keyframes ${k(`body-talk`)}{0%,100%{transform:scale(1)}25%{transform:scale(1.012,.985)}60%{transform:scale(.99,1.015)}80%{transform:scale(1.008,.997)}}
 @keyframes ${k(`orbit`)}{0%,100%{transform:translate(0,-5px) rotate(0deg)}25%{transform:translate(10px,0) rotate(4deg)}50%{transform:translate(0,5px)}75%{transform:translate(-10px,0) rotate(-4deg)}}
 @keyframes ${k(`listen`)}{0%,100%{transform:scale(1.015) rotate(-3deg)}50%{transform:scale(1.04) rotate(-1deg)}}
 @keyframes ${k(`connect`)}{0%,100%{transform:scale(.96)}60%{transform:scale(1.015)}}
 @keyframes ${k(`scan-body`)}{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
 @keyframes ${k(`plan`)}{0%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}60%{transform:translateY(-8px)}}
 @keyframes ${k(`work`)}{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}
 @keyframes ${k(`wait`)}{0%,80%,100%{transform:rotate(-6deg)}88%{transform:rotate(-2deg)}}
 @keyframes ${k(`celebrate`)}{0%{transform:translateY(0)}30%{transform:translateY(-23px) rotate(-7deg)}55%{transform:translateY(3px) scale(1.025,.98)}75%{transform:translateY(-6px)}100%{transform:translateY(0)}}
 @keyframes ${k(`shake`)}{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px) rotate(-3deg)}40%,80%{transform:translateX(7px) rotate(3deg)}}
 @keyframes ${k(`breathe`)}{0%,100%{transform:scale(.98)}50%{transform:scale(1)}}
 @keyframes ${k(`blink`)}{0%,42%,45%,89%,92%,100%{transform:scaleY(1)}43.5%,90.5%{transform:scaleY(.08)}}
 @keyframes ${k(`talk`)}{0%,100%{transform:scaleY(1)}22%{transform:scaleY(.7)}44%{transform:scaleY(1.12)}67%{transform:scaleY(.9)}82%{transform:scaleY(1.05)}}
 @keyframes ${k(`think`)}{0%,100%{transform:translate(-6px,-9px)}50%{transform:translate(5px,-6px)}}
 @keyframes ${k(`yaw`)}{0%,100%{transform:translateX(0) scaleX(1)}25%{transform:translateX(32px) scaleX(.8)}50%{transform:translateX(0) scaleX(1)}75%{transform:translateX(-32px) scaleX(.8)}}
 @keyframes ${k(`focus`)}{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.12)}}
 @keyframes ${k(`scan`)}{0%,15%,100%{transform:translateX(-23px)}45%,65%{transform:translateX(23px)}}
 @keyframes ${k(`steps`)}{0%,100%{transform:translate(-10px,-6px)}33%{transform:translate(0,-10px)}66%{transform:translate(10px,-6px)}}
 @keyframes ${k(`flow`)}{0%,100%{transform:rotate(-15deg) scale(1)}50%{transform:rotate(22deg) scale(1.08)}}
 @keyframes ${k(`spin`)}{to{transform:rotate(360deg)}}
 @keyframes ${k(`pulse`)}{0%,100%{opacity:.35}50%{opacity:.85}}
 @keyframes ${k(`ring`)}{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-1180}}
 #${k(`orb`)}{transform-origin:220px 221px;${M(...N)}}
 #${k(`lids`)}{transform-origin:220px 243px;${T?M(`blink`,7.6):``}}
 #${k(`face`)}{transform-origin:220px 243px;${P?M(...P):``}}
 ${e.glasses?`#${k(`specs`)}{transform-origin:220px 243px;${P?M(...P):``}}`:``}
 #${k(`fluid`)}{transform-origin:220px 221px;${M(t===`thinking`||t===`syncing`?`spin`:`flow`,t===`thinking`?14:t===`syncing`?8:18)}}
 #${k(`reflection`)}{transform-origin:220px 221px;${M(`flow`,23)}}
 #${k(`ring`)}{${w?`animation:${k(`ring`)} ${3/O}s linear infinite;`:``}}
 #${k(`pulse`)}{${M(`pulse`,t===`speaking`?1.1:3)}}
 @media(prefers-reduced-motion:reduce){#${k(`orb`)},#${k(`lids`)},#${k(`face`)},${e.glasses?`#${k(`specs`)},`:``}#${k(`fluid`)},#${k(`reflection`)},#${k(`ring`)},#${k(`pulse`)}{animation:none!important}}
 </style>
 <ellipse cx="220" cy="420" rx="79" ry="9" fill="${x}" opacity=".2" filter="url(#${k(`soft`)})"/>
 <g id="${k(`orb`)}">
 <circle cx="220" cy="221" r="213" fill="url(#${k(`halo`)})" opacity="${E}"/>
 ${F?`<ellipse cx="220" cy="221" rx="203" ry="74" transform="rotate(-24 220 221)" fill="none" stroke="${v}" stroke-opacity=".16" stroke-width="1.2"/>`:``}
 <circle cx="220" cy="221" r="171" fill="url(#${k(`body`)})" stroke="url(#${k(`rim`)})" stroke-width="2"/>
 <g clip-path="url(#${k(`clip`)})">
 <g id="${k(`fluid`)}">
 <ellipse cx="141" cy="157" rx="133" ry="130" fill="url(#${k(`first`)})"/>
 <ellipse cx="227" cy="272" rx="154" ry="138" fill="url(#${k(`bloom`)})"/>
 <ellipse cx="324" cy="227" rx="111" ry="163" transform="rotate(32 324 227)" fill="url(#${k(`color`)})"/>
 <path d="M93 320C139 224 208 350 308 210C356 144 366 113 355 84" stroke="${v}" stroke-opacity=".3" stroke-width="24" fill="none" filter="url(#${k(`blur`)})"/>
 </g>
 <circle cx="220" cy="221" r="170" fill="url(#${k(`depth`)})"/>
 <circle cx="220" cy="221" r="170" fill="url(#${k(`fresnel`)})"/>
 <g id="${k(`reflection`)}" opacity="${D}">
 <ellipse cx="156" cy="108" rx="83" ry="26" transform="rotate(-29 156 108)" fill="url(#${k(`shine`)})"/>
 <ellipse cx="124" cy="105" rx="30" ry="9" transform="rotate(-35 124 105)" fill="#ffffff" opacity=".58" filter="url(#${k(`soft`)})"/>
 <path d="M72 173C92 102 152 61 213 56" fill="none" stroke="${S}" stroke-width="3" opacity=".8"/>
 <path d="M320 112C350 143 368 177 370 211" fill="none" stroke="${S}" stroke-width="9" opacity=".22" filter="url(#${k(`soft`)})"/>
 </g>
 <path d="M116 350Q226 418 331 334" fill="none" stroke="${v}" stroke-width="13" opacity="${.2+D*.25}" filter="url(#${k(`soft`)})"/>
 <path d="M137 368Q231 408 314 356" fill="none" stroke="${S}" stroke-width="1.7" opacity="${D*.62}"/>
 <ellipse cx="216" cy="242" rx="80" ry="50" fill="${b}" opacity=".2" filter="url(#${k(`blur`)})"/>
 <g data-look="true" transform="translate(${A} ${j})"><g id="${k(`lids`)}"><g id="${k(`face`)}">
 <g opacity="${E*.75}" filter="url(#${k(`light`)})">${a(r,S)}</g>
 ${a(r,`url(#${k(`eye`)})`)}
 </g></g>${e.glasses?u(k(`specs`),b):``}</g></g>
 ${d(k,m(e.costume),{b:_,c:v,deep:b,light:S})}
 ${F?`<g transform="rotate(-24 220 221)"><ellipse id="${k(`ring`)}" cx="220" cy="221" rx="203" ry="74" fill="none" stroke="${S}" stroke-opacity=".8" stroke-width="2" stroke-linecap="round" stroke-dasharray="${t===`syncing`?`55 240 55 240`:`70 1110`}"/></g>`:``}
 ${t===`listening`?`<g id="${k(`pulse`)}" fill="none" stroke="${v}" stroke-width="2" opacity=".5"><path d="M31 189Q20 221 31 253 M409 189Q420 221 409 253"/></g>`:``}
 </g></svg>`}function _(e={}){let t=g(e),n=[`thumbs-up`,`thumbs-down`].includes(e.state);if(!e.mesh&&!n)return t;let r=String(e.id||`tyro`).replace(/[^a-zA-Z0-9_-]/g,``)||`tyro`,i=e=>`${r}-${e}`,a=o.find(t=>t[0]===e.palette)||o[2],[s,u,d]=Array.isArray(e.colors)&&e.colors.length===3&&e.colors.every(c)?e.colors:a[2],f=l(d,`#ffffff`,.83),p=l(s,`#122533`,.45),m=e.state===`thumbs-down`,h=Math.max(.4,Math.min(2,Number.isFinite(e.speed)?e.speed:1)),_=e.mesh?`
 <radialGradient id="${i(`mesh-a`)}"><stop stop-color="${s}" stop-opacity=".48"/><stop offset=".4" stop-color="${s}" stop-opacity=".25"/><stop offset=".76" stop-color="${s}" stop-opacity=".08"/><stop offset="1" stop-color="${s}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${i(`mesh-b`)}"><stop stop-color="${u}" stop-opacity=".5"/><stop offset=".4" stop-color="${u}" stop-opacity=".3"/><stop offset=".76" stop-color="${u}" stop-opacity=".12"/><stop offset="1" stop-color="${u}" stop-opacity="0"/></radialGradient>
 <radialGradient id="${i(`mesh-c`)}"><stop stop-color="${d}" stop-opacity=".48"/><stop offset=".45" stop-color="${d}" stop-opacity=".3"/><stop offset=".8" stop-color="${d}" stop-opacity=".09"/><stop offset="1" stop-color="${d}" stop-opacity="0"/></radialGradient>`:``,v=n?`
 <linearGradient id="${i(`hand`)}" x1="0" y1="${m?`100%`:`0`}" x2="75%" y2="${m?`0`:`100%`}"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="${f}"/><stop offset="1" stop-color="${l(u,f,.5)}"/></linearGradient>
 <linearGradient id="${i(`cuff`)}" x1="0" y1="0" x2="100%" y2="100%"><stop stop-color="${l(u,f,.35)}"/><stop offset="1" stop-color="${p}"/></linearGradient>
 <filter id="${i(`hand-shadow`)}" x="-60%" y="-60%" width="220%" height="240%"><feGaussianBlur stdDeviation="5"/></filter>`:``;if(t=t.replace(`</defs>`,_+v+`</defs>`),e.mesh){let e=`<g id="${i(`mesh`)}" data-mesh="true" aria-hidden="true">
  <ellipse cx="207" cy="203" rx="207" ry="201" fill="url(#${i(`mesh-a`)})"/>
  <ellipse cx="229" cy="226" rx="208" ry="203" fill="url(#${i(`mesh-b`)})"/>
  <ellipse cx="221" cy="227" rx="216" ry="167" fill="url(#${i(`mesh-c`)})"/>
  </g>`;t=t.replace(`</style>`,`</style>`+e)}if(n){let n=`M23 47C34 44 42 34 46 23L50 8C52 2 57 1 62 5C68 11 68 23 63 37L84 37C96 37 101 44 98 54L90 85C88 94 81 99 71 99L43 96C35 96 30 91 24 90Z`,r=`<g transform="translate(297 271)"><g id="${i(`gesture`)}" data-gesture="${e.state}">
   <g transform="translate(3 8)"><path d="${n}" transform="${m?`translate(0 105) scale(1 -1)`:`translate(0 0)`}" fill="${p}" opacity=".35" filter="url(#${i(`hand-shadow`)})"/></g>
   <g transform="${m?`translate(0 105) scale(1 -1)`:`translate(0 0)`}">
    <path d="${n}" fill="url(#${i(`hand`)})" stroke="${l(u,f,.28)}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M71 55H94M69 69H91M65 82H86" fill="none" stroke="${p}" stroke-opacity=".2" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M52 14C54 9 59 10 60 16M70 42H84" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="2.8" stroke-linecap="round"/>
    <rect x="6" y="47" width="23" height="49" rx="8" fill="url(#${i(`cuff`)})" stroke="${l(d,f,.55)}" stroke-width="1.3"/>
    <path d="M12 54V85" stroke="${f}" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>
   </g>
  </g></g>`,a=`
 @keyframes ${i(`gesture-enter`)}{0%{opacity:0;transform:translate(12px,18px) rotate(${m?`12`:`-15`}deg) scale(.7)}55%{opacity:1;transform:translate(0,-4px) rotate(${m?`-3`:`4`}deg) scale(1.04)}100%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}}
 #${i(`gesture`)}{transform-origin:50px 65px;${e.motion===!1?``:`animation:${i(`gesture-enter`)} ${1.1/h}s ease-out 1 both;`}}
 @media(prefers-reduced-motion:reduce){#${i(`gesture`)}{animation:none!important}}
 `;t=t.replace(`</style>`,a+`</style>`),t=t.replace(` </g></svg>`,r+` </g></svg>`)}return t}var v=n(),y={a:[[null,.48],[.4,.25],[.76,.08],[1,0]],b:[[null,.5],[.4,.3],[.76,.12],[1,0]],c:[[null,.48],[.45,.3],[.8,.09],[1,0]]},b=[{key:`a`,cx:207,cy:203,rx:207,ry:201},{key:`b`,cx:229,cy:226,rx:208,ry:203},{key:`c`,cx:221,cy:227,rx:216,ry:167}];function x({colors:e,intensity:t=1,spread:n=1,className:i,style:a}){let o=(0,r.useId)().replace(/[^a-zA-Z0-9_-]/g,``),s=e=>`tyromesh-${o}-${e}`,[c,l,u]=e,d={a:c,b:l,c:u};return(0,v.jsxs)(`svg`,{viewBox:`0 0 440 470`,"aria-hidden":`true`,className:i,style:{display:`block`,width:`100%`,height:`auto`,overflow:`visible`,...a},children:[(0,v.jsx)(`defs`,{children:Object.entries(y).map(([e,n])=>(0,v.jsx)(`radialGradient`,{id:s(e),children:n.map(([n,r],i)=>(0,v.jsx)(`stop`,{...n===null?{}:{offset:n},stopColor:d[e],stopOpacity:Math.min(1,r*t)},i))},e))}),b.map(e=>(0,v.jsx)(`ellipse`,{cx:e.cx,cy:e.cy,rx:e.rx*n,ry:e.ry*n,fill:`url(#${s(e.key)})`},e.key))]})}var S=342/440,C={x:26,y:20,reach:260},w=243/470;function T({expression:e,state:t=`idle`,palette:n=`ocean-breeze-v2`,colors:i,mesh:a=!1,size:o=240,accent:s,glow:c=.55,gloss:l=.8,speed:u=1,blink:d=!0,motion:f=!0,followPointer:p=!0,reading:m=!1,meshIntensity:h=1,meshSpread:g=1,className:y,style:b,decorative:T=!1,glasses:E=!1,costume:D=null}){let O=`tyro-${(0,r.useId)().replace(/[^a-zA-Z0-9_-]/g,``)}`,k=(0,r.useRef)(null),A=()=>k.current?.querySelector(`[data-look]`)?.setAttribute(`transform`,`translate(0 0)`);(0,r.useEffect)(()=>{A()},[p,f,e,t]);function j(e){if(!p||p===`page`||m||!f||window.matchMedia(`(prefers-reduced-motion: reduce)`).matches)return;let t=e.currentTarget.getBoundingClientRect(),n=((e.clientX-t.left)/t.width-.5)*22,r=((e.clientY-t.top)/t.height-.5)*16;k.current?.querySelector(`[data-look]`)?.setAttribute(`transform`,`translate(${n} ${r})`)}let M=D?.hat??null,N=D?.outfit??null,P=D?.years??null,F=(0,r.useMemo)(()=>_({id:O,expression:e,state:t,palette:n,colors:i,mesh:!1,accent:s,glow:c,gloss:l,speed:u,blink:d,motion:f,glasses:E,costume:M||N?{hat:M,outfit:N,years:P}:null}),[O,e,t,n,i,s,c,l,u,d,f,E,M,N,P]),I=Math.round(o/S),L=p===`page`&&!m&&f,R=(0,r.useRef)({x:0,y:0});(0,r.useEffect)(()=>{if(!L)return;let e=k.current,t=window.matchMedia(`(prefers-reduced-motion: reduce)`),n=0,r=null,i=()=>{n=0;let t=e?.querySelector(`[data-look]`);if(!e||!t||!r)return;let i=e.getBoundingClientRect(),a=r.x-(i.left+i.width/2),o=r.y-(i.top+i.height*w),s=Math.hypot(a,o),c=s?Math.min(1,s/C.reach)/s:0,l=Math.round(a*c*C.x*10)/10,u=Math.round(o*c*C.y*10)/10;R.current={x:l,y:u},t.style.transition=`transform .35s cubic-bezier(.2,.7,.2,1)`,t.style.transform=`translate(${l}px, ${u}px)`},a=e=>{e.pointerType&&e.pointerType!==`mouse`&&e.pointerType!==`pen`||t.matches||(r={x:e.clientX,y:e.clientY},n||=requestAnimationFrame(i))};return window.addEventListener(`pointermove`,a,{passive:!0}),()=>{window.removeEventListener(`pointermove`,a),cancelAnimationFrame(n);let t=e?.querySelector(`[data-look]`);t&&(t.style.transform=``,t.style.transition=``)}},[L]),(0,r.useEffect)(()=>{if(!L)return;let e=k.current?.querySelector(`[data-look]`);if(!e)return;let{x:t,y:n}=R.current;e.style.transform=`translate(${t}px, ${n}px)`},[F,L]);let z=i??null;return(0,v.jsxs)(`div`,{ref:k,className:y,"aria-hidden":T?`true`:void 0,"data-mascot-read":m?``:void 0,style:{position:`relative`,width:I,maxWidth:`100%`,...b},onPointerMove:j,onPointerLeave:A,children:[a&&z?(0,v.jsx)(x,{colors:z,intensity:h,spread:g,style:{position:`absolute`,inset:0,pointerEvents:`none`}}):null,(0,v.jsx)(`div`,{style:{position:`relative`},dangerouslySetInnerHTML:{__html:F}})]})}var E=(0,r.memo)(T),D={fiesta:`insta`,"ocean-breeze":`ocean-breeze`,"ocean-breeze-v2":`ocean-breeze-v2`,"arctic-mint":`arctic-mint`,"rose-blush":`rose-blush`,"peach-sorbet":`peach-sorbet`,"sunset-gradient":`sunset`,"pastel-lavender":`pastel-lavender`,"green-garden":`green-garden`,"fiery-red":`fiery-red`,"chocolate-delight":`chocolate`,midnight:`midnight`},O={black:[`#262626`,`#737373`,`#ededed`],amber:[`#78350f`,`#d97706`,`#fde68a`],navy:[`#1e3a8a`,`#3b82f6`,`#bfdbfe`],sky:[`#0c4a6e`,`#0ea5e9`,`#e0f2fe`],violet:[`#4c1d95`,`#8b5cf6`,`#ede9fe`]},k=`ocean-breeze-v2`;function A(e){let t=O[e];if(t)return t;let n=D[e]??k;return(o.find(e=>e[0]===n)??o.find(e=>e[0]===k))[2]}export{a,i,E as n,_ as o,s as r,A as t};