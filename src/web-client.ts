import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL="https://rjllafrkmwijvqojmdsd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_bKV0bBUCuIT884X0gJS9sg_Sa7NpG8G";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const $=(id:string)=>document.getElementById(id)!;
let missionId=sessionStorage.getItem("glowMissionId")||"";
let lastApproval:any=null;

function setStatus(message:string,error=false){
  const el=$("authStatus");
  el.textContent=message;
  el.setAttribute("data-error",error?"1":"0");
}
function show(value:unknown){
  $("result").textContent=typeof value==="string"?value:JSON.stringify(value,null,2);
}
function findMissionId(v:any):string{
  if(!v||typeof v!=="object") return "";
  if(typeof v.mission_id==="string") return v.mission_id;
  for(const x of Object.values(v)){ const y=findMissionId(x); if(y) return y; }
  return "";
}
function activateMission(id:string){
  missionId=id; sessionStorage.setItem("glowMissionId",id);
  $("missionLabel").textContent="Mission "+id;
  $("stateBadge").textContent="ACTIVE";
  ($("refresh") as HTMLButtonElement).disabled=false;
  ($("delivery") as HTMLButtonElement).disabled=false;
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
  await supabase.auth.signOut(); setStatus("Đã đăng xuất."); updateAuthUI();
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
async function refresh(){
  if(!missionId) return;
  const d=await api("/api/web/status",{mission_id:missionId,role:role(),locale:locale()});
  show(d);
  const r=(d as any)?.result;
  if(r?.state) $("stateBadge").textContent=r.state;
  lastApproval=r?.approval_required||null;
  const gate=!!lastApproval;
  $("approvalPanel").classList.toggle("hidden",!gate);
  if(gate){
    $("approvalSummary").textContent=JSON.stringify(lastApproval.public_preview||{},null,2);
    ($("approve") as HTMLButtonElement).disabled=false;
    ($("reject") as HTMLButtonElement).disabled=false;
  }
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
  show(d); lastApproval=null; $("approvalPanel").classList.add("hidden"); await refresh();
}

window.addEventListener("DOMContentLoaded",()=>{
  $("signin").addEventListener("click",()=>void signIn());
  $("signout").addEventListener("click",()=>void signOut());
  $("startMission").addEventListener("click",async()=>{try{
    const d=await api("/api/web/start",{role:role(),locale:locale(),input:missionInput()});
    const id=findMissionId(d); if(id) activateMission(id); show(d); if(id) await refresh();
  }catch(e){show({error:e instanceof Error?e.message:String(e)})}});
  $("refresh").addEventListener("click",()=>void refresh().catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  $("delivery").addEventListener("click",async()=>{try{show(await api("/api/web/delivery",{mission_id:missionId,role:role(),locale:locale()}));}catch(e){show({error:e instanceof Error?e.message:String(e)})}});
  $("approve").addEventListener("click",()=>void approve("APPROVE").catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  $("reject").addEventListener("click",()=>void approve("REJECT").catch(e=>show({error:e instanceof Error?e.message:String(e)})));
  if(missionId) activateMission(missionId);
  void updateAuthUI().then(()=>missionId?refresh():undefined).catch(()=>{});
});
