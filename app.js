const KEY = "sjw_jsonbin_v1";
const CONFIG_KEY = "sjw_jsonbin_config";
const intervals = [1,2,4,7,15,30];

let state = {
  tab:"home",
  session:null,
  activeTimer:null,
  sessions:[],
  reviews:[],
  settings:{},
  cloud:false,
  syncing:false,
  lastSync:null
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id_"+Date.now()+"_"+Math.random().toString(16).slice(2));
const nowISO = () => new Date().toISOString();

function fmt(sec){
  sec=Math.max(0,Math.floor(sec||0));
  const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
}
function fmtMin(sec){return Math.round((sec||0)/60)+" 分钟";}
function toast(t){
  const e=$("#toast"); e.textContent=t; e.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>e.classList.remove("show"),1900);
}
function localDate(iso=nowISO()){
  const d=new Date(iso);
  return d.toLocaleDateString("sv-SE",{timeZone:"Australia/Brisbane"});
}
function dueCount(){
  return state.reviews.filter(r=>!r.completed && new Date(r.due_at)<=new Date()).length;
}
function totalSeconds(){
  return state.sessions.reduce((a,s)=>a+(Number(s.duration_seconds)||0),0);
}
function saveLocal(){
  localStorage.setItem(KEY,JSON.stringify({
    sessions:state.sessions,
    reviews:state.reviews,
    activeTimer:state.activeTimer,
    settings:state.settings
  }));
}
function loadLocal(){
  try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}
}
function getConfig(){
  return {...(window.SJW_CONFIG||{})};
}
function saveConfig(c){
  window.SJW_CONFIG={...getConfig(),...c};
  localStorage.setItem(CONFIG_KEY,JSON.stringify(window.SJW_CONFIG));
}
function workerConfigured(){
  return !!getConfig().SYNC_WORKER_URL;
}
function cloudLabel(){
  if(!workerConfigured()) return `<span class="pill local">本机保存</span>`;
  if(state.syncing) return `<span class="pill">☁ 同步中…</span>`;
  if(state.cloud) return `<span class="pill cloud">☁ 已同步</span>`;
  return `<span class="pill">☁ 待连接</span>`;
}

function render(){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.tab));
  const a=$("#app");
  if(state.tab==="home") a.innerHTML=home();
  if(state.tab==="learn") a.innerHTML=learn();
  if(state.tab==="review") a.innerHTML=review();
  if(state.tab==="stats") a.innerHTML=stats();
  bind();
}

function home(){
  const mins=Math.round(totalSeconds()/60), d=dueCount();
  const today=localDate();
  const todaySeconds=state.sessions.filter(s=>localDate(s.created_at)===today).reduce((a,s)=>a+(Number(s.duration_seconds)||0),0);
  return `
  <section class="hero">
    <div class="muted">${new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"long"})}</div>
    <h1>今天，也听一点英语。</h1>
    <div class="muted">尚捷雯精听 · 独立记录，不与“每日英语听力”同步</div>
    <div style="margin-top:14px">${cloudLabel()}</div>
    <div class="grid">
      <div class="metric"><span class="muted">今日分钟</span><strong>${Math.round(todaySeconds/60)}</strong></div>
      <div class="metric"><span class="muted">累计分钟</span><strong>${mins}</strong></div>
      <div class="metric"><span class="muted">待复习</span><strong>${d}</strong></div>
    </div>
  </section>

  <div class="card">
    <h2>继续学习</h2>
    <p class="muted">计时器使用“开始时间戳”计算。你可以离开这个网页去其他网站或 App 学习，回来后按真实经过的时间计算，不依赖网页后台每秒运行。</p>
    <button class="btn full" onclick="state.tab='learn';render()">${state.activeTimer?"返回计时器":"开始精听"}</button>
  </div>

  <div class="card">
    <div class="row between"><h2>最近学习</h2>${cloudLabel()}</div>
    ${state.sessions.slice(0,6).map(s=>`
      <div class="review-item">
        <div>
          <b>${esc(s.title||"未命名学习")}</b>
          <div class="muted">${esc(s.study_type||"精听")} · ${fmt(s.duration_seconds)} · ${new Date(s.created_at).toLocaleDateString("zh-CN")}</div>
        </div>
        <span class="pill">${s.understanding?`理解 ${s.understanding}/5`:"未评分"}</span>
      </div>`).join("") || `<div class="muted empty">还没有学习记录。</div>`}
  </div>`;
}

