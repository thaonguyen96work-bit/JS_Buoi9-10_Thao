"use strict";

// ---------- Model ----------
class Employee {
  constructor(tknv, name, email, password, datepicker, luongCB, chucvu, gioLam) {
    this.tknv = tknv;
    this.name = name;
    this.email = email;
    this.password = password;
    this.datepicker = datepicker;
    this.luongCB = Number(luongCB);
    this.chucvu = chucvu;
    this.gioLam = Number(gioLam);
    this.tongLuong = 0;
    this.loaiNV = "";
    this.calcSalary();
    this.classify();
  }

  calcSalary() {
    const rate = { "Giám đốc": 3, "Trưởng Phòng": 2, "Nhân Viên": 1 };
    this.tongLuong = this.luongCB * (rate[this.chucvu] || 1);
    return this.tongLuong;
  }

  classify() {
    if (this.gioLam >= 192) this.loaiNV = "Xuất sắc";
    else if (this.gioLam >= 176) this.loaiNV = "Giỏi";
    else if (this.gioLam >= 160) this.loaiNV = "Khá";
    else this.loaiNV = "Trung bình";
    return this.loaiNV;
  }
}

// ---------- State ----------
const STORE_KEY = "employees-v1";
const fields = ["tknv", "name", "email", "password", "datepicker", "luongCB", "chucvu", "gioLam"];
let employees = [];
let editingId = null;

const $ = (id) => document.getElementById(id);
const money = (n) => Number(n).toLocaleString("vi-VN");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();

const save = () => {
  localStorage.setItem(STORE_KEY, JSON.stringify(employees));
};

const load = () => {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return [];
  const list = JSON.parse(raw);
  return list.map(
    (o) => new Employee(o.tknv, o.name, o.email, o.password, o.datepicker, o.luongCB, o.chucvu, o.gioLam)
  );
};

// ---------- Validation ----------
const isValidDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return false;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yy = Number(m[3]);
  const d = new Date(yy, mm - 1, dd);
  return d.getFullYear() === yy && d.getMonth() === mm - 1 && d.getDate() === dd;
};

const rules = {
  tknv: (v) => {
    if (!v) return "Tài khoản không được để trống";
    if (!/^\d{4,6}$/.test(v)) return "Tài khoản gồm 4–6 chữ số";
    if (editingId === null && employees.some((e) => e.tknv === v)) return "Tài khoản đã tồn tại";
    return "";
  },
  name: (v) => {
    if (!v) return "Tên nhân viên không được để trống";
    if (!/^[\p{L}\s]+$/u.test(v)) return "Tên chỉ gồm chữ cái";
    return "";
  },
  email: (v) => {
    if (!v) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Email không đúng định dạng";
    return "";
  },
  password: (v) => {
    if (!v) return "Mật khẩu không được để trống";
    if (!/^(?=.*\d)(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,10}$/.test(v))
      return "6–10 ký tự, có ít nhất 1 số, 1 chữ hoa, 1 ký tự đặc biệt";
    return "";
  },
  datepicker: (v) => {
    if (!v) return "Ngày làm không được để trống";
    if (!isValidDate(v)) return "Ngày làm phải đúng định dạng mm/dd/yyyy";
    return "";
  },
  luongCB: (v) => {
    if (!v) return "Lương cơ bản không được để trống";
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1000000 || n > 20000000) return "Lương cơ bản từ 1.000.000 đến 20.000.000";
    return "";
  },
  chucvu: (v) => (["Giám đốc", "Trưởng Phòng", "Nhân Viên"].includes(v) ? "" : "Vui lòng chọn chức vụ hợp lệ"),
  gioLam: (v) => {
    if (!v) return "Số giờ làm không được để trống";
    const n = Number(v);
    if (!Number.isFinite(n) || n < 80 || n > 200) return "Số giờ làm từ 80 đến 200 giờ";
    return "";
  },
};

