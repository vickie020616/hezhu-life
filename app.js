const state = JSON.parse(localStorage.getItem("hezhu-state") || "{}");
let toastTimer;

const saveState = () => localStorage.setItem("hezhu-state", JSON.stringify(state));
const iconRefresh = () => window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === pageId));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === pageId));
  const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"] span`);
  document.querySelector("#pageCrumb").textContent = activeNav?.textContent || "生活总览";
  document.querySelector(".sidebar").classList.remove("open");
  document.querySelector("#mobileOverlay").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => switchPage(button.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(button => button.addEventListener("click", () => switchPage(button.dataset.goto)));

const modal = document.querySelector("#expenseModal");
function openExpenseModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => modal.querySelector('input[name="title"]').focus(), 50);
}
function closeExpenseModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
document.querySelectorAll("#quickAdd, .add-expense").forEach(button => button.addEventListener("click", openExpenseModal));
document.querySelectorAll(".close-modal").forEach(button => button.addEventListener("click", closeExpenseModal));
modal.addEventListener("click", event => { if (event.target === modal) closeExpenseModal(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeExpenseModal();
    closeSupplyModal();
  }
});

const amountInput = document.querySelector('input[name="amount"]');
amountInput.addEventListener("input", () => {
  const amount = Number(amountInput.value || 0);
  document.querySelector("#splitAmount").textContent = `每人 ¥${(amount / 4).toFixed(2)}`;
});

document.querySelector("#expenseForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const title = data.get("title");
  const amount = Number(data.get("amount"));
  const row = document.createElement("div");
  row.className = "expense-row";
  row.dataset.status = "pending-confirmation";
  row.dataset.category = "groceries";
  row.innerHTML = `
    <span class="category-icon grocery"><i data-lucide="receipt-text"></i></span>
    <div class="expense-main"><strong>${title}</strong><span>Vickie 支付 · 刚刚</span></div>
    <div class="split-avatars"><span class="avatar avatar-you">V</span><span class="avatar avatar-qiao">S</span><span class="avatar avatar-an">H</span><span class="avatar avatar-lu">F</span></div>
    <div class="expense-amount"><strong>¥ ${amount.toFixed(2)}</strong><span>人均 ¥${(amount / 4).toFixed(2)}</span></div>
    <button class="confirm-expense-button">确认费用</button>`;
  document.querySelector("#expenseList").prepend(row);
  state.lastExpense = { title, amount };
  saveState();
  closeExpenseModal();
  event.currentTarget.reset();
  document.querySelector("#splitAmount").textContent = "每人 ¥0.00";
  iconRefresh();
  switchPage("expenses");
  applyExpenseFilters();
  updateExpenseBadge();
  showToast("费用已记录，已通知 3 位室友");
});

let activeExpenseStatus = "all";
let activeExpenseCategory = "all";

function applyExpenseFilters() {
  let visibleCount = 0;
  document.querySelectorAll("#expenseList .expense-row").forEach(row => {
    const statusMatch = activeExpenseStatus === "all" || row.dataset.status === activeExpenseStatus;
    const categoryMatch = activeExpenseCategory === "all" || row.dataset.category === activeExpenseCategory;
    const visible = statusMatch && categoryMatch;
    row.style.display = visible ? "" : "none";
    if (visible) visibleCount += 1;
  });
  document.querySelector("#expenseEmpty").classList.toggle("show", visibleCount === 0);
}

function updateExpenseBadge() {
  const actionable = document.querySelectorAll('#expenseList .expense-row[data-status^="pending-"]').length;
  document.querySelector("#expenseBadge").textContent = actionable;
}

document.querySelectorAll("#expenseStatusFilter button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#expenseStatusFilter button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeExpenseStatus = button.dataset.filter;
    applyExpenseFilters();
  });
});

