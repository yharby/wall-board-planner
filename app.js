/* Wall board planner
 * Plain JavaScript, no build step, no dependencies.
 * All product data, colours, presets and defaults come from config.js,
 * so forks normally only need to edit that file.
 *
 * Coordinates are in centimetres. x runs from the left wall corner,
 * y (and h) run up from the floor. The SVG uses 1 unit = 1 cm.
 */

/* ---------- config ---------- */
const CFG=window.WALL_CONFIG;
const SIZES=CFG.sizes;
const FIN=Object.fromEntries(Object.entries(CFG.finishes).map(([k,v])=>[k,{name:v.name,f:v.face,h:v.holes,e:v.edge,t:v.text}]));
const SWATCHES=CFG.swatches;
const J=CFG.joint;
const KEY=CFG.storageKey;
const LBL=CFG.labels;
const FIRST_SIZE=Object.keys(SIZES)[0];
const FIRST_FIN=Object.keys(FIN)[0];

function defaults(){
  const d=JSON.parse(JSON.stringify(CFG.defaults));
  const n=[...d.boards,...d.storage].map(o=>parseInt(String(o.id).slice(1),10)||0);
  return Object.assign({lastF:FIRST_FIN,nid:Math.max(0,...n)+1},d);
}

/* ---------- state ---------- */
const $=q=>document.querySelector(q);
const svg=$('#wall');
const fmt=n=>String(Math.round(n*100)/100);
const r05=v=>Math.round(v*4)/4;
const sz=b=>SIZES[b.s]||SIZES[FIRST_SIZE];
const screw=b=>sz(b).screw;

let st=null;
try{const s=localStorage.getItem(KEY);if(s)st=Object.assign(defaults(),JSON.parse(s));}catch(e){}
if(!st)st=defaults();
// Saves from before v2 still carry the old 4 cm placeholder for the screw height.
if(!st.v){if(st.railD===4)st.railD=defaults().railD;st.v=2;}
let sel=new Set(),hist=[],fut=[],drag=null,pend=null,guides=[];

const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}};
const boardById=id=>st.boards.find(b=>b.id===id);
const storById=id=>st.storage.find(s=>s.id===id);
const maxStor=()=>st.storage.length?Math.max(0,...st.storage.map(s=>s.h)):0;
const recLine=()=>st.desk.on?st.desk.h+maxStor()+st.clear:null;
const selBoards=()=>st.boards.filter(b=>sel.has(b.id));
const selStor=()=>st.storage.filter(s=>sel.has(s.id));

function commit(pre){if(pre===JSON.stringify(st))return;hist.push(pre);if(hist.length>120)hist.shift();fut=[];save();}
function op(fn){const pre=JSON.stringify(st);fn();commit(pre);refresh();}
function prune(){sel=new Set([...sel].filter(id=>boardById(id)||storById(id)));}
function undo(){if(!hist.length)return;fut.push(JSON.stringify(st));st=JSON.parse(hist.pop());prune();save();syncSettings();refresh();}
function redo(){if(!fut.length)return;hist.push(JSON.stringify(st));st=JSON.parse(fut.pop());prune();save();syncSettings();refresh();}

function issues(b){
  const W=st.wall.w,H=st.wall.h,{w,h}=sz(b),out=[];
  if(b.x<-0.05||b.x+w>W+0.05)out.push('runs past the wall edge');
  if(b.y+h>H+0.05)out.push(`goes ${fmt(b.y+h-H)} cm past the ceiling`);
  if(b.y<-0.05)out.push('goes below the floor');
  if(st.desk.on){
    if(b.y<st.desk.h-0.05&&b.y+h>st.desk.h-3)out.push('dips behind the desk top');
    else st.storage.forEach(s=>{if(b.x<s.x+s.w-0.05&&b.x+w>s.x+0.05&&b.y<st.desk.h+s.h-0.05&&b.y+h>st.desk.h)out.push(`hits the ${fmt(s.h)} cm desk item`);});
  }
  st.boards.forEach(o=>{if(o===b)return;const q=sz(o);if(b.x<o.x+q.w-0.05&&b.x+w>o.x+0.05&&b.y<o.y+q.h-0.05&&b.y+h>o.y+0.05)out.push(`overlaps board ${st.boards.indexOf(o)+1}`);});
  return out;
}

function accessories(x,y,w,h,k){
  let o='';const v=k%3;
  if(w<40){
    const hx=x+w/2,hy=y+h*0.3;
    o+=`<path d="M${hx} ${hy} v3 q0 1.5 1.5 1.5" fill="none" stroke="#7D8589" stroke-width=".5"/><rect x="${hx-1.2}" y="${hy+4}" width="2.4" height="13" rx=".6" fill="#4F7CAC"/><rect x="${x+4}" y="${y+h*0.65}" width="${w-8}" height="9" rx="1" fill="#A8B7A2"/>`;
    return o;
  }
  if(v===0){
    const sy=y+h*0.45,sx=x+w*0.15,sw=w*0.7;
    o+=`<rect x="${sx}" y="${sy}" width="${sw}" height="1.3" fill="#8F979C"/><rect x="${sx+3}" y="${sy-8}" width="6" height="8" rx="1" fill="#DCE3E6" stroke="#9AA4A9" stroke-width=".3"/><rect x="${sx+11}" y="${sy-6}" width="6" height="6" rx="1" fill="#DCE3E6" stroke="#9AA4A9" stroke-width=".3"/><rect x="${sx+sw-10}" y="${sy-5}" width="6" height="5" fill="#B8714A"/><circle cx="${sx+sw-7}" cy="${sy-8.5}" r="3.4" fill="#5F8A55"/><circle cx="${sx+sw-9.6}" cy="${sy-6.6}" r="2.2" fill="#76A268"/>`;
    for(let i=0;i<3;i++){const hx=x+w*0.25+i*w*0.22,hy=y+h*0.66;
      o+=`<path d="M${hx} ${hy} v3 q0 1.5 1.5 1.5" fill="none" stroke="#7D8589" stroke-width=".5"/>`;
      o+=i===1?`<circle cx="${hx+.5}" cy="${hy+8.5}" r="4" fill="none" stroke="#3C4246" stroke-width=".8"/>`:`<rect x="${hx-1}" y="${hy+4}" width="2.2" height="${9+i*2}" rx=".6" fill="${i?'#C9A227':'#4F7CAC'}"/>`;}
  }else if(v===1){
    const cx=x+w*0.12,cy=y+h*0.6;
    ['#D9534F','#E0A82E','#3E7CB1','#4C9A5B'].forEach((c,j)=>{o+=`<rect x="${cx+2+j*2.8}" y="${cy-6+(j%2)*1.6}" width="1.3" height="7" fill="${c}"/>`;});
    o+=`<rect x="${cx}" y="${cy}" width="${w*0.32}" height="10" rx="1" fill="#6B7780"/>`;
    const pw=Math.min(18,w*0.3),px=x+w*0.58,py=y+h*0.16;
    o+=`<rect x="${px}" y="${py}" width="${pw}" height="25" rx="1" fill="#C7A777"/><rect x="${px+1.5}" y="${py+3}" width="${pw-3}" height="20" fill="#FBFBF8"/><rect x="${px+pw/2-3}" y="${py-1}" width="6" height="3" rx=".6" fill="#7D8589"/>`;
  }else{
    const a=x+w*0.28,b=y+h*0.2;
    o+=`<path d="M${a} ${b} v2.5" stroke="#7D8589" stroke-width=".6"/><path d="M${a-6} ${b+12} q0 -9.5 6 -9.5 q6 0 6 9.5" fill="none" stroke="#2F3438" stroke-width="1.3"/><rect x="${a-8}" y="${b+10}" width="4" height="6" rx="1.5" fill="#2F3438"/><rect x="${a+4}" y="${b+10}" width="4" height="6" rx="1.5" fill="#2F3438"/><rect x="${x+w*0.55}" y="${y+h*0.12}" width="3" height="${h*0.62}" fill="#E2C044"/><rect x="${x+w*0.68}" y="${y+h*0.55}" width="${w*0.22}" height="9" rx="1" fill="#A8B7A2"/>`;
  }
  return o;
}

