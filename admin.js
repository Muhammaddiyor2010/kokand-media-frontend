const API_BASE = "http://127.0.0.1:8000";
const TOKEN_KEY = "agentva_admin_token";

let chart = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessiya tugadi");
  }

  return response;
}

function statusLabel(status) {
  if (status === "new") return "Yangi";
  if (status === "seen") return "Ko'rilgan";
  return "Tugagan";
}

function serviceTextFromArray(services) {
  return services.map((s) => `${s.title} | ${s.description}`).join("\n");
}

function serviceArrayFromText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...descParts] = line.split("|");
      return {
        title: (title || "").trim(),
        description: descParts.join("|").trim(),
      };
    })
    .filter((s) => s.title && s.description);
}

async function loadOverview() {
  const response = await api("/api/admin/stats/overview");
  const data = await response.json();

  document.getElementById("stTotal").textContent = data.total;
  document.getElementById("stNew").textContent = data.new;
  document.getElementById("stSeen").textContent = data.seen;
  document.getElementById("stDone").textContent = data.done;
}

async function loadChart() {
  const year = new Date().getFullYear();
  const response = await api(`/api/admin/stats/monthly?year=${year}`);
  const data = await response.json();

  const labels = data.months.map((m) => m.month.slice(5));
  const values = data.months.map((m) => m.count);

  const ctx = document.getElementById("monthlyChart");
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "So'rovlar soni",
          data: values,
          borderColor: "#4cd7d0",
          backgroundColor: "rgba(76, 215, 208, 0.2)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#ecf3ff",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#bdd0ef" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "#bdd0ef", precision: 0 },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });
}

async function loadContentForm() {
  const response = await api("/api/admin/content");
  const data = await response.json();

  const form = document.getElementById("contentForm");
  form.brand.value = data.brand;
  form.hero_title.value = data.hero_title;
  form.hero_subtitle.value = data.hero_subtitle;
  form.monthly_price.value = data.monthly_price;
  form.one_time_video_price.value = data.one_time_video_price;
  form.phone.value = data.phone;
  form.telegram.value = data.telegram;
  form.about.value = data.about;
  form.servicesText.value = serviceTextFromArray(data.services);
}

async function saveContent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("contentMessage");
  message.classList.remove("error");

  const payload = {
    brand: form.brand.value.trim(),
    hero_title: form.hero_title.value.trim(),
    hero_subtitle: form.hero_subtitle.value.trim(),
    monthly_price: Number(form.monthly_price.value),
    one_time_video_price: Number(form.one_time_video_price.value),
    phone: form.phone.value.trim(),
    telegram: form.telegram.value.trim(),
    about: form.about.value.trim(),
    services: serviceArrayFromText(form.servicesText.value),
  };

  if (payload.services.length === 0) {
    message.classList.add("error");
    message.textContent = "Xizmatlar formatini to'g'ri kiriting.";
    return;
  }

  const response = await api("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    message.classList.add("error");
    message.textContent = "Saqlashda xatolik.";
    return;
  }

  message.textContent = "Kontent saqlandi.";
}

async function updateStatus(requestId, status) {
  await api(`/api/admin/requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function loadRequests() {
  const filter = document.getElementById("statusFilter").value;
  const q = filter ? `?status=${filter}` : "";
  const response = await api(`/api/admin/requests${q}`);
  const rows = await response.json();

  const tbody = document.getElementById("requestRows");
  tbody.innerHTML = "";

  rows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.phone}</td>
      <td>${item.comment || "-"}</td>
      <td>${item.created_at.replace("T", " ")}</td>
      <td>
        <select data-id="${item.id}" class="status-select">
          <option value="new" ${item.status === "new" ? "selected" : ""}>Yangi</option>
          <option value="seen" ${item.status === "seen" ? "selected" : ""}>Ko'rilgan</option>
          <option value="done" ${item.status === "done" ? "selected" : ""}>Tugagan</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".status-select").forEach((el) => {
    el.addEventListener("change", async (e) => {
      const id = Number(e.target.getAttribute("data-id"));
      await updateStatus(id, e.target.value);
      await Promise.all([loadOverview(), loadChart()]);
    });
  });
}

async function bootDashboard() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  await Promise.all([loadOverview(), loadChart(), loadContentForm(), loadRequests()]);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("loginMessage");
  message.classList.remove("error");

  const payload = {
    username: form.username.value.trim(),
    password: form.password.value,
  };

  const response = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    message.classList.add("error");
    message.textContent = "Login xato.";
    return;
  }

  const data = await response.json();
  setToken(data.access_token);
  message.textContent = "";
  await bootDashboard();
}

function attachEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("contentForm").addEventListener("submit", saveContent);
  document.getElementById("statusFilter").addEventListener("change", loadRequests);
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

async function init() {
  attachEvents();
  if (getToken()) {
    try {
      await bootDashboard();
    } catch {
      logout();
    }
  }
}

init();