const expenseCategoryToggle = document.querySelector("#expenseCategoryToggle");
const expenseCategoryFilter = document.querySelector("#expenseCategoryFilter");
expenseCategoryToggle.addEventListener("click", () => {
  const open = expenseCategoryFilter.classList.toggle("open");
  expenseCategoryToggle.setAttribute("aria-expanded", String(open));
});
expenseCategoryFilter.querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    expenseCategoryFilter.querySelectorAll("button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeExpenseCategory = button.dataset.category;
    expenseCategoryToggle.querySelector("span").textContent = button.textContent.trim();
    expenseCategoryToggle.classList.toggle("active", activeExpenseCategory !== "all");
    expenseCategoryFilter.classList.remove("open");
    expenseCategoryToggle.setAttribute("aria-expanded", "false");
    applyExpenseFilters();
  });
});
document.addEventListener("click", event => {
  if (!event.target.closest(".filter-menu")) {
    expenseCategoryFilter.classList.remove("open");
    expenseCategoryToggle.setAttribute("aria-expanded", "false");
  }
});

document.querySelector("#expenseList").addEventListener("click", event => {
  const confirmButton = event.target.closest(".confirm-expense-button");
  const payButton = event.target.closest(".pay-button");
  if (!confirmButton && !payButton) return;
  const row = event.target.closest(".expense-row");
  if (confirmButton) {
    row.dataset.status = "pending-payment";
    confirmButton.outerHTML = '<button class="pay-button">去支付</button>';
    showToast("费用已确认，现在可以支付");
  } else {
    row.dataset.status = "settled";
    payButton.outerHTML = '<span class="status-pill settled">已结清</span>';
    const remaining = document.querySelectorAll('#expenseList .expense-row[data-status="pending-payment"]').length;
    document.querySelector("#myBalance").textContent = remaining ? "¥ 27.20" : "¥ 0.00";
    showToast("支付状态已更新");
  }
  updateExpenseBadge();
  applyExpenseFilters();
});

document.querySelectorAll(".complete-chore").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".complete-chore").forEach(target => {
      target.innerHTML = '<i data-lucide="badge-check"></i> 今日值日已完成';
      target.classList.add("secondary-button");
      target.classList.remove("primary-button");
      target.disabled = true;
    });
    document.querySelectorAll("#choreChecklist li").forEach(item => item.classList.add("checked"));
    state.choreComplete = true;
    saveState();
    iconRefresh();
    showToast("值日完成，默契值 +10");
  });
});

document.querySelectorAll("#choreChecklist li button").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest("li");
    item.classList.toggle("checked");
    button.innerHTML = item.classList.contains("checked") ? '<i data-lucide="circle-check-big"></i>' : '<i data-lucide="circle"></i>';
    iconRefresh();
  });
});

document.querySelectorAll(".restock-button").forEach(button => {
  button.addEventListener("click", () => {
    const card = button.closest(".supply-item");
    button.textContent = "已认领";
    button.disabled = true;
    card.querySelector(".supply-art span")?.remove();
    showToast(`已认领「${card.dataset.name}」，室友将不再重复购买`);
  });
});

const supplyModal = document.querySelector("#supplyModal");
const supplyRange = document.querySelector("#supplyRange");
const supplyQuantity = document.querySelector("#supplyQuantity");
let editingSupplyCard = null;

function formatStockValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function updateSupplyCounts() {
  const cards = [...document.querySelectorAll(".supply-item")];
  const lowCount = cards.filter(card => card.classList.contains("low")).length;
  document.querySelector('#supplyStatusFilter [data-filter="all"]').textContent = `全部 ${cards.length}`;
  document.querySelector('#supplyStatusFilter [data-filter="low"]').textContent = `需补货 ${lowCount}`;
  document.querySelector('#supplyStatusFilter [data-filter="sufficient"]').textContent = `充足 ${cards.length - lowCount}`;
}