function learn(){
  const active=state.activeTimer;
  const elapsed=active?Math.max(0,Math.floor((Date.now()-new Date(active.started_at).getTime())/1000)):0;
  if(active){
    return `
    <div class="card">
      <h2>正在学习</h2>
      <span class="pill">计时中 · ${esc(active.title)}</span>
      <div id="timer" class="timer running">${fmt(elapsed)}</div>
      <div class="muted" style="text-align:center;margin-bottom:18px">开始时间：${new Date(active.started_at).toLocaleString("zh-CN")}</div>
      <div class="actions">
        <button class="btn full" id="stopBtn">结束并保存</button>
        <button class="btn secondary" id="cancelBtn">取消计时</button>
      </div>
    </div>
    <div class="card">
      <h2>为什么离开网页也能计时？</h2>
      <p class="muted">网站保存的是开始时间，而不是依赖 JavaScript 一直在后台运行。因此 Safari/Chrome 对后台页面降频或暂停时，回来仍会按时间差计算。</p>
    </div>`;
  }
  return `
  <div class="card">
    <h2>开始一次学习</h2>
    <div class="field"><label>内容 / 文章名称</label><input id="title" placeholder="例如：BBC 6 Minute English"></div>
    <div class="field"><label>学习方式</label>
      <select id="type"><option>精听</option><option>听写</option><option>跟读</option><option>泛听</option><option>复习</option></select>
    </div>
    <button class="btn full" id="startBtn">开始计时</button>
  </div>
  <div class="card">
    <h2>学习后记录</h2>
    <p class="muted">结束计时后可以填写理解程度、单词数量和笔记。第一次保存会自动安排 1 天后的复习。</p>
  </div>`;
}

function review(){
  const list=state.reviews.filter(r=>!r.completed).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at));
  return `
  <div class="card">
    <h2>复习中心</h2>
    <p class="muted">间隔：1 → 2 → 4 → 7 → 15 → 30 天。每完成一次，到下一阶段。</p>
    ${list.map(r=>{
      const isDue=new Date(r.due_at)<=new Date();
      return `<div class="review-item">
        <div><b>${esc(r.title)}</b><div class="muted">第 ${r.interval_index+1} 次 · ${new Date(r.due_at).toLocaleDateString("zh-CN")}</div></div>
        <button class="btn ${isDue?"":"secondary"}" data-review="${r.id}" ${isDue?"":"disabled"}>${isDue?"完成":"待到期"}</button>
      </div>`;
    }).join("") || `<div class="muted empty">目前没有待处理复习。</div>`}
  </div>`;
}

