import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL="https://rjllafrkmwijvqojmdsd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bKV0bBUCuIT884X0gJS9sg_Sa7NpG8G";
const CHATGPT_PLUGIN_URL="https://chatgpt.com/plugins/plugins_6abb7ec5911c81918121975d1e81bd0b";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const $=(id:string)=>document.getElementById(id)!;
let missionId=sessionStorage.getItem("glowMissionId")||"";
let lastApproval:any=null;
let lastState="";
let lastNextAction="";
let pollTimer:number|undefined;

function setStatus(message:string,error=false){
  const el=$("authStatus");
  el.textContent=message;
  el.setAttribute("data-error",error?"1":"0");
}

function technical(value:unknown){
  const el=document.getElementById("technical");
  if(el) el.textContent=typeof value==="string"?value:JSON.stringify(value,null,2);
}

function renderSummary(message:string,kind:"info"|"success"|"warning"|"error"="info"){
  const el=$("result");
  el.textContent=message;
  el.setAttribute("data-kind",kind);
}

function humanState(value:any):string{
  if(!value||typeof value!=="object") return typeof value==="string"?value:"Đang xử lý…";
  if(value.error) return "Có lỗi: "+value.error;
  const result=value.result||{};
  const errors=Array.isArray(value.errors)?value.errors:[];
  if(errors.length) return "Factory báo lỗi: "+errors.map((x:any)=>x?.message||x?.code||String(x)).join("; ");
  const state=String(result.state||lastState||"");
  const next=String(result.next_action||lastNextAction||"");
  const stage=String(result.stage||"");
  if(value.status==="accepted" && result.mission_id && next==="get_work"){
    return "✅ Mission đã được tạo thành công.\n"+
      "Mission ID: "+result.mission_id+"\n"+
      "Factory đang ở "+(stage||"H1")+" và chờ GLOW Education trong ChatGPT tiếp tục reasoning.";
  }
  if(result.approval_required){
    return "🟡 Factory đã hoàn tất "+(result.approval_required.stage||stage||"giai đoạn hiện tại")+" và đang chờ bạn APPROVE hoặc REJECT.";
  }
  if(next==="get_work" || state.endsWith("_WORKING")){
    return "🔵 "+(stage||"Factory")+" đang chờ reasoning tiếp theo từ GLOW Education trong ChatGPT.\n"+
      "Bạn không cần nhập lại yêu cầu; chỉ cần dùng nút “Tiếp tục trong GLOW Education”.";
  }
  if(next==="get_delivery" || /DELIVER/.test(state)){
    return "✅ Factory đã có delivery. Bạn có thể bấm “Xem delivery”.";
  }
  if(state){
    return "Trạng thái hiện tại: "+state+(stage?" · "+stage:"")+(next?"\nHành động tiếp theo: "+next:"");
  }
  return "Yêu cầu đã được Factory tiếp nhận.";
}

function show(value:unknown){
  technical(value);
  const any=value as any;
  const hasError=Boolean(any?.error)||Boolean(Array.isArray(any?.errors)&&any.errors.length);
  renderSummary(humanState(any),hasError?"error":"info");
}

function findMissionId(v:any):string{
  if(!v||typeof v!=="object") return "";
  if(typeof v.mission_id==="string") return v.mission_id;
  for(const x of Object.values(v)){ const y=findMissionId(x); if(y) return y; }
  return "";
}

function handoffText(){
  return "@GLOW Education Tiếp tục mission "+missionId+
    ". Không tạo mission mới. Kiểm tra status trước; nếu next_action=get_work thì lấy đúng private work package hiện tại, thực hiện bounded work và submit lại Factory cho đến approval boundary hoặc blocker thật.";
}

function updateButtons(){
  const cont=$("continueChatgpt") as HTMLButtonElement;
  const delivery=$("delivery") as HTMLButtonElement;
  const canReason=Boolean(missionId) && (lastNextAction==="get_work" || lastState.endsWith("_WORKING"));
  const canDeliver=Boolean(missionId) && (lastNextAction==="get_delivery" || /DELIVER/.test(lastState));
  cont.disabled=!canReason;
  delivery.disabled=!canDeliver;
  $("handoffHint").classList.toggle("hidden",!canReason);
}

function activateMission(id:string){
  missionId=id;
  sessionStorage.setItem("glowMissionId",id);
  $("missionLabel").textContent="Mission "+id;
  $("stateBadge").textContent="ACTIVE";
  ($("refresh") as HTMLButtonElement).disabled=false;
  updateButtons();
}

async function token(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token) throw new Error("Hãy đăng nhập trước.");
  return session.access_token;
}

async function api(path:string,body:unknown){
  const accessToken=await token();
  const res=await fetch(path,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+accessToken},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({error:"INVALID_RESPONSE"}));
  if(!res.ok) throw new Error(data.error||("HTTP_"+res.status));
  return data;
}

async function signIn(){
  const email=($("email") as HTMLInputElement).value.trim();
  if(!email){setStatus("Nhập email để tiếp tục.",true);return;}
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+"/"}});
  if(error){setStatus(error.message,true);return;}
  setStatus("Đã gửi liên kết đăng nhập. Hãy mở email rồi quay lại trang này.");
}

async function signOut(){
  await supabase.auth.signOut();
  setStatus("Đã đăng xuất.");
  updateAuthUI();
}