function renderSupplyStock(card, value) {
  const max = Number(card.dataset.max);
  const unit = card.dataset.unit;
  const normalizedValue = Math.max(0, Math.min(max, Number(value)));
  const ratio = max ? Math.round((normalizedValue / max) * 100) : 0;
  const isLow = ratio <= 30;
  card.dataset.stock = String(normalizedValue);
  card.classList.toggle("low", isLow);
  const stock = card.querySelector(".stock");
  stock.textContent = `剩余 ${formatStockValue(normalizedValue)}${unit === "%" ? "%" : ` ${unit}`}`;
  stock.className = `stock${isLow ? " low-stock" : ""}`;
  const bar = card.querySelector(".stock-bar");
  bar.className = `stock-bar${ratio > 30 ? " full" : ratio > 20 ? " medium" : ""}`;
  bar.querySelector("span").style.width = `${Math.max(0, ratio)}%`;
  const art = card.querySelector(".supply-art");
  let badge = art.querySelector("span");
  if (isLow && !badge) {
    badge = document.createElement("span");
    art.appendChild(badge);
  }
  if (badge) {
    badge.textContent = ratio <= 15 ? "库存告急" : "即将用完";
    if (!isLow) badge.remove();
  }
  state.supplies = state.supplies || {};
  state.supplies[card.dataset.name] = normalizedValue;
  saveState();
  updateSupplyCounts();
  applySupplyFilters();
}

function syncSupplyInputs(value) {
  const unit = editingSupplyCard.dataset.unit;
  const normalizedValue = Math.max(0, Math.min(Number(editingSupplyCard.dataset.max), Number(value)));
  supplyRange.value = normalizedValue;
  supplyQuantity.value = normalizedValue;
  document.querySelector("#supplyValuePreview").textContent = `${formatStockValue(normalizedValue)}${unit === "%" ? "%" : ` ${unit}`}`;
}

function openSupplyModal(card) {
  editingSupplyCard = card;
  const stock = Number(card.dataset.stock);
  const max = Number(card.dataset.max);
  const unit = card.dataset.unit;
  document.querySelector("#supplyModalTitle").textContent = `更新「${card.dataset.name}」余量`;
  document.querySelector("#supplyModalDescription").textContent = `当前记录：${formatStockValue(stock)}${unit === "%" ? "%" : ` ${unit}`}`;
  document.querySelector("#supplyUnit").textContent = unit;
  supplyRange.max = max;
  supplyRange.step = unit === "kg" ? "0.1" : "1";
  supplyQuantity.max = max;
  supplyQuantity.step = unit === "kg" ? "0.1" : "1";
  syncSupplyInputs(stock);
  supplyModal.classList.add("open");
  supplyModal.setAttribute("aria-hidden", "false");
  setTimeout(() => supplyQuantity.focus(), 50);
}

function closeSupplyModal() {
  supplyModal.classList.remove("open");
  supplyModal.setAttribute("aria-hidden", "true");
  editingSupplyCard = null;
}

supplyRange.addEventListener("input", event => syncSupplyInputs(event.target.value));
supplyQuantity.addEventListener("input", event => {
  if (event.target.value !== "") syncSupplyInputs(event.target.value);
});
document.querySelectorAll(".close-supply-modal").forEach(button => button.addEventListener("click", closeSupplyModal));
supplyModal.addEventListener("click", event => { if (event.target === supplyModal) closeSupplyModal(); });
document.querySelector("#supplyForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = editingSupplyCard.dataset.name;
  renderSupplyStock(editingSupplyCard, Number(supplyQuantity.value));
  closeSupplyModal();
  showToast(`「${name}」余量已更新`);
});

document.querySelectorAll(".consume-button").forEach(button => {
  button.addEventListener("click", () => {
    const card = button.closest(".supply-item");
    if (button.textContent.includes("更新余量")) {
      openSupplyModal(card);
      return;
    }
    renderSupplyStock(card, Number(card.dataset.stock) - 1);
    showToast(`已记录使用 1 ${card.dataset.unit}`);
  });
});