const validateField = (f) => {
  const el = $(f);
  const msg = rules[f](el.value.trim());
  $("m-" + f).textContent = msg;
  el.classList.toggle("border-red-500", Boolean(msg));
  return !msg;
};

const validateAll = () => fields.map(validateField).every(Boolean);

// ---------- Render ----------
const render = (list = employees) => {
  const tbody = $("tbody");
  if (!list.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="p-6 text-center text-slate-500">Chưa có nhân viên nào. Chọn “Thêm nhân viên” để bắt đầu.</td></tr>';
    return;
  }
  tbody.innerHTML = list
    .map(
      (e) => `
    <tr class="border-b">
      <td class="p-2">${esc(e.tknv)}</td>
      <td class="p-2">${esc(e.name)}</td>
      <td class="p-2">${esc(e.email)}</td>
      <td class="p-2">${esc(e.datepicker)}</td>
      <td class="p-2">${esc(e.chucvu)}</td>
      <td class="p-2">${money(e.tongLuong)}</td>
      <td class="p-2">${esc(e.loaiNV)}</td>
      <td class="p-2 whitespace-nowrap">
        <button data-act="edit" data-id="${esc(e.tknv)}" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Sửa</button>
        <button data-act="del" data-id="${esc(e.tknv)}" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Xóa</button>
      </td>
    </tr>`
    )
    .join("");
};

// ---------- Form / modal ----------
const showModal = () => {
  $("modal").classList.remove("hidden");
  $("modal").classList.add("flex");
};
const hideModal = () => {
  $("modal").classList.add("hidden");
  $("modal").classList.remove("flex");
};

const openForm = (emp) => {
  fields.forEach((f) => {
    $(f).value = "";
    $(f).classList.remove("border-red-500");
    $("m-" + f).textContent = "";
  });
  editingId = emp ? emp.tknv : null;
  $("tknv").disabled = Boolean(emp);
  $("btnSave").classList.toggle("hidden", Boolean(emp));
  $("btnUpdate").classList.toggle("hidden", !emp);
  $("modalTitle").textContent = emp ? "Cập nhật nhân viên" : "Thêm nhân viên";
  if (emp) fields.forEach((f) => ($(f).value = emp[f]));
  showModal();
};

const readForm = () => {
  const v = (id) => $(id).value.trim();
  return new Employee(
    v("tknv"), v("name"), v("email"), $("password").value,
    v("datepicker"), v("luongCB"), v("chucvu"), v("gioLam")
  );
};

// ---------- Search by type ----------
const applyFilter = () => {
  const term = normalize($("searchBox").value) || normalize($("filterType").value);
  render(term ? employees.filter((e) => normalize(e.loaiNV).includes(term)) : employees);
};

// ---------- Events ----------
$("btnAdd").addEventListener("click", () => openForm(null));
$("btnClose").addEventListener("click", hideModal);

$("btnSave").addEventListener("click", () => {
  if (!validateAll()) return;
  employees.push(readForm());
  save();
  applyFilter();
  hideModal();
});

$("btnUpdate").addEventListener("click", () => {
  if (!validateAll()) return;
  const index = employees.findIndex((e) => e.tknv === editingId);
  if (index === -1) return;
  employees[index] = readForm();
  save();
  applyFilter();
  hideModal();
});

$("tbody").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === "del") {
    employees = employees.filter((e) => e.tknv !== id);
    save();
    applyFilter();
  } else {
    const emp = employees.find((e) => e.tknv === id);
    if (emp) openForm(emp);
  }
});

fields.forEach((f) => $(f).addEventListener("blur", () => validateField(f)));

$("btnSearch").addEventListener("click", applyFilter);
$("searchBox").addEventListener("keyup", applyFilter);
$("filterType").addEventListener("change", () => {
  $("searchBox").value = "";
  applyFilter();
});

// ---------- Init ----------
employees = load();
render();