async function updateAuthUI(){
  const {data:{user}}=await supabase.auth.getUser();
  $("authPanel").classList.toggle("hidden",!!user);
  $("userPanel").classList.toggle("hidden",!user);
  if(user){$("userEmail").textContent=user.email||user.id;setStatus("Đã đăng nhập.");}
}

function role(){return ($("role") as HTMLSelectElement).value;}
function locale(){return ($("locale") as HTMLSelectElement).value;}

function missionInput(){
  const outcomes=($("outcomes") as HTMLTextAreaElement).value.split("\n").map(x=>x.trim()).filter(Boolean);
  const raw=($("request") as HTMLTextAreaElement).value.trim();
  const topic=($("topic") as HTMLInputElement).value.trim();
  const goal=($("goal") as HTMLTextAreaElement).value.trim();
  return {
    raw_request:raw,
    learner_profile:{description:($("learner") as HTMLInputElement).value.trim()||"unspecified"},
    topic:topic||raw,
    learning_goal:goal||raw,
    success_outcomes:outcomes.length?outcomes:[goal||raw],
    duration_minutes:Number(($("duration") as HTMLInputElement).value||30),
    language:locale().startsWith("vi")?"vi":"en",
    delivery_expectation:["CLASSROOM_BUNDLE"]
  };
}

function applyStatus(d:any){
  const r=d?.result||{};
  if(r?.state){ lastState=String(r.state); $("stateBadge").textContent=lastState; }
  if(r?.next_action) lastNextAction=String(r.next_action);
  lastApproval=r?.approval_required||null;
  const gate=!!lastApproval;
  $("approvalPanel").classList.toggle("hidden",!gate);
  if(gate){
    const preview=lastApproval.public_preview||{};
    $("approvalSummary").textContent=typeof preview==="string"?preview:JSON.stringify(preview,null,2);
    ($("approve") as HTMLButtonElement).disabled=false;
    ($("reject") as HTMLButtonElement).disabled=false;
  }
  updateButtons();
}

async function refresh(silent=false){
  if(!missionId) return;
  const d=await api("/api/web/status",{mission_id:missionId,role:role(),locale:locale()});
  applyStatus(d);
  technical(d);
  if(!silent) renderSummary(humanState(d),"info");
}

async function approve(decision:"APPROVE"|"REJECT"){
  if(!missionId||!lastApproval) throw new Error("Không có approval gate đang chờ.");
  const approval={
    mission_id:missionId,
    stage:lastApproval.stage,
    decision,
    candidate_sha256:lastApproval.candidate_sha256,
    assurance_sha256:lastApproval.assurance_sha256,
    freeze_input_bundle_hash:lastApproval.freeze_input_bundle_hash
  };
  const d=await api("/api/web/approval",{mission_id:missionId,approval,role:role(),locale:locale()});
  technical(d);
  renderSummary(decision==="APPROVE"?"✅ Đã gửi APPROVE đúng candidate hiện tại.":"🛑 Đã gửi REJECT đúng candidate hiện tại.",decision==="APPROVE"?"success":"warning");
  lastApproval=null;
  $("approvalPanel").classList.add("hidden");
  await refresh(true);
}

async function continueInChatGPT(){
  if(!missionId) return;
  const text=handoffText();
  try{
    await navigator.clipboard.writeText(text);
    renderSummary("✅ Đã sao chép lệnh tiếp tục cho Mission "+missionId+".\nĐang mở GLOW Education trong ChatGPT. Bạn chỉ cần Paste → Send; không nhập lại nội dung khóa học.","success");
  }catch{
    renderSummary("Mission "+missionId+" đã sẵn sàng. Hãy mở GLOW Education trong ChatGPT và gửi: "+text,"warning");
  }
  window.open(CHATGPT_PLUGIN_URL,"_blank","noopener,noreferrer");
}

function startPolling(){
  if(pollTimer) window.clearInterval(pollTimer);
  pollTimer=window.setInterval(()=>{
    if(missionId && document.visibilityState==="visible"){
      void refresh(true).catch(()=>{});
    }
  },8000);
}

window.addEventListener("DOMContentLoaded",()=>{
  $("signin").addEventListener("click",()=>void signIn());
  $("signout").addEventListener("click",()=>void signOut());
  $("startMission").addEventListener("click",async()=>{try{
    const d=await api("/api/web/start",{role:role(),locale:locale(),input:missionInput()});
    const id=findMissionId(d);
    if(id) activateMission(id);
    show(d);
    if(id) await refresh(true);
  }catch(e){show({error:e instanceof Error?e.message:String(e)})}});
  $("refresh").addEventListener("click",()=>void refresh(false).catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  $("delivery").addEventListener("click",async()=>{try{
    const d=await api("/api/web/delivery",{mission_id:missionId,role:role(),locale:locale()});
    technical(d);
    renderSummary("✅ Delivery đã sẵn sàng. Mở “Chi tiết kỹ thuật” để xem payload đầy đủ trong bản demo hiện tại.","success");
  }catch(e){show({error:e instanceof Error?e.message:String(e)})}});
  $("continueChatgpt").addEventListener("click",()=>void continueInChatGPT());
  $("approve").addEventListener("click",()=>void approve("APPROVE").catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  $("reject").addEventListener("click",()=>void approve("REJECT").catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  if(missionId) activateMission(missionId);
  void updateAuthUI().then(()=>missionId?refresh(true):undefined).catch(()=>{});
  startPolling();
});