let activeSupplyStatus = "all";

function applySupplyFilters() {
  const keyword = document.querySelector("#supplySearch").value.trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll(".supply-item").forEach(card => {
    const searchMatch = card.dataset.name.toLowerCase().includes(keyword);
    const isLow = card.classList.contains("low");
    const statusMatch = activeSupplyStatus === "all" ||
      (activeSupplyStatus === "low" && isLow) ||
      (activeSupplyStatus === "sufficient" && !isLow);
    const visible = searchMatch && statusMatch;
    card.style.display = visible ? "" : "none";
    if (visible) visibleCount += 1;
  });
  document.querySelector("#supplyEmpty").classList.toggle("show", visibleCount === 0);
}

document.querySelector("#supplySearch").addEventListener("input", applySupplyFilters);
document.querySelectorAll("#supplyStatusFilter button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#supplyStatusFilter button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeSupplyStatus = button.dataset.filter;
    applySupplyFilters();
  });
});

let activeRuleTab = "all";

function applyRuleTab() {
  const history = document.querySelector("#ruleHistory");
  const currentList = document.querySelector("#ruleCurrentList");
  const showHistory = activeRuleTab === "history";
  history.classList.toggle("show", showHistory);
  currentList.style.display = showHistory ? "none" : "";
  if (showHistory) return;
  let visibleCount = 0;
  currentList.querySelectorAll(".rule-card").forEach(card => {
    const visible = activeRuleTab === "all" || card.dataset.ruleState === "pending";
    card.style.display = visible ? "" : "none";
    if (visible) visibleCount += 1;
  });
  document.querySelector("#ruleEmpty").classList.toggle("show", visibleCount === 0);
}

function updatePendingRuleCount() {
  const count = document.querySelectorAll('.rule-card[data-rule-state="pending"]').length;
  document.querySelector("#pendingRuleCount").textContent = count;
}

document.querySelector(".confirm-button").addEventListener("click", event => {
  const card = event.currentTarget.closest(".rule-card");
  card.dataset.ruleState = "active";
  card.querySelector(".status-pill").textContent = "我已确认";
  card.querySelector(".status-pill").className = "status-pill active-rule";
  event.currentTarget.remove();
  const myAvatar = card.querySelector(".avatar-you");
  myAvatar?.classList.add("confirmed");
  state.ruleConfirmed = true;
  saveState();
  updatePendingRuleCount();
  applyRuleTab();
  showToast("已确认约定，等待另外 2 位室友");
});

document.querySelectorAll("#ruleTabs button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#ruleTabs button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeRuleTab = button.dataset.tab;
    applyRuleTab();
  });
});

document.querySelector("#mobileMenu").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.add("open");
  document.querySelector("#mobileOverlay").classList.add("open");
});
document.querySelector("#mobileOverlay").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.remove("open");
  document.querySelector("#mobileOverlay").classList.remove("open");
});

document.querySelector("#noticeButton").addEventListener("click", event => {
  event.currentTarget.querySelector(".notification-dot")?.remove();
  showToast("2 笔费用待处理，1 条公约待确认");
});

["#newChore", "#addSupply", "#addRule"].forEach(selector => {
  document.querySelector(selector).addEventListener("click", () => showToast("功能入口已就绪，完整版本将支持自定义创建"));
});

const date = new Date();
document.querySelector("#todayLabel").textContent = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · 星期${"日一二三四五六"[date.getDay()]}`;

if (state.supplies) {
  document.querySelectorAll(".supply-item").forEach(card => {
    const savedValue = state.supplies[card.dataset.name];
    if (savedValue !== undefined) renderSupplyStock(card, savedValue);
  });
}
updateSupplyCounts();
updatePendingRuleCount();
if (state.choreComplete) document.querySelector(".complete-chore")?.click();
if (state.ruleConfirmed) document.querySelector(".confirm-button")?.click();
iconRefresh();