/* ---------- drawing ----------
 * The SVG uses 1 unit = 1 cm of wall. Labels and lines are sized in screen
 * pixels (config.js `labels`) and converted to centimetres with k (cm per
 * screen pixel), so text stays the same readable size on a phone or a wide
 * monitor and the wall takes whatever width is left.
 */
let compact=false;
// group boards into horizontal bands that overlap in height, highest first
function bandsOf(){
  const items=st.boards.map(b=>({b,lo:b.y,hi:b.y+sz(b).h})).sort((a,c)=>a.lo-c.lo),bands=[];
  items.forEach(it=>{const last=bands[bands.length-1];if(last&&it.lo<last.hi-0.05){last.list.push(it.b);last.hi=Math.max(last.hi,it.hi);}else bands.push({lo:it.lo,hi:it.hi,list:[it.b]});});
  return bands.sort((a,c)=>c.hi-a.hi).slice(0,compact?2:3);
}
function scaleFor(W,H){
  const cw=svg.parentNode.clientWidth-8||800;
  compact=cw<640;
  const padL=compact?40:60,padR=compact?74:150;   // room for the wall height and the level labels
  const chrome=compact?90:150;                     // dimension rows above the wall and the floor below
  const availH=Math.max(compact?300:420,window.innerHeight-(compact?120:160));
  const kW=W/Math.max(120,cw-padL-padR),kH=H/Math.max(160,availH-chrome);
  const k=Math.max(kW,kH);                         // cm per screen pixel, fit both width and height
  svg.style.maxWidth=Math.round((W/k)+padL+padR)+'px';
  return {k,pad:{l:padL*k,r:padR*k,b:18*k}};
}
const textW=(t,fs)=>String(t).length*fs*0.52;     // rough width of a condensed label

