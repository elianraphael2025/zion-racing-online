(() => {
  const socket = io();
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const state = { joined: false, id: null, name: "Zion", color: "#17a8ff", players: [], coins: [], finishLaps: 3, maxPlayers: 8, keys: {}, touch: { left:false, right:false, gas:false }, notice: "JOIN TO PLAY", lastState: 0, countdown: 0, finishedShown: false };
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2 + 18, rx = 365, ry = 225, trackW = 118;

  function setConnection(ok) {
    $("connectionDot").parentElement.classList.toggle("connected", ok);
    $("connectionText").textContent = ok ? "Server connected" : "Reconnecting…";
  }
  socket.on("connect", () => setConnection(true));
  socket.on("disconnect", () => setConnection(false));
  socket.on("joinError", msg => { $("joinError").textContent = msg; $("joinButton").disabled = false; });
  socket.on("joined", data => {
    state.joined = true; state.id = data.id; state.name = data.name; state.color = data.color;
    state.finishLaps = data.finishLaps; state.maxPlayers = data.maxPlayers;
    $("joinPanel").classList.add("hidden");
    state.notice = "GET READY";
    startCountdown();
  });
  socket.on("state", data => {
    state.players = data.players || []; state.coins = data.coins || [];
    state.finishLaps = data.finishLaps || 3; state.maxPlayers = data.maxPlayers || 8;
    state.lastState = performance.now();
    updateHud();
  });
  socket.on("notice", msg => {
    state.notice = msg.toUpperCase();
    $("raceStatus").textContent = state.notice.length > 24 ? state.notice.slice(0, 22) + "…" : state.notice;
  });
  socket.on("coin", data => { $("coinHud").textContent = data.total; });

  function startCountdown() {
    const el = $("countdown");
    let n = 3;
    el.classList.remove("hidden"); el.textContent = n;
    const tick = () => {
      if (n > 1) { n--; el.textContent = n; setTimeout(tick, 800); }
      else { el.textContent = "GO!"; setTimeout(() => el.classList.add("hidden"), 650); }
    };
    setTimeout(tick, 800);
  }

  $("joinForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!socket.connected) { $("joinError").textContent = "Waiting for the game server…"; return; }
    $("joinError").textContent = "";
    $("joinButton").disabled = true;
    state.name = $("playerName").value.trim() || "Racer";
    socket.emit("join", { name: state.name });
  });
  $("copyLink").addEventListener("click", async () => {
    const status = $("copyStatus");
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = "Link copied — send it to your friends!";
    } catch (_) {
      status.textContent = "Copy this page's URL from your browser address bar.";
    }
  });
  $("raceAgain").addEventListener("click", () => location.reload());

  window.addEventListener("keydown", e => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    state.keys[e.key.toLowerCase()] = true;
  }, { passive:false });
  window.addEventListener("keyup", e => { state.keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { state.keys = {}; state.touch = {left:false,right:false,gas:false}; });

  function bindHold(id, key) {
    const el = $(id);
    const down = e => { e.preventDefault(); state.touch[key] = true; };
    const up = e => { e.preventDefault(); state.touch[key] = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }
  bindHold("leftBtn", "left"); bindHold("rightBtn", "right"); bindHold("gasBtn", "gas");

  setInterval(() => {
    if (!state.joined) return;
    const throttle = (state.keys.w || state.keys.arrowup || state.touch.gas ? 1 : 0) - (state.keys.s || state.keys.arrowdown ? 1 : 0);
    const steer = (state.keys.d || state.keys.arrowright || state.touch.right ? 1 : 0) - (state.keys.a || state.keys.arrowleft || state.touch.left ? 1 : 0);
    socket.emit("input", { throttle, steer, boost: !!(state.keys[" "] || state.keys.shift) });
  }, 50);

  function roundedRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function ellipsePath(scaleX, scaleY) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx*scaleX, ry*scaleY, 0, 0, Math.PI*2);
  }
  function drawBackground() {
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#69c9ed"); sky.addColorStop(1,"#b7e9f7");
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // distant clouds
    for (let i=0;i<8;i++) {
      const x = (i*173+35)%W, y = 85+(i%3)*32;
      ctx.fillStyle = "#ffffffb0";
      ctx.beginPath(); ctx.ellipse(x,y,38,13,0,0,Math.PI*2); ctx.ellipse(x+23,y-5,27,17,0,0,Math.PI*2); ctx.ellipse(x+48,y,31,12,0,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = "#63bd51"; ctx.fillRect(0,255,W,H-255);
    // blocky trees and distant buildings
    for (let i=0;i<17;i++) {
      const x = (i*79+18)%W, y = 260+(i%3)*18;
      ctx.fillStyle="#79512c"; ctx.fillRect(x-5,y+15,10,26);
      ctx.fillStyle=i%2?"#3cae42":"#48c64b"; ctx.fillRect(x-22,y-3,44,25); ctx.fillRect(x-13,y-18,27,20);
      ctx.strokeStyle="#237e36"; ctx.lineWidth=3; ctx.strokeRect(x-22,y-3,44,25);
    }
    // grass checker details
    ctx.fillStyle="#55b94b";
    for(let i=0;i<40;i++){const x=(i*137)%W,y=320+(i*61)%300;ctx.fillRect(x,y,22,4);}
  }
  function drawTrack() {
    // Outer grass-side curb, asphalt, inner grass island.
    ellipsePath(1.18,1.18); ctx.fillStyle="#f5f1e6"; ctx.fill();
    ctx.lineWidth=12; ctx.strokeStyle="#e9432e"; ctx.stroke();
    ellipsePath(1.08,1.08); ctx.fillStyle="#343b43"; ctx.fill();
    ctx.lineWidth=4; ctx.strokeStyle="#171d23"; ctx.stroke();
    ellipsePath(.77,.77); ctx.fillStyle="#55bd4b"; ctx.fill();
    ctx.lineWidth=11; ctx.strokeStyle="#f5f1e6"; ctx.stroke();
    // dashed lane line
    ellipsePath(.92,.92); ctx.lineWidth=4; ctx.strokeStyle="#f5f1e8"; ctx.setLineDash([22,18]); ctx.stroke(); ctx.setLineDash([]);
    // red/white curb ticks around outer edge
    for(let i=0;i<48;i++){
      const a=i*Math.PI*2/48, x=cx+Math.cos(a)*rx*1.12, y=cy+Math.sin(a)*ry*1.12;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle=i%2?"#f8f5e9":"#e8462e";ctx.fillRect(-10,-5,20,10);ctx.restore();
    }
    // start line on top straight-ish section
    const sx=cx, sy=cy-ry*1.08;
    ctx.save();ctx.translate(sx,sy);ctx.rotate(0);
    const tile=14;
    for(let i=0;i<8;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?"#fff":"#17202b";ctx.fillRect((i-4)*tile,j*tile,tile,tile);}
    ctx.restore();
    // start arch sign
    roundedRect(cx-88,cy-ry*1.08-67,176,42,9,"#e8492f","#242a31");
    ctx.fillStyle="#fff8e9";ctx.font="1000 22px Nunito, sans-serif";ctx.textAlign="center";ctx.fillText("START",cx,cy-ry*1.08-39);
    // decorative ramp and boost pads
    for(let i=0;i<3;i++){
      const x=cx+rx*.34+i*34,y=cy-ry*.78;
      ctx.save();ctx.translate(x,y);ctx.rotate(-.22);roundedRect(-13,-22,26,44,5,"#f1f2e9","#242a31");ctx.fillStyle="#e84b31";ctx.fillRect(-7,-13,14,7);ctx.fillRect(-7,0,14,7);ctx.restore();
    }
    // center island title
    ctx.fillStyle="#2b983c";ctx.beginPath();ctx.ellipse(cx,cy,rx*.55,ry*.53,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#258a36";ctx.beginPath();ctx.ellipse(cx+30,cy+30,rx*.3,ry*.25,0,0,Math.PI*2);ctx.fill();
    ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="1000 29px Nunito, sans-serif";ctx.fillText("ZION GRAND PRIX",cx,cy+8);
    ctx.font="800 12px Nunito, sans-serif";ctx.fillStyle="#d8ffd4";ctx.fillText("BLOCKY KART CIRCUIT",cx,cy+30);
    // trophy near infield
    ctx.font="32px serif";ctx.fillText("🏆",cx-130,cy-50);
  }
  function pointAt(progress, lane=0) {
    const a = (progress / 1000) * Math.PI * 2 - Math.PI/2;
    const outerRx = rx + lane*44, outerRy = ry + lane*30;
    return { x: cx + Math.cos(a)*outerRx, y: cy + Math.sin(a)*outerRy, angle:a+Math.PI/2 };
  }
  function drawCoin(progress) {
    const p=pointAt(progress,0);
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="#f7b900";ctx.strokeStyle="#805313";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#fff0a1";ctx.font="1000 14px Nunito";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("$",0,1);ctx.restore();
  }
  function drawCar(p, isMe) {
    const pt=pointAt(p.progress,p.lane);
    ctx.save();ctx.translate(pt.x,pt.y);ctx.rotate(pt.angle);
    // shadow
    roundedRect(-19,-10,42,27,7,"#15202b55");
    // wheels
    ctx.fillStyle="#20252b";roundedRect(-17,-13,11,7,3,"#20252b");roundedRect(7,-13,11,7,3,"#20252b");roundedRect(-17,8,11,7,3,"#20252b");roundedRect(7,8,11,7,3,"#20252b");
    // body and nose
    roundedRect(-20,-11,41,23,7,p.color,"#17212b");
    ctx.fillStyle="#ffffffcc";roundedRect(2,-7,10,15,4,"#d9f5ff","#263b4a");
    ctx.fillStyle="#fff2b3";roundedRect(15,-7,5,5,2,"#fff2b3");roundedRect(15,2,5,5,2,"#fff2b3");
    ctx.fillStyle="#182b3e";ctx.font="1000 10px Nunito";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText((p.lap+1).toString(),-8,1);
    if(isMe){ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    // name tag
    ctx.font="900 12px Nunito";ctx.textAlign="center";ctx.textBaseline="bottom";
    const labelY=pt.y-25;
    ctx.fillStyle="#17233ce8";const tw=ctx.measureText(p.name).width+14;
    roundedRect(pt.x-tw/2,labelY-18,tw,19,7,"#17233ce8");
    ctx.fillStyle="#fff";ctx.fillText(p.name,pt.x,labelY-3);
  }
  function updateHud() {
    const me=state.players.find(p=>p.id===state.id);
    $("playerCount").textContent=state.players.length;
    if(me){
      $("lapHud").textContent=`${Math.min(me.lap+1,state.finishLaps)} / ${state.finishLaps}`;
      $("coinHud").textContent=me.coins;
      $("speedHud").textContent=Math.round(me.speed*160);
      if(me.finished&&!state.finishedShown){
        state.finishedShown=true;
        $("finishTitle").textContent=me.finishPlace===1?"You won the race!":`You finished #${me.finishPlace}!`;
        $("finishCopy").textContent=`You collected ${me.coins} coins. Want another lap?`;
        $("finishOverlay").classList.remove("hidden");
      }
    }
    const sorted=[...state.players].sort((a,b)=>b.lap-a.lap || b.progress-a.progress);
    const list=$("leaderboard");list.innerHTML="";
    if(!sorted.length){list.innerHTML='<li class="empty-state">Waiting for racers…</li>';return;}
    sorted.forEach((p,i)=>{
      const li=document.createElement("li");
      const rank=document.createElement("span");rank.className="rank";rank.textContent=p.finishPlace||i+1;
      const dot=document.createElement("span");dot.className="car-dot";dot.style.background=p.color;
      const name=document.createElement("span");name.className="racer-name";name.textContent=p.name+(p.id===state.id?" (you)":"");
      const meta=document.createElement("span");meta.className="racer-meta";meta.textContent=p.finished?"FINISH":`L${Math.min(p.lap+1,state.finishLaps)}`;
      li.append(rank,dot,name,meta);list.appendChild(li);
    });
  }
  function draw() {
    drawBackground();drawTrack();
    state.coins.filter(c=>c.active).forEach(c=>drawCoin(c.progress));
    const sorted=[...state.players].sort((a,b)=>a.progress-b.progress);
    sorted.forEach(p=>drawCar(p,p.id===state.id));
    // small signboards
    ctx.save();ctx.translate(74,440);ctx.rotate(-.08);roundedRect(-46,-19,92,38,5,"#f6f0dc","#222b31");ctx.fillStyle="#e84a31";ctx.font="1000 12px Nunito";ctx.textAlign="center";ctx.fillText("TURBO!",0,4);ctx.restore();
    requestAnimationFrame(draw);
  }
  draw();
})();