function stats(){
  const days={};
  for(let i=13;i>=0;i--){
    const d=new Date(Date.now()-i*86400000);
    days[d.toLocaleDateString("sv-SE",{timeZone:"Australia/Brisbane"})]=0;
  }
  state.sessions.forEach(s=>{
    const d=localDate(s.created_at);
    if(days[d]!=null) days[d]+=Math.round((Number(s.duration_seconds)||0)/60);
  });
  const max=Math.max(1,...Object.values(days));
  const rated=state.sessions.filter(s=>Number(s.understanding)>0);
  const avg=rated.length?(rated.reduce((a,s)=>a+Number(s.understanding),0)/rated.length).toFixed(1):"0.0";
  const streak=calcStreak();
  return `
  <div class="card">
    <h2>最近 14 天</h2>
    ${Object.entries(days).map(([d,v])=>`
      <div class="bar-row">
        <span class="bar-label">${d.slice(5)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(v?2:0,v/max*100)}%"></div></div>
        <span class="bar-value">${v}m</span>
      </div>`).join("")}
  </div>
  <div class="grid">
    <div class="metric"><span class="muted">总时长</span><strong>${Math.round(totalSeconds()/60)}m</strong></div>
    <div class="metric"><span class="muted">学习次数</span><strong>${state.sessions.length}</strong></div>
    <div class="metric"><span class="muted">连续学习</span><strong>${streak}天</strong></div>
  </div>
  <div class="grid">
    <div class="metric"><span class="muted">总词数</span><strong>${state.sessions.reduce((a,s)=>a+(Number(s.words)||0),0)}</strong></div>
    <div class="metric"><span class="muted">平均理解</span><strong>${avg}</strong></div>
    <div class="metric"><span class="muted">复习完成</span><strong>${state.reviews.filter(r=>r.completed).length}</strong></div>
  </div>`;
}

function calcStreak(){
  const set=new Set(state.sessions.map(s=>localDate(s.created_at)));
  let d=new Date();
  let key=d.toLocaleDateString("sv-SE",{timeZone:"Australia/Brisbane"});
  if(!set.has(key)){
    d.setDate(d.getDate()-1);
    key=d.toLocaleDateString("sv-SE",{timeZone:"Australia/Brisbane"});
    if(!set.has(key)) return 0;
  }
  let n=0;
  while(set.has(key)){
    n++;
    d.setDate(d.getDate()-1);
    key=d.toLocaleDateString("sv-SE",{timeZone:"Australia/Brisbane"});
  }
  return n;
}

function settings(){
  const c=getConfig();
  return `
  <div class="modal">
    <div class="modal-box">
      <div class="row between"><h2>设置</h2><button class="btn secondary" id="closeModal">关闭</button></div>

      <div class="card">
        <h2>云同步</h2>
        <p class="muted">推荐：GitHub Pages → Cloudflare Worker → JSONBin。JSONBin 的 Master Key 不放在前端。</p>
        <div class="field"><label>Cloudflare Worker URL</label><input id="workerUrl" value="${esc(c.SYNC_WORKER_URL||"")}" placeholder="https://xxxx.your-subdomain.workers.dev"></div>
        <div class="field"><label>同步 Token（如果 Worker 设置了）</label><input id="syncToken" value="${esc(c.SYNC_TOKEN||"")}" placeholder="可选"></div>
        <div class="actions">
          <button class="btn full" id="saveCloud">保存配置</button>
          <button class="btn secondary full" id="syncNow">立即同步</button>
        </div>
        <p class="muted small" style="margin-top:10px">${state.lastSync?`上次同步：${new Date(state.lastSync).toLocaleString("zh-CN")}`:"尚未同步"}</p>
      </div>

      <div class="card">
        <h2>本地备份</h2>
        <div class="actions">
          <button class="btn secondary full" id="export">导出 JSON</button>
          <label class="btn secondary full" style="text-align:center;cursor:pointer">导入 JSON<input id="importFile" type="file" accept=".json,application/json" style="display:none"></label>
        </div>
      </div>

      <div class="card">
        <h2>当前状态</h2>
        <p class="muted">${state.cloud?"☁ 云端同步已连接":"▣ 本机模式"}</p>
        <p class="muted">学习记录：${state.sessions.length} 条 · 复习：${state.reviews.length} 条</p>
      </div>
    </div>
  </div>`;
}

function openSettings(){
  $("#modalRoot").innerHTML=settings();
  bindSettings();
}
function bindSettings(){
  $("#closeModal").onclick=()=>$("#modalRoot").innerHTML="";
  $("#saveCloud").onclick=()=>{
    saveConfig({
      SYNC_WORKER_URL:$("#workerUrl").value.trim().replace(/\/+$/,""),
      SYNC_TOKEN:$("#syncToken").value.trim()
    });
    toast("云端配置已保存");
    $("#modalRoot").innerHTML="";
    state.cloud=false;
    render();
    if(workerConfigured()) syncCloud();
  };
  $("#syncNow").onclick=()=>syncCloud();
  $("#export").onclick=exportData;
  $("#importFile").onchange=importData;
}

