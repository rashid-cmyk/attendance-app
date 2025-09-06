// ====== State & Storage ======
let password   = localStorage.getItem("rc_pass") || "1234";
let employees  = JSON.parse(localStorage.getItem("rc_emps") || "[]");
let attendance = JSON.parse(localStorage.getItem("rc_att")  || "{}");
let expenses   = JSON.parse(localStorage.getItem("rc_exp")  || "{}");

function persist(){
  localStorage.setItem("rc_pass", password);
  localStorage.setItem("rc_emps", JSON.stringify(employees));
  localStorage.setItem("rc_att",  JSON.stringify(attendance));
  localStorage.setItem("rc_exp",  JSON.stringify(expenses));
}

// ====== Login / Password ======
function doLogin(){
  const p = document.getElementById("loginPass").value.trim();
  if(p === password){
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    renderAll();
  }else{
    alert("غلط پاس ورڈ!");
  }
}
function changePassword(){
  const oldp = prompt("پرانا پاس ورڈ:");
  if(oldp !== password) return alert("غلط پاس ورڈ!");
  const np = prompt("نیا پاس ورڈ:");
  if(np && np.trim()){ password = np.trim(); persist(); alert("پاس ورڈ تبدیل ہو گیا"); }
}

// ====== Helpers ======
const today = () => new Date().toISOString().slice(0,10);
const ym    = () => new Date().toISOString().slice(0,7);

function sumMonthExpenses(empId, monthKey){
  return (expenses[empId]||[])
    .filter(e => (e.date||"").startsWith(monthKey))
    .reduce((s,e)=> s + Number(e.amount||0), 0);
}
function presentCount(empId, monthKey){
  let c=0;
  for(const d in attendance){
    if(d.startsWith(monthKey) && attendance[d] && attendance[d][empId]==="P") c++;
  }
  return c;
}
function absentCount(empId, monthKey){
  let c=0;
  for(const d in attendance){
    if(d.startsWith(monthKey) && attendance[d] && attendance[d][empId]==="A") c++;
  }
  return c;
}
function isPresentToday(empId){
  const d=today();
  return !!(attendance[d] && attendance[d][empId]==="P");
}

// ====== Employees ======
function addEmployee(){
  const name   = document.getElementById("empName").value.trim();
  const salary = Number(document.getElementById("empSalary").value);
  if(!name || !salary) return alert("نام اور گراس سیلری لازمی ہیں");
  employees.push({id: Date.now(), name, salary});
  document.getElementById("empName").value = "";
  document.getElementById("empSalary").value = "";
  persist(); renderAll();
}
function deleteEmployee(empId){
  const p = prompt("حذف کی تصدیق کیلئے پاس ورڈ:");
  if(p !== password) return alert("غلط پاس ورڈ!");
  employees = employees.filter(e=>e.id!==empId);
  delete expenses[empId];
  for(const d in attendance){ if(attendance[d]) delete attendance[d][empId]; }
  persist(); renderAll();
}

// ====== Attendance ======
function markToday(empId, el){
  if(isPresentToday(empId)){ el.checked=true; el.disabled=true; return; }
  if(el.checked){
    const d=today();
    if(!attendance[d]) attendance[d]={};
    attendance[d][empId]="P";
    persist(); renderAll();
  }
}
function setManualAttendance(empId){
  const date = (document.getElementById(`date_${empId}`) || {}).value || "";
  const status = (document.getElementById(`status_${empId}`) || {}).value || "";
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert("تاریخ درست فارمٹ میں دیں: YYYY-MM-DD");
  if(!status) return alert("اسٹیٹس منتخب کریں");
  if(!attendance[date]) attendance[date]={};
  attendance[date][empId] = status;
  persist(); renderAll();
}

// ====== Expenses ======
function addExpense(empId){
  const amt = Number((document.getElementById(`amt_${empId}`)||{}).value);
  const note = (document.getElementById(`note_${empId}`)||{}).value || "";
  if(!amt || amt<=0) return alert("درست رقم درج کریں");
  const d=today();
  if(!expenses[empId]) expenses[empId]=[];
  expenses[empId].push({date:d, amount:amt, note});
  document.getElementById(`amt_${empId}`).value = "";
  document.getElementById(`note_${empId}`).value = "";
  persist(); renderAll();
}
function deleteExpense(empId, idx){
  const p = prompt("پاس ورڈ درج کریں:");
  if(p !== password) return alert("غلط پاس ورڈ!");
  (expenses[empId]||[]).splice(idx,1);
  persist(); renderAll();
}

