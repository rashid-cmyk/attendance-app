// Firebase Multi-User version (per-employee login)
// Schema:
// employees/{uid} -> { name, salary }
// employees/{uid}/expenses/{autoId} -> { date, amount, note }
// employees/{uid}/attendance/{YYYY-MM-DD} -> { status: 'P'|'A'|'L' }

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====== FILL THESE ======
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const ADMIN_EMAIL = "admin@rashid.com"; // change if needed
// ========================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// UI helpers
const el = id => document.getElementById(id);
const authBox = el("authBox");
const appBox  = el("appBox");
const adminPanel = el("adminPanel");
const selfPanel  = el("selfPanel");

const today = () => new Date().toISOString().slice(0,10);
const ym    = () => new Date().toISOString().slice(0,7);
function nextMonthKey(m){ const [y,mm]=m.split('-').map(Number); const d=new Date(y,mm-1,1); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7);}
function dayIsSunday(dateStr){ return new Date(dateStr+'T00:00:00').getDay() === 0; }

// Firestore helpers
function empDoc(uid){ return doc(db, "employees", String(uid)); }
function expensesCol(uid){ return collection(db, "employees", String(uid), "expenses"); }
function attendanceDoc(uid, dateStr){ return doc(db, "employees", String(uid), "attendance", dateStr); }

// ====== Auth Handlers ======
el("btnLogin").onclick = async () => {
  const e = el("email").value.trim();
  const p = el("password").value.trim();
  if(!e || !p) return alert("ای میل اور پاس ورڈ دونوں درج کریں");
  try{ await signInWithEmailAndPassword(auth, e, p); }catch(err){ alert("Login error: "+err.message); }
};
el("btnSignup").onclick = async () => {
  const e = el("email").value.trim();
  const p = el("password").value.trim();
  if(!e || !p) return alert("ای میل اور پاس ورڈ دونوں درج کریں");
  try{
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    // Create employee doc with uid as id
    await setDoc(empDoc(cred.user.uid), { name: "", salary: 0, email: e });
    alert("Signup ہو گیا۔ اب پروفائل مکمل کریں۔");
  }catch(err){ alert("Signup error: "+err.message); }
};
el("btnLogout").onclick = ()=> signOut(auth);

// ====== State ======
let me = null; // firebase user
let isAdmin = false;
let myProfile = null;

// ====== Sunday Auto-Present ======
async function ensureSundayAutoPresent(){
  const d = today();
  if(!dayIsSunday(d)) return;
  if(!isAdmin) return; // only run by admin to avoid duplicates
  // For each employee, ensure attendance doc exists with P
  const all = await getDocs(collection(db,"employees"));
  for(const emp of all.docs){
    const uid = emp.id;
    const attRef = attendanceDoc(uid, d);
    const snap = await getDoc(attRef);
    if(!snap.exists()){
      await setDoc(attRef, { status: "P" });
    }
  }
}

// ====== Load Profile ======
async function loadMyProfile(){
  const ref = empDoc(me.uid);
  const s = await getDoc(ref);
  if(s.exists()) myProfile = { id: s.id, ...s.data() };
  else { myProfile = null; }
}