function exportData(){
  const payload=buildCloudPayload();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="尚捷雯精听备份-"+localDate()+".json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importData(ev){
  const file=ev.target.files?.[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const x=JSON.parse(reader.result);
      if(!Array.isArray(x.sessions)||!Array.isArray(x.reviews)) throw new Error("格式不正确");
      state.sessions=x.sessions;
      state.reviews=x.reviews;
      state.activeTimer=x.activeTimer||null;
      saveLocal(); render();
      toast("导入成功");
    }catch(e){toast("导入失败：JSON 格式不正确")}
  };
  reader.readAsText(file);
}

function buildCloudPayload(){
  return {
    app:"shangjiewen-jingting",
    schema:1,
    updated_at:nowISO(),
    sessions:state.sessions,
    reviews:state.reviews,
    activeTimer:state.activeTimer
  };
}

async function workerFetch(path, options={}){
  const url=(getConfig().SYNC_WORKER_URL||"").replace(/\/+$/,"")+path;
  if(!url)return null;
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(getConfig().SYNC_TOKEN) headers["X-Sync-Token"]=getConfig().SYNC_TOKEN;
  const res=await fetch(url,{...options,headers});
  const text=await res.text();
  let data=null;
  try{data=JSON.parse(text)}catch{data={raw:text}}
  if(!res.ok) throw new Error(data?.error||`HTTP ${res.status}`);
  return data;
}

async function syncCloud(){
  if(!workerConfigured()){
    toast("请先填写 Worker URL");
    return;
  }
  if(state.syncing)return;
  state.syncing=true; render();
  try{
    const remote=await workerFetch("/data",{method:"GET"});
    if(remote?.data){
      const r=remote.data;
      const remoteUpdated=new Date(r.updated_at||0).getTime();
      const localUpdated=Math.max(
        ...state.sessions.map(x=>new Date(x.updated_at||x.created_at||0).getTime()),
        ...state.reviews.map(x=>new Date(x.updated_at||x.created_at||0).getTime()),
        state.activeTimer?new Date(state.activeTimer.updated_at||state.activeTimer.started_at||0).getTime():0,
        0
      );
      if(remoteUpdated>localUpdated && (state.sessions.length||state.reviews.length||state.activeTimer)){
        // Prefer the newer cloud snapshot when it has a newer top-level timestamp.
        state.sessions=Array.isArray(r.sessions)?r.sessions:[];
        state.reviews=Array.isArray(r.reviews)?r.reviews:[];
        state.activeTimer=r.activeTimer||null;
        saveLocal();
      } else if(!state.sessions.length && !state.reviews.length && !state.activeTimer){
        state.sessions=Array.isArray(r.sessions)?r.sessions:[];
        state.reviews=Array.isArray(r.reviews)?r.reviews:[];
        state.activeTimer=r.activeTimer||null;
        saveLocal();
      }
    }
    await workerFetch("/data",{method:"PUT",body:JSON.stringify(buildCloudPayload())});
    state.cloud=true;
    state.lastSync=nowISO();
    state.syncing=false;
    saveLocal(); render();
    toast("云端同步完成");
  }catch(e){
    console.error(e);
    state.syncing=false; state.cloud=false; render();
    toast("云端同步失败：请检查 Worker 配置");
  }
}

async function startTimer(){
  const title=$("#title").value.trim()||"未命名学习";
  const type=$("#type").value;
  state.activeTimer={
    id:uid(),
    title,
    study_type:type,
    started_at:nowISO(),
    updated_at:nowISO()
  };
  saveLocal();
  render();
  tick();
  // Save immediately to cloud so another device can recover the active timer.
  if(workerConfigured()){
    try{
      await workerFetch("/data",{method:"PUT",body:JSON.stringify(buildCloudPayload())});
      state.cloud=true; state.lastSync=nowISO();
    }catch(e){console.warn(e)}
  }
}