function render(){
  const W=st.wall.w,H=st.wall.h,Y=h=>H-h;
  const {k,pad}=scaleFor(W,H),P=v=>v*k;
  const FS={dim:P(LBL.dim),small:P(LBL.small),sel:P(LBL.selected),drill:P(LBL.drill),board:P(LBL.board)};
  ['dim','small','sel','drill'].forEach(n=>svg.style.setProperty('--fs-'+n,FS[n]+'px'));
  svg.style.setProperty('--k',k);
  const ROW=FS.dim+P(12);
  const bands=st.dims==='all'?bandsOf():[],top=st.dims==='off'?P(12):P(16)+(bands.length+1)*ROW;
  svg.setAttribute('viewBox',`${-pad.l} ${-top} ${W+pad.l+pad.r} ${H+top+pad.b}`);
  let d='',g='';
  const fsOf=c=>({dt:FS.dim,dts:FS.small,stx:FS.sel,htx:FS.drill})[c]||FS.dim;
  const txt=(x,y,t,cls='dt',anchor='middle')=>`<text class="${cls} halo" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
  const vtxt=(x,y,t,cls='dt')=>`<text class="${cls} halo" transform="translate(${x} ${y}) rotate(-90)" text-anchor="middle">${t}</text>`;
  const T=P(4);
  const tick=(x,y,c='dl')=>`<line class="${c}" x1="${x-T}" y1="${y+T}" x2="${x+T}" y2="${y-T}"/>`;
  const hdim=(x1,x2,y,lab,c='dl',tc='dt')=>{if(x2-x1<0.05)return'';const t=lab??fmt(x2-x1),fit=lab!=null||x2-x1>=textW(t,fsOf(tc))+P(4);return`<line class="${c}" x1="${x1}" x2="${x2}" y1="${y}" y2="${y}"/>${tick(x1,y,c)}${tick(x2,y,c)}${fit?txt((x1+x2)/2,y-P(5),t,tc):''}`;};
  const vdim=(h1,h2,x,lab,c='dl',tc='dt')=>{if(h2-h1<0.05)return'';const t=lab??fmt(h2-h1),fit=lab!=null||h2-h1>=textW(t,fsOf(tc))+P(4);return`<line class="${c}" x1="${x}" x2="${x}" y1="${Y(h1)}" y2="${Y(h2)}"/>${tick(x,Y(h1),c)}${tick(x,Y(h2),c)}${fit?vtxt(x-P(5),(Y(h1)+Y(h2))/2,t,tc):''}`;};

  g+=`<rect x="0" y="0" width="${W}" height="${H}" fill="${st.wall.color}"/>`;
  g+=`<rect x="0" y="${Y(8)}" width="${W}" height="8" fill="#000" opacity=".08"/>`;
  g+=`<rect x="${-pad.l}" y="${H}" width="${W+pad.l+pad.r}" height="${pad.b}" fill="var(--floor)"/>`;
  g+=`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--muted)" stroke-width="${P(1)}"/>`;
  const R=recLine();
  if(R!=null&&st.dims!=='off'&&R<H){
    g+=`<line x1="0" x2="${W}" y1="${Y(R)}" y2="${Y(R)}" stroke="var(--sel)" stroke-width="${P(1.2)}" stroke-dasharray="${P(6)} ${P(4)}" opacity=".85"/>`;
    // put the label in the widest stretch of the line that no board covers
    const lab=compact?`${fmt(R)} clears desk items`:`${fmt(R)} cm, lowest edge that clears the desk items`,top=R+FS.small+P(6);
    const cov=st.boards.filter(b=>b.y<top&&b.y+sz(b).h>R).map(b=>[b.x,b.x+sz(b).w]).sort((a,c)=>a[0]-c[0]);
    let best=null,from=0;
    [...cov,[W,W]].forEach(([a,c])=>{if(a-from>(best?best[1]-best[0]:0))best=[from,a];from=Math.max(from,c);});
    if(best){const short=`${fmt(R)} clears desk items`,room=best[1]-best[0]-P(8),t=textW(lab,FS.small)<=room?lab:textW(short,FS.small)<=room?short:null;
      if(t)g+=txt(best[0]+P(4),Y(R)-P(4),t,'dts','start');}
  }
  if(st.desk.on){
    const dh=st.desk.h;
    [4,W/2-2,W-8].forEach(lx=>{g+=`<rect x="${lx}" y="${Y(dh-3)}" width="4" height="${dh-3}" fill="var(--leg)"/>`;});
    g+=`<rect x="0" y="${Y(dh)}" width="${W}" height="3" fill="var(--desk)"/><rect x="0" y="${Y(dh)+2.3}" width="${W}" height=".7" fill="var(--desk2)"/>`;
    st.storage.forEach(s=>{
      if(s.w<=0||s.h<=0)return;
      const sy=Y(dh+s.h),n=Math.max(1,Math.round(s.h/14)),step=s.h/n,on=sel.has(s.id);
      let o=`<rect x="${s.x}" y="${sy}" width="${s.w}" height="${s.h}" rx=".6" fill="var(--stor)" stroke="${on?'var(--sel)':'var(--stor2)'}" stroke-width="${on?P(3):P(1)}"/>`;
      for(let j=0;j<n;j++){
        if(j)o+=`<line x1="${s.x}" x2="${s.x+s.w}" y1="${sy+j*step}" y2="${sy+j*step}" stroke="var(--stor2)" stroke-width="${P(1)}"/>`;
        if(!j&&st.dims!=='off')continue;   // the height label sits where the top handle would be
        o+=`<rect x="${s.x+s.w/2-3}" y="${sy+j*step+step/2-.5}" width="6" height="1" rx=".4" fill="var(--stor2)"/>`;
      }
      if(st.dims!=='off'){const t=textW(`${fmt(s.h)} tall`,FS.small)<s.w-P(4)?`${fmt(s.h)} tall`:fmt(s.h);o+=txt(s.x+s.w/2,sy+Math.min(step/2+FS.small*0.35,FS.small+P(3)),t,'dts');}
      g+=`<g class="obj" data-id="${s.id}">${o}</g>`;
    });
  }

  st.boards.forEach((b,i)=>{
    const {w,h}=sz(b),F=FIN[b.f]||FIN[FIRST_FIN],bx=b.x,by=Y(b.y+h),bad=issues(b).length>0,on=sel.has(b.id);
    d+=`<pattern id="ph${i}" patternUnits="userSpaceOnUse" x="${bx+1.6}" y="${by+1.6}" width="4" height="8"><rect x=".75" y=".6" width=".55" height="2.4" rx=".27" fill="${F.h}"/><rect x="2.75" y="4.6" width=".55" height="2.4" rx=".27" fill="${F.h}"/></pattern>`;
    let o=`<rect x="${bx+.7}" y="${by+1.3}" width="${w}" height="${h}" rx="1" fill="#000" opacity=".16"/>`;
    o+=`<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="1" fill="${F.f}" stroke="${bad?'var(--warn)':F.e}" stroke-width="${bad?P(3):P(1)}"/>`;
    o+=`<rect x="${bx+1.6}" y="${by+1.6}" width="${w-3.2}" height="${h-3.2}" fill="url(#ph${i})"/>`;
    if(st.acc)o+=accessories(bx,by,w,h,i);
    // big board number, sized to the board itself
    const nf=Math.min(h*0.42,w*0.55);
    o+=`<text x="${bx+w/2}" y="${by+h/2+nf*0.36}" text-anchor="middle" style="font-size:${nf}px;font-stretch:90%;font-weight:800" fill="${F.t}" opacity=".5">${i+1}</text>`;
    if(textW(`${w}×${h}`,FS.board)<w-P(10))o+=`<text x="${bx+P(5)}" y="${by+h-P(5)}" style="font-size:${FS.board}px;font-stretch:80%;font-weight:700" fill="${F.t}">${w}×${h}</text>`;
    if(st.holes){
      const X=screw(b),hh=b.y+h-st.railD,hy=Y(hh),showLab=st.dims!=='off'&&(on||(!sel.size&&!compact))&&X+P(8)>=2*textW('L 000.0',FS.small)+P(6);   // skip when the two labels would collide, the table below has them
      [b.x+(w-X)/2,b.x+(w+X)/2].forEach((cx,j)=>{
        o+=`<circle cx="${cx}" cy="${hy}" r="${P(5)}" fill="none" stroke="var(--guide)" stroke-width="${P(1.6)}"/><line x1="${cx-P(8)}" x2="${cx+P(8)}" y1="${hy}" y2="${hy}" stroke="var(--guide)" stroke-width="${P(1)}"/><line x1="${cx}" x2="${cx}" y1="${hy-P(8)}" y2="${hy+P(8)}" stroke="var(--guide)" stroke-width="${P(1)}"/>`;
        if(showLab){const tx=j?cx+P(4):cx-P(4);o+=`<text class="dts halo" y="${hy+FS.small+P(9)}" text-anchor="${j?'end':'start'}" style="fill:var(--guide);font-weight:700"><tspan x="${tx}">L ${fmt(cx)}</tspan><tspan x="${tx}" dy="1.1em">H ${fmt(hh)}</tspan></text>`;}
      });
    }
    if(on)o+=`<rect x="${bx-P(4)}" y="${by-P(4)}" width="${w+P(8)}" height="${h+P(8)}" rx="${P(4)}" fill="none" stroke="var(--sel)" stroke-width="${P(2.2)}" stroke-dasharray="${P(6)} ${P(3)}"/>`;
    g+=`<g class="obj" data-id="${b.id}">${o}</g>`;
  });

  guides.forEach(q=>{g+=q.v!=null?`<line class="guide" x1="${q.v}" x2="${q.v}" y1="${-P(8)}" y2="${H+P(8)}"/>`:`<line class="guide" x1="${-P(8)}" x2="${W+P(8)}" y1="${Y(q.h)}" y2="${Y(q.h)}"/>`;});

  if(st.dims!=='off'){
    g+=hdim(0,W,-P(16)-bands.length*ROW,`${fmt(W)} wall width`);
    g+=vdim(0,H,-pad.l+FS.dim+P(10),`${fmt(H)} wall height`);
    if(st.dims==='all'&&st.boards.length){
      // horizontal chains, one per band of boards that share height
      bands.forEach((band,i)=>{
        const y=-P(16)-i*ROW;
        let pts=[0,W];band.list.forEach(b=>{pts.push(b.x,b.x+sz(b).w);});
        pts=[...new Set(pts.map(v=>Math.round(v*10)/10))].filter(v=>v>=0&&v<=W).sort((a,c)=>a-c);
        for(let j=0;j<pts.length-1;j++)g+=hdim(pts[j],pts[j+1],y);
        band.list.forEach(b=>{[b.x,b.x+sz(b).w].forEach(v=>{g+=`<line class="ext" x1="${v}" x2="${v}" y1="${y}" y2="${Y(b.y+sz(b).h)}"/>`;});});
      });
      // vertical levels on the right
      const names=new Map();
      const add=(h,n)=>{const r=Math.round(h*10)/10;if(!names.has(r)||n)names.set(r,n||names.get(r)||'');};
      st.boards.forEach(b=>{add(b.y,'');add(b.y+sz(b).h,'');});
      add(0,'floor');add(H,'ceiling');
      if(st.desk.on){add(st.desk.h,'desk top');if(maxStor()>0)add(st.desk.h+maxStor(),'desk items');}
      const pts=[...names.keys()].filter(v=>v>=0&&v<=H).sort((a,c)=>a-c);
      const vx=W+FS.dim+P(14);let lastLab=-1e9;
      pts.forEach((h,i)=>{
        g+=`<line class="ext" x1="${W}" x2="${vx+P(4)}" y1="${Y(h)}" y2="${Y(h)}"/>`;
        if(h-lastLab>=FS.small*1.2||i===pts.length-1){g+=txt(vx+P(7),Y(h)+FS.small*0.35,compact?fmt(h):`${fmt(h)} ${names.get(h)}`,'dts','start');lastLab=h;}
        if(i<pts.length-1){const n=pts[i+1];g+=`<line class="dl" x1="${vx}" x2="${vx}" y1="${Y(h)}" y2="${Y(n)}"/>${tick(vx,Y(h))}${tick(vx,Y(n))}`;if(n-h>=textW(fmt(n-h),FS.dim)+P(4))g+=vtxt(vx-P(5),(Y(h)+Y(n))/2,fmt(n-h));}
      });
    }
    // local gaps around selected boards
    selBoards().slice(0,4).forEach(b=>{
      const {w,h}=sz(b),others=st.boards.filter(o=>o!==b),e=0.05;
      const vOver=o=>o.y<b.y+h-e&&o.y+sz(o).h>b.y+e,hOver=o=>o.x<b.x+w-e&&o.x+sz(o).w>b.x+e;
      let L=0,Rr=W,U=H,D=0;
      others.filter(vOver).forEach(o=>{const r=o.x+sz(o).w;if(r<=b.x+e)L=Math.max(L,r);if(o.x>=b.x+w-e)Rr=Math.min(Rr,o.x);});
      others.filter(hOver).forEach(o=>{const t=o.y+sz(o).h;if(o.y>=b.y+h-e)U=Math.min(U,o.y);if(t<=b.y+e&&t>D)D=t;});
      if(st.desk.on){
        if(st.desk.h<=b.y+e&&st.desk.h>D)D=st.desk.h;
        st.storage.forEach(s=>{const t=st.desk.h+s.h;if(s.x<b.x+w-e&&s.x+s.w>b.x+e&&t<=b.y+e&&t>D)D=t;});
      }
      const my=Y(b.y+h/2),mx=b.x+w/2;
      g+=hdim(L,b.x,my,null,'sl','stx')+hdim(b.x+w,Rr,my,null,'sl','stx');
      g+=vdim(b.y+h,U,mx,null,'sl','stx')+vdim(D,b.y,mx,null,'sl','stx');
    });
  }
  if(st.holes&&st.dims!=='off'&&st.boards.length&&(!compact||sel.size)){
    const src=selBoards().length?selBoards():st.boards,rows=new Map(),rd=v=>Math.round(v*100)/100,HT=P(3);
    src.forEach(b=>{const hh=rd(b.y+sz(b).h-st.railD);if(!rows.has(hh))rows.set(hh,[]);rows.get(hh).push(b);});
    const hl=(x1,x2,y)=>x2-x1<0.05?'':`<line class="hd" x1="${x1}" x2="${x2}" y1="${y}" y2="${y}"/><line class="hd" x1="${x1}" x2="${x1}" y1="${y-HT}" y2="${y+HT}"/><line class="hd" x1="${x2}" x2="${x2}" y1="${y-HT}" y2="${y+HT}"/>${x2-x1<textW(fmt(x2-x1),FS.drill)+P(3)?'':`<text class="htx halo" x="${(x1+x2)/2}" y="${y-P(3)}" text-anchor="middle">${fmt(x2-x1)}</text>`}`;
    rows.forEach((list,hh)=>{
      let pts=[0,W];list.forEach(b=>{const w=sz(b).w,X=screw(b);pts.push(b.x,b.x+w,b.x+(w-X)/2,b.x+(w+X)/2);});
      pts=[...new Set(pts.map(rd))].sort((a,c)=>a-c);
      for(let i=0;i<pts.length-1;i++)g+=hl(pts[i],pts[i+1],Y(hh));
    });
    src.forEach(b=>{const {w,h}=sz(b),X=screw(b),hh=b.y+h-st.railD,btop=b.y+h;
      [b.x+(w-X)/2,b.x+(w+X)/2].forEach(cx=>{
        let pts=[0,hh,btop,H];if(st.desk.on&&st.desk.h<hh)pts.push(st.desk.h);
        pts=[...new Set(pts.map(rd))].sort((a,c)=>a-c);
        for(let i=0;i<pts.length-1;i++){const a=pts[i],c=pts[i+1];if(c-a<0.05)continue;
          g+=`<line class="hd" x1="${cx}" x2="${cx}" y1="${Y(a)}" y2="${Y(c)}"/><line class="hd" x1="${cx-HT}" x2="${cx+HT}" y1="${Y(a)}" y2="${Y(a)}"/><line class="hd" x1="${cx-HT}" x2="${cx+HT}" y1="${Y(c)}" y2="${Y(c)}"/>`;
          if(!compact&&c-a>=textW(fmt(c-a),FS.drill)+P(3))g+=`<text class="htx halo" transform="translate(${cx+P(5)+FS.drill} ${(Y(a)+Y(c))/2}) rotate(-90)" text-anchor="middle">${fmt(c-a)}</text>`;}
      });});
  }
  svg.innerHTML=`<defs>${d}</defs>${g}`;
}