// ====== Admin Panel ======
async function renderAllEmployees(){
  const wrap = el("allEmployees");
  wrap.innerHTML = "";
  const snap = await getDocs(collection(db,"employees"));
  snap.forEach(d=>{
    const e = d.data();
    const card = document.createElement("div");
    card.className = "emp-card";
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div><b>${e.name||"(نام نہیں)"}</b> <span class="badge">${e.email||""}</span> <span class="badge">گراس سیلری: ${e.salary||0}</span></div>
        <div><button class="btn red" onclick="window.__delEmp('${d.id}')">حذف</button></div>
      </div>
    `;
    wrap.appendChild(card);
  });
}
async function adminDeleteEmployee(uid){
  if(!confirm("کیا آپ واقعی حذف کرنا چاہتے ہیں؟")) return;
  // delete expenses
  const exSnap = await getDocs(expensesCol(uid));
  for(const docu of exSnap.docs) await deleteDoc(docu.ref);
  // delete attendance
  const atSnap = await getDocs(collection(db,"employees", uid, "attendance"));
  for(const docu of atSnap.docs) await deleteDoc(docu.ref);
  // delete profile
  await deleteDoc(empDoc(uid));
  await renderAllEmployees();
}

// Admin links email (must be an existing Auth user who signed up)
el("btnLinkEmployee").onclick = async ()=>{
  const name = el("newName").value.trim();
  const salary = Number(el("newSalary").value);
  const email = el("newEmail").value.trim();
  if(!name || !salary || !email) return alert("نام، سیلری اور ای میل ضروری ہیں");
  // Find user uid by email: client SDK can't list users. We keep email field on employee doc.
  // Here, we try to find existing employee doc with same email; else we can't fetch auth uid directly.
  // Workaround: after employee signs up, his document already exists with id=uid and email set.
  // We'll search for that email.
  const q1 = query(collection(db,"employees"), where("email","==",email));
  const res = await getDocs(q1);
  if(res.empty){ return alert("یہ ای میل signup کے بعد خودکار پروفائل بناتی ہے۔ پہلے اس ای میل سے signup کرائیں، پھر دوبارہ Link کریں۔"); }
  const d = res.docs[0];
  await updateDoc(d.ref, { name, salary });
  alert("لنک اور اپڈیٹ ہو گیا۔");
  await renderAllEmployees();
};

el("btnRefresh").onclick = ()=> renderAllEmployees();

// ====== Self Panel ======
async function renderSelf(){
  // header badges
  el("whoami").textContent = me ? (me.email||"(unknown)") : "";
  el("roleBadge").textContent = isAdmin ? "Admin" : "Employee";

  // profile inputs
  el("myName").value = myProfile?.name || "";
  el("mySalary").value = myProfile?.salary || 0;

  // today attendance
  const attRef = attendanceDoc(me.uid, today());
  const s = await getDoc(attRef);
  el("chkToday").checked = s.exists() ? (s.data().status==="P") : false;

  // counts
  await renderMonthSummary();
  await renderExpenses();
}

el("btnSaveProfile").onclick = async ()=>{
  const name = el("myName").value.trim();
  const salary = Number(el("mySalary").value||0);
  await setDoc(empDoc(me.uid), { name, salary, email: me.email }, { merge: true });
  await loadMyProfile();
  alert("پروفائل محفوظ");
};

el("chkToday").onchange = async (ev)=>{
  if(ev.target.checked){
    await setDoc(attendanceDoc(me.uid, today()), { status:"P" });
  }else{
    await deleteDoc(attendanceDoc(me.uid, today()));
  }
  await renderSelf();
};

el("btnSaveManualAtt").onclick = async ()=>{
  const d = el("attDate").value;
  const st = el("attStatus").value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d) || !st) return alert("تاریخ یا اسٹیٹس غلط ہے");
  await setDoc(attendanceDoc(me.uid, d), { status: st });
  await renderSelf();
};

// Expenses
el("btnAddExp").onclick = async ()=>{
  const amt = Number(el("expAmt").value);
  const note = el("expNote").value || "";
  if(!amt || amt<=0) return alert("درست رقم درج کریں");
  await addDoc(expensesCol(me.uid), { date: today(), amount: amt, note });
  el("expAmt").value = ""; el("expNote").value = "";
  await renderExpenses();
};

async function renderExpenses(){
  const wrap = el("expList"); wrap.innerHTML = "";
  const snap = await getDocs(expensesCol(me.uid));
  const list = snap.docs.map(d=>({ id:d.id, ...d.data() })).sort((a,b)=> a.date<b.date?1:-1);
  if(!list.length){ wrap.innerHTML = '<div class="muted">ابھی کوئی خرچہ نہیں</div>'; return; }
  list.forEach(ex=>{
    const div = document.createElement("div");
    div.className = "expense-item";
    div.innerHTML = `<span>${ex.date} — ${ex.amount} <small class="muted">(${ex.note||""})</small></span>
                     <button class="btn red" onclick="window.__delExp('${ex.id}')">❌ حذف</button>`;
    wrap.appendChild(div);
  });
}
async function delExpense(expId){
  await deleteDoc(doc(db,"employees", me.uid, "expenses", expId));
  await renderExpenses();
}

// Month summary (self)
async function renderMonthSummary(){
  const monthKey = ym();
  const start = monthKey+"-01";
  const endEx = nextMonthKey(monthKey)+"-01";

  // attendance counts
  const atSnap = await getDocs(collection(db,"employees", me.uid, "attendance"));
  let p=0,a=0,l=0;
  atSnap.forEach(d=>{
    const dt = d.id;
    if(dt>=start && dt<endEx){
      const st = d.data().status;
      if(st==="P") p++; else if(st==="A") a++; else if(st==="L") l++;
    }
  });
  el("attMonthCounts").textContent = `اس ماہ: Present ${p} دن — Absent ${a} دن — Leave ${l} دن`;

  // expenses sum
  const exSnap = await getDocs(expensesCol(me.uid));
  let sum = 0;
  exSnap.forEach(d=>{
    const e = d.data();
    if(e.date>=start && e.date<endEx) sum += Number(e.amount||0);
  });
  const sal = Number(myProfile?.salary||0);
  const bal = sal - sum;

  el("monthSummary").innerHTML = `<table>
    <tr><th>گراس سیلری</th><th>Month Expenses</th><th>Balance</th></tr>
    <tr><td>${sal}</td><td>${sum}</td><td>${bal}</td></tr>
  </table>`;
}

// ====== Expose (for onclick) ======
window.__delExp = delExpense;
window.__delEmp = async (uid)=>{
  if(!isAdmin) return alert("صرف ایڈمن");
  await adminDeleteEmployee(uid);
};

// ====== Auth state change ======
onAuthStateChanged(auth, async (user)=>{
  me = user;
  if(!user){
    authBox.classList.remove("hidden");
    appBox.classList.add("hidden");
    return;
  }
  isAdmin = (user.email === ADMIN_EMAIL);
  authBox.classList.add("hidden");
  appBox.classList.remove("hidden");

  el("roleBadge").textContent = isAdmin ? "Admin" : "Employee";
  el("whoami").textContent = user.email||"";

  await loadMyProfile();
  if(isAdmin){ 
    adminPanel.classList.remove("hidden");
    selfPanel.classList.add("hidden");
    await ensureSundayAutoPresent();
    await renderAllEmployees();
  } else {
    adminPanel.classList.add("hidden");
    selfPanel.classList.remove("hidden");
    await renderSelf();
  }
});