function tick(){
  const el=$("#timer");
  if(!el||!state.activeTimer)return;
  const elapsed=(Date.now()-new Date(state.activeTimer.started_at).getTime())/1000;
  el.textContent=fmt(elapsed);
  clearTimeout(window.__tickTimer);
  window.__tickTimer=setTimeout(tick,1000);
}

async function stopTimer(){
  if(!state.activeTimer)return;
  const a=state.activeTimer;
  const end=new Date();
  const seconds=Math.max(0,Math.floor((end-new Date(a.started_at))/1000));

  const s={
    id:uid(),
    title:a.title,
    study_type:a.study_type,
    duration_seconds:seconds,
    words:0,
    understanding:null,
    notes:"",
    started_at:a.started_at,
    ended_at:end.toISOString(),
    created_at:end.toISOString(),
    updated_at:end.toISOString()
  };
  state.sessions.unshift(s);

  const review={
    id:uid(),
    title:a.title,
    due_at:new Date(end.getTime()+86400000).toISOString(),
    interval_index:0,
    completed:false,
    created_at:end.toISOString(),
    updated_at:end.toISOString()
  };
  state.reviews.unshift(review);
  state.activeTimer=null;
  saveLocal();

  state.tab="home"; render();
  toast(`已保存 ${fmt(seconds)}`);

  if(workerConfigured()){
    try{
      await workerFetch("/data",{method:"PUT",body:JSON.stringify(buildCloudPayload())});
      state.cloud=true; state.lastSync=nowISO(); saveLocal();
    }catch(e){console.warn(e);toast("本地已保存，云端同步失败")}
  }
}

async function cancelTimer(){
  state.activeTimer=null; saveLocal(); render();
  if(workerConfigured()){
    try{await workerFetch("/data",{method:"PUT",body:JSON.stringify(buildCloudPayload())});state.cloud=true;state.lastSync=nowISO()}catch(e){}
  }
}

async function completeReview(id){
  const r=state.reviews.find(x=>x.id===id);
  if(!r||r.completed||new Date(r.due_at)>new Date())return;
  const next=r.interval_index+1;
  if(next>=intervals.length) r.completed=true;
  else{
    r.interval_index=next;
    r.due_at=new Date(Date.now()+intervals[next]*86400000).toISOString();
  }
  r.updated_at=nowISO();
  saveLocal(); render();
  if(workerConfigured()){
    try{
      await workerFetch("/data",{method:"PUT",body:JSON.stringify(buildCloudPayload())});
      state.cloud=true;state.lastSync=nowISO();saveLocal();
    }catch(e){toast("复习已完成，本地保存成功")}
  }
}

function bind(){
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{
    state.tab=b.dataset.tab; render();
    if(state.activeTimer)tick();
  });
  $("#settingsBtn").onclick=openSettings;
  if($("#startBtn"))$("#startBtn").onclick=startTimer;
  if($("#stopBtn"))$("#stopBtn").onclick=stopTimer;
  if($("#cancelBtn"))$("#cancelBtn").onclick=cancelTimer;
  document.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>completeReview(b.dataset.review));
}

function boot(){
  const saved=loadLocal();
  state.sessions=Array.isArray(saved.sessions)?saved.sessions:[];
  state.reviews=Array.isArray(saved.reviews)?saved.reviews:[];
  state.activeTimer=saved.activeTimer||null;
  state.settings=saved.settings||{};
  try{
    const cfg=localStorage.getItem(CONFIG_KEY);
    if(cfg)window.SJW_CONFIG={...(window.SJW_CONFIG||{}),...JSON.parse(cfg)};
  }catch(_){}
  render();
  if(state.activeTimer)tick();
  if(workerConfigured()) syncCloud();
}
boot();