/* ---------- side panels ---------- */
function renderTiles(){
  $('#tiles').innerHTML=Object.entries(SIZES).map(([k,s])=>`<button type="button" class="tile" data-s="${k}" aria-label="Add a ${s.w}×${s.h} board"><span class="pb" style="width:${s.w*0.62}px;height:${s.h*0.62}px"></span><b>${s.w}×${s.h}</b><small>cm</small></button>`).join('');
}
function renderSwatches(){
  $('#swatches').innerHTML=SWATCHES.map(([c,n])=>`<button type="button" class="sw" data-color="${c}" style="background:${c}" aria-label="${n}" title="${n}" aria-pressed="${st.wall.color.toLowerCase()===c.toLowerCase()}"></button>`).join('');
}
const sizeOpts=v=>Object.keys(SIZES).map(k=>`<option value="${k}"${k===v?' selected':''}>${k.replace('x','×')} cm</option>`).join('');
const finOpts=v=>Object.entries(FIN).map(([k,f])=>`<option value="${k}"${k===v?' selected':''}>${f.name}</option>`).join('');

function renderInspector(){
  const bs=selBoards(),ss=selStor(),R=recLine();let h='';
  if(!bs.length&&!ss.length){
    h=`<h2>Selection</h2><p class="hint">Click a board to select it and see its distances to everything around it. Shift-click to pick several, then line them up.</p><div class="btns"><button type="button" data-act="selall"${st.boards.length?'':' disabled'}>Select all boards</button></div>`;
  }else if(bs.length===1&&!ss.length){
    const b=bs[0],i=st.boards.indexOf(b)+1;
    h=`<h2>Board ${i}</h2>
    <label class="field">Size<select data-ip="s">${sizeOpts(b.s)}</select></label>
    <label class="field">Colour<select data-ip="f">${finOpts(b.f)}</select></label>
    <label class="field">Left edge from left corner<input type="number" step="0.25" data-ip="x" value="${b.x}"></label>
    <label class="field">Bottom edge from floor<input type="number" step="0.25" data-ip="y" value="${b.y}"></label>
    <div class="btns grid"><button type="button" data-act="center">Centre on wall</button>${R!=null?'<button type="button" data-act="rec">Lift above desk items</button>':''}<button type="button" data-act="dup">Duplicate</button><button type="button" data-act="del">Delete</button></div>`;
  }else if(bs.length){
    h=`<h2>${bs.length} boards selected</h2>
    <label class="field">Colour<select data-ip="f">${finOpts(bs[0].f)}</select></label>
    <div class="btns grid">
      <button type="button" data-act="alignB">Align bottoms</button><button type="button" data-act="alignT">Align tops</button>
      <button type="button" data-act="alignM">Align middles</button><button type="button" data-act="join">Join edge to edge</button>
      <button type="button" data-act="gaps">Equal gaps</button><button type="button" data-act="spread">Spread across wall</button>
      <button type="button" data-act="center">Centre on wall</button>${R!=null?'<button type="button" data-act="rec">Lift above desk items</button>':''}
      <button type="button" data-act="dup">Duplicate</button><button type="button" data-act="del">Delete</button>
    </div>`;
  }else{
    const s=ss[0];
    h=`<h2>Desk item</h2>
    <label class="field">Left edge from left corner<input type="number" step="0.5" data-ip="x" value="${s.x}"></label>
    <label class="field">Width<input type="number" step="0.5" min="1" data-ip="w" value="${s.w}"></label>
    <label class="field">Height above desk<input type="number" step="0.5" min="1" data-ip="h" value="${s.h}"></label>
    <div class="btns"><button type="button" data-act="del">Delete</button></div>`;
  }
  $('#inspector').innerHTML=h;
}
function fillInspector(){
  const one=sel.size===1?(boardById([...sel][0])||storById([...sel][0])):null;
  if(!one)return;
  document.querySelectorAll('#inspector [data-ip]').forEach(el=>{if(el===document.activeElement)return;const k=el.dataset.ip;if(k in one)el.value=one[k];});
}
function renderStatus(){
  const W=st.wall.w,bs=selBoards();let t='';
  if(bs.length===1){
    const b=bs[0],{w,h}=sz(b);
    t=`Board ${st.boards.indexOf(b)+1}, ${w}×${h} cm: left edge ${fmt(b.x)} cm from the left corner, right edge ${fmt(W-b.x-w)} cm from the right corner. Bottom ${fmt(b.y)} cm from the floor${st.desk.on?` (${fmt(b.y-st.desk.h)} cm above the desk)`:''}, top ${fmt(b.y+h)} cm.${st.holes?` Drill at ${fmt(b.x+(w-screw(b))/2)} and ${fmt(b.x+(w+screw(b))/2)} cm from the left corner, both ${fmt(b.y+h-st.railD)} cm from the floor.`:''}`;
  }else if(bs.length>1){
    const l=Math.min(...bs.map(b=>b.x)),r=Math.max(...bs.map(b=>b.x+sz(b).w));
    t=`${bs.length} boards selected, spanning ${fmt(r-l)} cm: ${fmt(l)} cm from the left corner and ${fmt(W-r)} cm from the right.`;
  }else if(st.boards.length){
    const l=Math.min(...st.boards.map(b=>b.x)),r=Math.max(...st.boards.map(b=>b.x+sz(b).w));
    const lo=Math.min(...st.boards.map(b=>b.y)),hi=Math.max(...st.boards.map(b=>b.y+sz(b).h));
    t=`${st.boards.length} board${st.boards.length>1?'s':''} spanning ${fmt(r-l)} cm (${fmt(l)} cm free on the left, ${fmt(W-r)} cm on the right), from ${fmt(lo)} to ${fmt(hi)} cm above the floor.`;
  }else t='The wall is empty. Drag a board from the tray, or click one to add it.';
  $('#status').textContent=t;
  const w=[];st.boards.forEach((b,i)=>issues(b).forEach(m=>w.push(`Board ${i+1} ${m}.`)));
  $('#warnings').innerHTML=w.map(m=>`<li>${m}</li>`).join('');
}
function renderShop(){
  if(!st.boards.length){$('#shop').innerHTML='<p class="hint">Add boards to see what you need.</p>';return;}
  const groups=new Map();
  st.boards.forEach(b=>{const k=b.s+'|'+b.f;groups.set(k,(groups.get(k)||0)+1);});
  let rows='';
  [...groups.entries()].sort().forEach(([k,n])=>{
    const [s,f]=k.split('|'),S=SIZES[s]||SIZES[FIRST_SIZE],name=S.url?`<a href="${S.url}" target="_blank" rel="noopener">${S.name}</a>`:S.name;
    rows+=`<tr><td>${name}, ${(FIN[f]||FIN[FIRST_FIN]).name.toLowerCase()}</td><td>${n}</td></tr>`;
  });
  rows+=`<tr><td>Wall screws and plugs</td><td>${st.boards.length*2}</td></tr>`;
  $('#shop').innerHTML=`<table class="shop">${rows}</table><p class="hint">Two screws per board. Pick screws and plugs that suit your wall.</p>`;
}

