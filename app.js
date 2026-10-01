const KEY="sjw_jingting_v2";
const INTERVALS=[1,2,4,7,15,30];
const TYPES=["精听","听写","跟读","泛听","复习"];
let state=load();
let tab="home", timer=0, timerId=null, selectedType="精听";

function load(){
  try{return JSON.parse(localStorage.getItem(KEY))||{sessions:[],reviews:[]}}catch(e){return {sessions:[],reviews:[]}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function fmtMin(m){m=Math.round(m||0); return m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`}
function dateKey(d=new Date()){return new Date(d).toISOString().slice(0,10)}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return dateKey(d)}
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function sessionsToday(){return state.sessions.filter(x=>x.date===dateKey())}
function totalMin(){return state.sessions.reduce((a,x)=>a+(x.minutes||0),0)}
function streak(){
  const set=new Set(state.sessions.map(x=>x.date)); let n=0,d=new Date();
  while(set.has(dateKey(d))){n++;d.setDate(d.getDate()-1)} return n;
}
function dueReviews(){const today=dateKey();return state.reviews.filter(x=>x.next<=today&&!x.done)}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function render(){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  const app=document.getElementById("app");
  app.innerHTML=tab==="home"?home():tab==="learn"?learn():tab==="review"?review():stats();
}
function home(){
  const today=sessionsToday(), min=today.reduce((a,x)=>a+x.minutes,0), due=dueReviews();
  const goal=30, pct=Math.min(100,Math.round(min/goal*100));
  return `<section class="hero">
    <div class="eyebrow">TODAY · ${dateKey()}</div>
    <h1>${min>=goal?"今天完成得很好。":"今天，留一点时间给英语。"} </h1>
    <div class="hero-row">
      <div class="hero-stat"><strong>${fmtMin(min)}</strong>今日学习</div>
      <div class="hero-stat"><strong>${streak()}</strong>连续天数</div>
      <button class="primary" onclick="tab='learn';render()">开始精听</button>
    </div>
  </section>
  <div class="section-title"><h2>学习概览</h2><span>持续记录比一次学很多更重要</span></div>
  <div class="grid">
    <div class="card metric"><div class="label">今日时长</div><div class="value">${min}<span class="unit">min</span></div></div>
    <div class="card metric"><div class="label">累计学习</div><div class="value">${Math.round(totalMin())}<span class="unit">min</span></div></div>
    <div class="card metric"><div class="label">学习天数</div><div class="value">${new Set(state.sessions.map(x=>x.date)).size}<span class="unit">days</span></div></div>
    <div class="card metric"><div class="label">待复习</div><div class="value">${due.length}<span class="unit">项</span></div></div>
  </div>
  <div class="section-title"><h2>今日目标</h2><span>${min}/${goal} min</span></div>
  <div class="card"><div class="progress"><i style="width:${pct}%"></i></div><div style="margin-top:10px;color:var(--muted);font-size:12px">${pct>=100?"目标完成。":"再学习 "+Math.max(0,goal-min)+" 分钟即可完成今日目标。"}</div></div>
  <div class="section-title"><h2>今天该做什么</h2><span>${due.length?"优先复习":"暂无到期复习"}</span></div>
  <div class="card">${due.length?due.slice(0,3).map((x,i)=>reviewRow(x,i)).join(""):`<div class="empty">今天没有到期复习。可以开始一篇新的精听。</div>`}</div>`;
}
function reviewRow(x,i){
  return `<div class="review-item" style="margin:${i?12:0}px 0 0">
    <div class="review-day">${x.stage?`第${x.stage}轮`:"复习"}</div>
    <div class="review-info"><strong>${esc(x.title)}</strong><small>${x.next} · 间隔 ${x.interval||1} 天</small></div>
    <button class="secondary" onclick="completeReview('${x.id}')">完成</button>
  </div>`;
}
function learn(){
  return `<div class="section-title"><h2>开始一次学习</h2><span>记录你的真实过程</span></div>
  <div class="card form-card">
    <div class="field"><label>内容 / 文章标题</label><input id="title" class="input" placeholder="例如：BBC 6 Minute English — Sleep"></div>
    <div class="field"><label>学习方式</label><div class="type-grid">${TYPES.map(t=>`<button class="type-btn ${t===selectedType?"selected":""}" onclick="selectedType='${t}';render()">${t}</button>`).join("")}</div></div>
    <div class="field"><label>计时</label><div id="timer" class="timer">${timeText(timer)}</div><div class="timer-actions"><button class="secondary" onclick="toggleTimer()">${timerId?"暂停":"开始计时"}</button><button class="secondary" onclick="resetTimer()">重置</button></div></div>
    <div class="field"><label>理解度（1–5）</label><select id="understanding" class="select"><option value="5">5 · 几乎完全理解</option><option value="4">4 · 基本理解</option><option value="3" selected>3 · 一半左右</option><option value="2">2 · 比较困难</option><option value="1">1 · 很困难</option></select></div>
    <div class="field"><label>新单词数量</label><input id="words" class="input" type="number" min="0" value="0"></div>
    <div class="field"><label>句子 / 听写记录</label><textarea id="notes" class="textarea" placeholder="记录听不出来的句子、发音、连读、易错点……"></textarea></div>
    <button class="primary" style="width:100%" onclick="saveSession()">保存本次学习</button>
  </div>`;
}
function timeText(s){const h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor(s%3600/60)).padStart(2,"0"),q=String(s%60).padStart(2,"0");return `${h}:${m}:${q}`}
function toggleTimer(){
  if(timerId){clearInterval(timerId);timerId=null;render();return}
  timerId=setInterval(()=>{timer++;const el=document.getElementById("timer");if(el)el.textContent=timeText(timer)},1000);render()
}
function resetTimer(){if(timerId){clearInterval(timerId);timerId=null}timer=0;render()}
function saveSession(){
  const title=document.getElementById("title").value.trim();
  if(!title){toast("请先填写文章标题");return}
  const minutes=Math.max(1,Math.round(timer/60));
  const item={id:crypto.randomUUID(),date:dateKey(),title,type:selectedType,minutes,understanding:+document.getElementById("understanding").value,words:+document.getElementById("words").value||0,notes:document.getElementById("notes").value.trim()};
  state.sessions.push(item);
  state.reviews.push({id:crypto.randomUUID(),sessionId:item.id,title:item.title,next:dateKey(new Date(Date.now()+86400000)),interval:1,stage:1,done:false});
  save();resetTimer();toast("已保存，并安排 1 天后复习");tab="home";render();
}
function review(){
  const due=dueReviews(), upcoming=state.reviews.filter(x=>!x.done&&x.next>dateKey()).sort((a,b)=>a.next.localeCompare(b.next));
  return `<div class="section-title"><h2>复习中心</h2><span>${due.length} 项到期</span></div>
  <div class="card">${due.length?`<div class="list">${due.map((x,i)=>reviewRow(x,i)).join("")}</div>`:`<div class="empty">目前没有到期任务。继续保持。</div>`}</div>
  <div class="section-title"><h2>接下来</h2><span>间隔重复</span></div>
  <div class="card">${upcoming.length?`<div class="list">${upcoming.slice(0,8).map(x=>`<div class="review-item"><div class="review-day">${x.interval}d</div><div class="review-info"><strong>${esc(x.title)}</strong><small>${x.next} · 第${x.stage}轮</small></div></div>`).join("")}</div>`:`<div class="empty">暂无安排。</div>`}</div>`;
}
function completeReview(id){
  const x=state.reviews.find(r=>r.id===id);if(!x)return;
  const idx=INTERVALS.indexOf(x.interval);const nextInt=INTERVALS[Math.min(idx+1,INTERVALS.length-1)];
  if(idx===INTERVALS.length-1){x.done=true;x.completed=dateKey();toast("完成最终复习");}
  else{x.interval=nextInt;x.stage=(x.stage||1)+1;x.next=dateKey(new Date(Date.now()+nextInt*86400000));toast(`完成，下一次复习：${nextInt} 天后`)}
  save();render();
}
function stats(){
  const days=Array.from({length:14},(_,i)=>daysAgo(13-i)), map=Object.fromEntries(days.map(d=>[d,0]));
  state.sessions.forEach(x=>{if(map[x.date]!=null)map[x.date]+=x.minutes});
  const max=Math.max(1,...Object.values(map));
  const avg=state.sessions.length?state.sessions.reduce((a,x)=>a+x.understanding,0)/state.sessions.length:0;
  const words=state.sessions.reduce((a,x)=>a+x.words,0);
  return `<div class="section-title"><h2>学习统计</h2><span>最近 14 天</span></div>
  <div class="grid">
    <div class="card metric"><div class="label">累计时长</div><div class="value">${fmtMin(totalMin())}</div></div>
    <div class="card metric"><div class="label">平均理解度</div><div class="value">${avg?avg.toFixed(1):"—"}<span class="unit">/5</span></div></div>
    <div class="card metric"><div class="label">累计单词</div><div class="value">${words}</div></div>
    <div class="card metric"><div class="label">连续学习</div><div class="value">${streak()}<span class="unit">天</span></div></div>
  </div>
  <div class="section-title"><h2>每日学习时长</h2><span>分钟</span></div>
  <div class="card"><div class="chart">${days.map(d=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(3,map[d]/max*130)}px"></div><small>${d.slice(5)}</small></div>`).join("")}</div></div>
  <div class="section-title"><h2>你的学习节奏</h2></div>
  <div class="card"><p style="margin:0;line-height:1.7;font-size:14px;color:var(--muted)">${state.sessions.length===0?"完成第一次学习后，这里会开始形成你的长期数据。":`你已经记录 ${state.sessions.length} 次学习。继续保持规律记录，之后可以更准确地观察理解度和复习效果。`}</p></div>`;
}
function settings(){
  document.getElementById("modalRoot").innerHTML=`<div class="modal-back" onclick="if(event.target===this)closeSettings()"><div class="modal">
    <div class="modal-head"><h3>设置与数据</h3><button class="close" onclick="closeSettings()">×</button></div>
    <div class="settings-row"><span>本地数据</span><strong>${state.sessions.length} 次学习</strong></div>
    <div class="settings-row"><span>导出备份</span><button class="secondary" onclick="exportData()">导出 JSON</button></div>
    <div class="settings-row"><span>导入备份</span><button class="secondary" onclick="document.getElementById('fileInput').click()">选择文件</button></div>
    <div class="settings-row"><span>清空数据</span><button class="secondary" style="color:var(--danger)" onclick="clearData()">清空</button></div>
    <input id="fileInput" type="file" accept=".json" hidden onchange="importData(event)">
    <p style="color:var(--muted);font-size:12px;line-height:1.6;margin-top:18px">当前版本先采用浏览器本地保存，适合个人使用。下一阶段可接入云端账号，让 iPhone、iPad 和电脑共享同一份数据。</p>
  </div></div>`;
}
function closeSettings(){document.getElementById("modalRoot").innerHTML=""}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=`shangjiewen-jingting-${dateKey()}.json`;a.click();URL.revokeObjectURL(a.href);toast("备份已导出")
}
function importData(e){
  const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.sessions||!x.reviews)throw 0;state=x;save();closeSettings();render();toast("数据已恢复")}catch{toast("文件格式不正确")}};r.readAsText(f)
}
function clearData(){if(confirm("确定清空所有学习记录吗？建议先导出备份。")){state={sessions:[],reviews:[]};save();closeSettings();render();toast("已清空")}}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;render()}));
document.getElementById("settingsBtn").onclick=settings;
render();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