// ====== Renderers ======
function renderEmployees(){
  const wrap = document.getElementById("empList");
  wrap.innerHTML = "";
  const monthKey = ym();

  employees.forEach(emp=>{
    const monthExp = sumMonthExpenses(emp.id, monthKey);
    const balance = Number(emp.salary||0) - monthExp;
    const pres = presentCount(emp.id, monthKey);
    const abs  = absentCount(emp.id, monthKey);

    const card = document.createElement("div");
    card.className = "emp-card";
    const todayUI = isPresentToday(emp.id)
      ? `<span class="badge">آج حاضر ✅</span>`
      : `<label style="display:inline-flex;gap:6px;align-items:center">
           <input type="checkbox" onchange="markToday(${emp.id}, this)" />
           <span>آج حاضر</span>
         </label>`;

    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div>
          <b>${emp.name}</b>
          <span class="badge">گراس سیلری: ${emp.salary}</span>
          ${todayUI}
        </div>
        <div>
          <button class="btn red" onclick="deleteEmployee(${emp.id})">ملازم حذف</button>
        </div>
      </div>

      <div class="grid">
        <div>
          <div class="sec-title">📅 Manual Attendance</div>
          <div class="row">
            <input type="date" id="date_${emp.id}" />
            <select id="status_${emp.id}">
              <option value="">اسٹیٹس منتخب کریں</option>
              <option value="P">Present</option>
              <option value="A">Absent</option>
              <option value="L">Leave</option>
            </select>
            <button class="btn green" onclick="setManualAttendance(${emp.id})">Save</button>
          </div>
          <div class="muted">اس ماہ: Present ${pres} دن — Absent ${abs} دن</div>
        </div>

        <div>
          <div class="sec-title">💸 Expenses</div>
          <div class="row">
            <input type="number" id="amt_${emp.id}" placeholder="Amount" />
            <input type="text" id="note_${emp.id}" placeholder="Note" />
            <button class="btn" onclick="addExpense(${emp.id})">➕ Add</button>
          </div>
          <div>
            ${(expenses[emp.id]||[]).map((ex,i)=>`
              <div class="expense-item">
                <span>${ex.date} — ${ex.amount} <small class="muted">(${ex.note||""})</small></span>
                <button class="btn red" onclick="deleteExpense(${emp.id},${i})">❌ حذف</button>
              </div>
            `).join("") || '<div class="muted">ابھی کوئی خرچہ نہیں</div>'}
          </div>
        </div>
      </div>

      <div class="sec-title" style="margin-top:8px">
        🧾 ماہانہ خرچے: <b>${monthExp}</b> &nbsp; | &nbsp; 💰 بیلنس: <b>${balance}</b>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function renderMonthSummary(){
  const monthKey = ym();
  let html = `<table>
    <tr>
      <th>نام</th><th>گراس سیلری</th><th>Present (اس ماہ)</th><th>Absent (اس ماہ)</th><th>Month Expenses</th><th>Balance</th>
    </tr>`;
  employees.forEach(emp=>{
    const mExp = sumMonthExpenses(emp.id, monthKey);
    const bal  = Number(emp.salary||0) - mExp;
    html += `<tr>
      <td>${emp.name}</td>
      <td>${emp.salary}</td>
      <td>${presentCount(emp.id, monthKey)}</td>
      <td>${absentCount(emp.id, monthKey)}</td>
      <td>${mExp}</td>
      <td>${bal}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById("monthSummary").innerHTML = html;
}

function renderAll(){
  renderEmployees();
  renderMonthSummary();
}

// ====== Backup (Save / Load) ======
function saveData(){
  const data = {password, employees, attendance, expenses};
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="rashid_co_backup.json"; a.click();
  URL.revokeObjectURL(url);
}
function loadData(ev){
  const f = ev.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = e=>{
    try{
      const d = JSON.parse(e.target.result);
      if(d.password) password = d.password;
      employees  = d.employees  || [];
      attendance = d.attendance || {};
      expenses   = d.expenses   || {};
      persist(); renderAll(); alert("ڈیٹا لوڈ ہو گیا");
    }catch(_){ alert("غلط فائل / ڈیٹا"); }
  };
  r.readAsText(f, 'utf-8');
}
