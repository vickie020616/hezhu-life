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
document.addEventListener("keydown", event => { if (event.key === "Escape") closeExpenseModal(); });

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
  row.innerHTML = `
    <span class="category-icon grocery"><i data-lucide="receipt-text"></i></span>
    <div class="expense-main"><strong>${title}</strong><span>小满支付 · 刚刚</span></div>
    <div class="split-avatars"><span class="avatar avatar-you">林</span><span class="avatar avatar-qiao">乔</span><span class="avatar avatar-an">安</span><span class="avatar avatar-lu">陆</span></div>
    <div class="expense-amount"><strong>¥ ${amount.toFixed(2)}</strong><span>人均 ¥${(amount / 4).toFixed(2)}</span></div>
    <span class="status-pill reviewing">待确认</span>`;
  document.querySelector("#expenseList").prepend(row);
  state.lastExpense = { title, amount };
  saveState();
  closeExpenseModal();
  event.currentTarget.reset();
  document.querySelector("#splitAmount").textContent = "每人 ¥0.00";
  iconRefresh();
  switchPage("expenses");
  showToast("费用已记录，已通知 3 位室友");
});

document.querySelectorAll(".pay-button").forEach(button => {
  button.addEventListener("click", () => {
    button.outerHTML = '<span class="status-pill settled">已支付</span>';
    const remaining = document.querySelectorAll(".pay-button").length;
    document.querySelector("#expenseBadge").textContent = remaining;
    document.querySelector("#myBalance").textContent = remaining ? "¥ 27.20" : "¥ 0.00";
    showToast("支付状态已更新");
  });
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

document.querySelectorAll(".consume-button").forEach(button => {
  button.addEventListener("click", () => {
    const card = button.closest(".supply-item");
    const bar = card.querySelector(".stock-bar span");
    const current = parseInt(bar.style.width, 10);
    bar.style.width = `${Math.max(6, current - 10)}%`;
    showToast(`「${card.dataset.name}」余量已更新`);
  });
});

document.querySelector("#supplySearch").addEventListener("input", event => {
  const keyword = event.target.value.trim().toLowerCase();
  document.querySelectorAll(".supply-item").forEach(card => {
    card.style.display = card.dataset.name.toLowerCase().includes(keyword) ? "" : "none";
  });
});

document.querySelector(".confirm-button").addEventListener("click", event => {
  const card = event.currentTarget.closest(".rule-card");
  card.querySelector(".status-pill").textContent = "我已确认";
  card.querySelector(".status-pill").className = "status-pill active-rule";
  event.currentTarget.remove();
  const myAvatar = card.querySelector(".avatar-you");
  myAvatar?.classList.add("confirmed");
  state.ruleConfirmed = true;
  saveState();
  showToast("已确认约定，等待另外 2 位室友");
});

document.querySelectorAll(".segmented, .rule-tabs").forEach(group => {
  group.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    group.querySelectorAll("button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
  }));
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

if (state.choreComplete) document.querySelector(".complete-chore")?.click();
if (state.ruleConfirmed) document.querySelector(".confirm-button")?.click();
iconRefresh();