/* ---------- export ----------
 * PDF goes through the browser print dialog (choose "Save as PDF"), which keeps
 * the drawing sharp and includes the marks table. PNG copies the drawing's
 * computed styles inline so it renders the same outside the page.
 */
function exportPng(){
  const clone=svg.cloneNode(true),src=svg.querySelectorAll('*'),dst=clone.querySelectorAll('*');
  const props=['fill','fill-opacity','stroke','stroke-width','stroke-dasharray','stroke-linejoin','opacity','font-family','font-size','font-weight','text-anchor','paint-order'];
  const fixUrl=v=>v.replace(/url\(["']?[^#"')]*(#[^"')]+)["']?\)/,'url($1)');
  src.forEach((el,i)=>{const cs=getComputedStyle(el);dst[i].setAttribute('style',props.map(p=>`${p}:${fixUrl(cs.getPropertyValue(p))}`).join(';'));});
  const vb=svg.viewBox.baseVal,r=svg.getBoundingClientRect(),s=Math.max(2,2400/r.width),w=Math.round(r.width*s),h=Math.round(r.height*s);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--panel').trim()||'#fff';
  clone.setAttribute('width',w);clone.setAttribute('height',h);clone.removeAttribute('style');
  clone.insertAdjacentHTML('afterbegin',`<rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="${bg}"/>`);
  const img=new Image();
  img.onload=()=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`wall-plan-${st.wall.w}x${st.wall.h}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);},'image/png');
  };
  img.onerror=()=>{$('#status').textContent='Could not create the image here, try Save PDF instead.';};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
function exportPdf(){sel.clear();refresh();setTimeout(()=>window.print(),50);}

function renderTable(){
  const W=st.wall.w;
  let h=`<thead><tr><th>Board</th><th>Size</th><th>Colour</th><th>Left edge from left corner</th><th>Right edge from left corner</th><th>Gap to right corner</th><th>Bottom from floor</th><th>Top from floor</th>${st.desk.on?'<th>Bottom above desk</th>':''}<th>Drill hole 1 from left</th><th>Drill hole 2 from left</th><th>Drill holes from floor</th></tr></thead><tbody>`;
  st.boards.forEach((b,i)=>{const {w,h:hh}=sz(b);h+=`<tr${issues(b).length?' class="bad"':''}><td>${i+1}</td><td>${w}×${hh}</td><td>${(FIN[b.f]||FIN[FIRST_FIN]).name}</td><td>${fmt(b.x)}</td><td>${fmt(b.x+w)}</td><td>${fmt(W-b.x-w)}</td><td>${fmt(b.y)}</td><td>${fmt(b.y+hh)}</td>${st.desk.on?`<td>${fmt(b.y-st.desk.h)}</td>`:''}<td><b>${fmt(b.x+(w-screw(b))/2)}</b></td><td><b>${fmt(b.x+(w+screw(b))/2)}</b></td><td><b>${fmt(b.y+hh-st.railD)}</b></td></tr>`;});
  if(!st.boards.length)h+=`<tr><td colspan="9">No boards on the wall yet.</td></tr>`;
  $('#table').innerHTML=h+'</tbody>';
}
function renderSide(){renderInspector();renderStatus();renderShop();renderTable();renderSwatches();$('#undo').disabled=!hist.length;$('#redo').disabled=!fut.length;}
function refresh(){render();renderSide();}

function syncSettings(){
  document.querySelectorAll('[data-set]').forEach(el=>{
    const [a,b]=el.dataset.set.split('.');const v=b?st[a][b]:st[a];
    if(el.type==='checkbox')el.checked=!!v;else el.value=v;
  });
  const dh=document.querySelector('[data-set="desk.h"]'),cl=document.querySelector('[data-set="clear"]');
  dh.disabled=cl.disabled=!st.desk.on;$('#addStor').disabled=!st.desk.on;
}

/* ---------- actions ---------- */
function newId(p){return p+(st.nid++);}
function addSmart(s){
  const W=st.wall.w,{w}=SIZES[s];
  const R=recLine()??Math.round(st.wall.h/2-28);
  let x,y;
  if(st.boards.length){
    const lo=Math.min(...st.boards.map(b=>b.y)),row=st.boards.filter(b=>Math.abs(b.y-lo)<0.1);
    const right=Math.max(...row.map(b=>b.x+sz(b).w)),left=Math.min(...row.map(b=>b.x));
    if(right+J+w<=W+0.01){x=right+J;y=lo;}
    else if(left-J-w>=-0.01){x=left-J-w;y=lo;}
    else{y=Math.max(...st.boards.map(b=>b.y+sz(b).h))+J;x=(W-w)/2;}
  }else{x=(W-w)/2;y=R;}
  const b={id:newId('b'),s,x:r05(x),y:r05(y),f:st.lastF||FIRST_FIN};
  st.boards.push(b);sel=new Set([b.id]);
}
function act(a){
  const bs=selBoards(),W=st.wall.w;
  if(a==='selall'){sel=new Set(st.boards.map(b=>b.id));refresh();return;}
  if(!sel.size)return;
  op(()=>{
    const span=()=>({l:Math.min(...bs.map(b=>b.x)),r:Math.max(...bs.map(b=>b.x+sz(b).w)),lo:Math.min(...bs.map(b=>b.y))});
    const byX=[...bs].sort((a,b)=>a.x-b.x),sum=bs.reduce((t,b)=>t+sz(b).w,0);
    switch(a){
      case 'del':st.boards=st.boards.filter(b=>!sel.has(b.id));st.storage=st.storage.filter(s=>!sel.has(s.id));sel.clear();break;
      case 'center':{const s=span(),dx=(W-(s.r-s.l))/2-s.l;bs.forEach(b=>b.x=r05(b.x+dx));break;}
      case 'rec':{const R=recLine();if(R==null)break;const dy=R-span().lo;bs.forEach(b=>b.y=r05(b.y+dy));break;}
      case 'dup':{const s=span(),dx=s.r-s.l+J,fits=s.r+dx<=W+0.01;const ns=bs.map(b=>({...b,id:newId('b'),x:fits?b.x+dx:b.x,y:fits?b.y:b.y+Math.max(...bs.map(q=>q.y+sz(q).h))-s.lo+J}));st.boards.push(...ns);sel=new Set(ns.map(b=>b.id));break;}
      case 'alignB':{const m=Math.min(...bs.map(b=>b.y));bs.forEach(b=>b.y=m);break;}
      case 'alignT':{const m=Math.max(...bs.map(b=>b.y+sz(b).h));bs.forEach(b=>b.y=r05(m-sz(b).h));break;}
      case 'alignM':{const m=bs.reduce((t,b)=>t+b.y+sz(b).h/2,0)/bs.length;bs.forEach(b=>b.y=r05(m-sz(b).h/2));break;}
      case 'join':{let x=byX[0].x;byX.forEach(b=>{b.x=r05(x);x+=sz(b).w+J;});break;}
      case 'gaps':{if(bs.length<2)break;const s=span(),g=(s.r-s.l-sum)/(bs.length-1);let x=s.l;byX.forEach(b=>{b.x=r05(x);x+=sz(b).w+g;});break;}
      case 'spread':{const g=(W-sum)/(bs.length+1);let x=g;byX.forEach(b=>{b.x=r05(x);x+=sz(b).w+g;});break;}
    }
  });
}
function preset(p){
  op(()=>{
    const W=st.wall.w,R=recLine()??Math.round(st.wall.h/2-28),f=st.lastF||FIRST_FIN;
    const row=(list,y)=>{const tot=list.reduce((t,s)=>t+SIZES[s].w,0)+J*(list.length-1);let x=(W-tot)/2;return list.map(s=>{const b={id:newId('b'),s,x:r05(x),y:r05(y),f};x+=SIZES[s].w+J;return b;});};
    const P=(CFG.presets.find(q=>q.id===p)||{rows:[]}).rows.map(r=>r.filter(s=>SIZES[s]));
    st.boards=[];P.forEach((r,i)=>st.boards.push(...row(r,R+i*56.5)));sel.clear();
  });
}

/* ---------- pointer handling ---------- */
function toCm(e){const m=svg.getScreenCTM();if(!m)return{x:0,h:0};const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(m.inverse());return{x:q.x,h:st.wall.h-q.y};}
function startDrag(e,ids,pre,palette){
  const p=toCm(e);drag={ids,sx:p.x,sh:p.h,orig:{},moved:!!palette,pre,palette};
  ids.forEach(id=>{const o=boardById(id)||storById(id);if(o)drag.orig[id]={x:o.x,y:o.y};});
  document.body.classList.add('grabbing');
}
function dragTo(e){
  const p=toCm(e);let dx=p.x-drag.sx,dy=p.h-drag.sh;
  if(Math.abs(dx)>0.3||Math.abs(dy)>0.3)drag.moved=true;
  const W=st.wall.w,H=st.wall.h,mb=st.boards.filter(b=>drag.orig[b.id]),ms=st.storage.filter(s=>drag.orig[s.id]);
  guides=[];
  if(st.snap&&!e.altKey){
    const m=svg.getScreenCTM(),th=Math.max(1,8/(m?m.a:1));
    const pick=pairs=>{let best=null;pairs.forEach(([a,ts])=>ts.forEach(([t,gl])=>{const d=t-a;if(Math.abs(d)<th&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,gl};}));return best;};
    const ob=st.boards.filter(b=>!drag.orig[b.id]),os=st.storage.filter(s=>!drag.orig[s.id]);
    let px;
    if(mb.length){
      const l=Math.min(...mb.map(b=>drag.orig[b.id].x))+dx,r=Math.max(...mb.map(b=>drag.orig[b.id].x+sz(b).w))+dx;
      const L=[[0,0]],Rt=[[W,W]],C=[[W/2,W/2]];
      ob.forEach(b=>{const w=sz(b).w;L.push([b.x,b.x],[b.x+w+J,b.x+w+J/2]);Rt.push([b.x+w,b.x+w],[b.x-J,b.x-J/2]);C.push([b.x+w/2,b.x+w/2]);});
      os.forEach(s=>{L.push([s.x,s.x]);Rt.push([s.x+s.w,s.x+s.w]);});
      px=pick([[l,L],[r,Rt],[(l+r)/2,C]]);
    }else{
      const l=Math.min(...ms.map(s=>drag.orig[s.id].x))+dx,r=Math.max(...ms.map(s=>drag.orig[s.id].x+s.w))+dx;
      const T=[[0,0],[W,W]];ob.forEach(b=>{const w=sz(b).w;T.push([b.x,b.x],[b.x+w,b.x+w]);});os.forEach(s=>{T.push([s.x,s.x],[s.x+s.w,s.x+s.w]);});
      px=pick([[l,T],[r,T]]);
    }
    if(px){dx+=px.d;guides.push({v:px.gl});}
    if(mb.length){
      const lo=Math.min(...mb.map(b=>drag.orig[b.id].y))+dy,hi=Math.max(...mb.map(b=>drag.orig[b.id].y+sz(b).h))+dy;
      const B=[],Tp=[[H,H]],M=[];
      const R=recLine();if(R!=null)B.push([R,R],[st.desk.h,st.desk.h]);
      ob.forEach(b=>{const h=sz(b).h;B.push([b.y,b.y],[b.y+h+J,b.y+h+J/2]);Tp.push([b.y+h,b.y+h],[b.y-J,b.y-J/2]);M.push([b.y+h/2,b.y+h/2]);});
      const py=pick([[lo,B],[hi,Tp],[(lo+hi)/2,M]]);
      if(py){dy+=py.d;guides.push({h:py.gl});}
    }
  }
  mb.forEach(b=>{b.x=r05(drag.orig[b.id].x+dx);b.y=r05(drag.orig[b.id].y+dy);});
  ms.forEach(s=>{s.x=r05(drag.orig[s.id].x+dx);});
  render();fillInspector();renderStatus();
}
function endDrag(e){
  if(!drag)return;
  if(drag.palette){
    const p=toCm(e),b=boardById(drag.ids[0]);
    if(p.x<0||p.x>st.wall.w||p.h<0||p.h>st.wall.h){st.boards=st.boards.filter(x=>x!==b);sel.clear();}
    else commit(drag.pre);
  }else if(drag.moved)commit(drag.pre);
  drag=null;guides=[];document.body.classList.remove('grabbing');refresh();save();
}
svg.addEventListener('pointerdown',e=>{
  if(e.button>0)return;
  const t=e.target.closest('[data-id]');
  if(!t){if(!e.shiftKey&&sel.size){sel.clear();refresh();}return;}
  const id=t.dataset.id,multi=e.shiftKey||e.metaKey||e.ctrlKey;
  if(multi){if(sel.has(id))sel.delete(id);else sel.add(id);}
  else if(!sel.has(id))sel=new Set([id]);
  if(!sel.has(id)){refresh();return;}
  e.preventDefault();
  try{svg.setPointerCapture(e.pointerId);}catch(_){}
  startDrag(e,[...sel],JSON.stringify(st),false);
  refresh();
});
$('#tiles').addEventListener('pointerdown',e=>{
  const t=e.target.closest('[data-s]');if(!t||e.button>0)return;
  e.preventDefault();
  try{t.setPointerCapture(e.pointerId);}catch(_){}
  pend={s:t.dataset.s,cx:e.clientX,cy:e.clientY,pre:JSON.stringify(st),created:false};
});
window.addEventListener('pointermove',e=>{
  if(pend&&!pend.created&&Math.hypot(e.clientX-pend.cx,e.clientY-pend.cy)>5){
    const p=toCm(e),S=SIZES[pend.s];
    const b={id:newId('b'),s:pend.s,x:r05(p.x-S.w/2),y:r05(p.h-S.h/2),f:st.lastF||FIRST_FIN};
    st.boards.push(b);sel=new Set([b.id]);pend.created=true;
    startDrag(e,[b.id],pend.pre,true);
    refresh();
  }
  if(drag)dragTo(e);
});
window.addEventListener('pointerup',e=>{
  if(pend&&!pend.created){const pre=pend.pre,s=pend.s;pend=null;addSmart(s);commit(pre);refresh();return;}
  pend=null;endDrag(e);
});
window.addEventListener('pointercancel',e=>{pend=null;endDrag(e);});
$('#tiles').addEventListener('keydown',e=>{const t=e.target.closest('[data-s]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();op(()=>addSmart(t.dataset.s));}});

/* ---------- inputs ---------- */
document.querySelectorAll('[data-set]').forEach(el=>{
  const path=el.dataset.set.split('.');
  const set=v=>{if(path[1])st[path[0]][path[1]]=v;else st[path[0]]=v;};
  const val=()=>el.type==='checkbox'?el.checked:el.type==='number'?parseFloat(el.value):el.value;
  el.addEventListener('focus',()=>{el._pre=JSON.stringify(st);});
  el.addEventListener('input',()=>{const v=val();if(el.type==='number'&&isNaN(v))return;if(el.type==='checkbox'||el.tagName==='SELECT')return;set(v);render();renderStatus();renderTable();});
  el.addEventListener('change',()=>{const v=val();if(el.type==='number'&&isNaN(v))return;const pre=el._pre||JSON.stringify(st);set(v);commit(pre);el._pre=JSON.stringify(st);syncSettings();refresh();});
});
$('#swatches').addEventListener('click',e=>{const t=e.target.closest('[data-color]');if(!t)return;op(()=>{st.wall.color=t.dataset.color;});syncSettings();});
$('#addStor').addEventListener('click',()=>op(()=>{const s={id:newId('s'),x:r05(st.wall.w/2-15),w:30,h:30};st.storage.push(s);sel=new Set([s.id]);}));
$('#preset').addEventListener('change',e=>{const v=e.target.value;e.target.value='';if(v)preset(v);});
$('#undo').addEventListener('click',undo);$('#redo').addEventListener('click',redo);
$('#savePng').addEventListener('click',exportPng);$('#savePdf').addEventListener('click',exportPdf);

const insp=$('#inspector');
insp.addEventListener('focusin',e=>{if(e.target.dataset.ip)e.target._pre=JSON.stringify(st);});
insp.addEventListener('input',e=>{
  const el=e.target,k=el.dataset.ip;if(!k||el.tagName==='SELECT')return;
  const v=parseFloat(el.value);if(isNaN(v))return;
  const one=boardById([...sel][0])||storById([...sel][0]);if(!one)return;
  if((k==='w'||k==='h')&&v<=0)return;
  one[k]=v;render();renderStatus();renderTable();
});
insp.addEventListener('change',e=>{
  const el=e.target,k=el.dataset.ip;if(!k)return;
  const pre=el._pre||JSON.stringify(st);
  if(k==='s'||k==='f'){selBoards().forEach(b=>{b[k]=el.value;});if(k==='f')st.lastF=el.value;}
  commit(pre);el._pre=JSON.stringify(st);refresh();
});
insp.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(t)act(t.dataset.act);});

document.addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='select'||tag==='textarea')return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();act('selall');return;}
  if(!sel.size)return;
  if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();act('dup');return;}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();act('del');return;}
  if(e.key==='Escape'){sel.clear();refresh();return;}
  const step=e.shiftKey?10:1,mv={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,step],ArrowDown:[0,-step]}[e.key];
  if(mv){e.preventDefault();op(()=>{selBoards().forEach(b=>{b.x=r05(b.x+mv[0]);b.y=r05(b.y+mv[1]);});selStor().forEach(s=>{s.x=r05(s.x+mv[0]);});});}
});

function renderPresets(){$('#preset').insertAdjacentHTML('beforeend',CFG.presets.map(p=>`<option value="${p.id}">${p.label}</option>`).join(''));}

renderTiles();renderPresets();syncSettings();refresh();

// redraw when the drawing area changes width (rotate phone, resize window)
let lastW=0;
let lastH=window.innerHeight;
new ResizeObserver(()=>{const w=svg.parentNode.clientWidth;if(Math.abs(w-lastW)>1){lastW=w;render();}}).observe(svg.parentNode);
// mobile address bars change the height while scrolling, so only react to big changes
window.addEventListener('resize',()=>{if(Math.abs(window.innerHeight-lastH)>120){lastH=window.innerHeight;render();}});
