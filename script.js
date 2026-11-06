/* ==========================================
   RUANGAGENDA - MAIN JAVASCRIPT
========================================== */

/* ===== KONFIGURASI ADMIN ===== */

// GANTI USERNAME DAN PASSWORD DI SINI
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Tempat penyimpanan data
const STORAGE_KEY = "ruangagenda_activities_v1";


/* ===== ELEMENT SELECTOR ===== */

const $ = (id) => document.getElementById(id);

const loadingScreen = $("loadingScreen");
const loginScreen = $("loginScreen");
const appScreen = $("appScreen");

let activities = [];
let selectedDate = getLocalDateString(new Date());

let calendarDate = new Date();
calendarDate.setDate(1);

let toastTimer;


/* ===== DATE HELPERS ===== */

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getShortMonth(dateString) {
  return new Date(dateString + "T00:00:00")
    .toLocaleDateString("id-ID", { month: "short" });
}

function getActivityStatus(activity) {
  const now = new Date();

  // Gabungkan tanggal dan jam kegiatan
  const activityDateTime = new Date(
    `${activity.date}T${activity.time}:00`
  );

  // Jika tanggal dan jam sudah lewat
  if (now >= activityDateTime) {
    return "completed";
  }

  return "upcoming";
}

function getStatusLabel(activity) {
  return getActivityStatus(activity) === "completed"
    ? "Selesai"
    : "Akan Datang";
}


/* ===== LOADING SCREEN ===== */

function startLoading() {
  const duration = 7000;
  const startTime = Date.now();

  const progressBar = $("progressBar");
  const progressPercent = $("progressPercent");
  const loadingText = $("loadingText");

  const messages = [
    "Menyiapkan aplikasi...",
    "Memuat tampilan...",
    "Menyiapkan dashboard...",
    "Hampir selesai..."
  ];

  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(
      100,
      Math.floor((elapsed / duration) * 100)
    );

    progressBar.style.width = progress + "%";
    progressPercent.textContent = progress + "%";

    const messageIndex = Math.min(
      messages.length - 1,
      Math.floor(progress / 25)
    );

    loadingText.textContent = messages[messageIndex];

    if (progress >= 100) {
      clearInterval(interval);

      setTimeout(() => {
        loadingScreen.classList.add("hidden");
        loginScreen.classList.remove("hidden");
      }, 350);
    }
  }, 50);
}


/* ===== LOCAL STORAGE ===== */

function loadActivities() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      activities = [];
      return;
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      activities = [];
      return;
    }

    activities = parsedData.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
      typeof item.time === "string"
    );

  } catch (error) {
    console.error("Gagal membaca data:", error);
    activities = [];
    showToast("Data tidak dapat dibaca.");
  }
}

function saveActivities() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(activities)
    );

    return true;

  } catch (error) {
    console.error("Gagal menyimpan:", error);
    showToast("Penyimpanan gagal. Periksa ruang browser.");
    return false;
  }
}


/* ===== LOGIN ===== */

$("loginForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {
    $("loginError").textContent = "";

    loadActivities();

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    $("password").value = "";

    initializeDashboard();
    showToast("Selamat datang, Administrator!");

  } else {
    $("loginError").textContent =
      "Username atau password yang kamu masukkan salah!";

    $("password").value = "";
    $("password").focus();
  }
});


/* ===== SHOW / HIDE PASSWORD ===== */

$("togglePassword").addEventListener("click", function() {
  const passwordInput = $("password");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    this.textContent = "◎";
  } else {
    passwordInput.type = "password";
    this.textContent = "◉";
  }
});


/* ===== LOGOUT ===== */

$("logoutButton").addEventListener("click", function() {
  if (!confirm("Yakin ingin keluar dari akun admin?")) return;

  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  $("loginForm").reset();
  $("loginError").textContent = "";

  closeSidebar();
  showToast("Kamu telah keluar.");
});


/* ===== INITIALIZE DASHBOARD ===== */

function initializeDashboard() {
  updateCurrentDate();
  renderDashboard();
  renderScheduleTable();
  renderCalendar();
}

function updateCurrentDate() {
  $("currentDate").textContent =
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}


/* ===== NAVIGATION ===== */

function showPage(pageName) {
  const pages = {
    dashboard: {
      id: "dashboardPage",
      title: "Dashboard"
    },
    schedule: {
      id: "schedulePage",
      title: "Daftar Kegiatan"
    },
    calendar: {
      id: "calendarPage",
      title: "Kalender Kegiatan"
    }
  };

  if (!pages[pageName]) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.classList.remove("active");
  });

  $(pages[pageName].id).classList.add("active-page");

  const activeButton = document.querySelector(
    `.nav-item[data-page="${pageName}"]`
  );

  if (activeButton) {
    activeButton.classList.add("active");
  }

  $("pageTitle").textContent = pages[pageName].title;

  if (pageName === "dashboard") renderDashboard();
  if (pageName === "schedule") renderScheduleTable();
  if (pageName === "calendar") renderCalendar();

  closeSidebar();
}

document.querySelectorAll(".nav-item[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});


/* ===== SIDEBAR MOBILE ===== */

function closeSidebar() {
  $("sidebar").classList.remove("show");
}

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.add("show");
});

$("closeSidebar").addEventListener("click", closeSidebar);


/* ===== DASHBOARD ===== */

function renderDashboard() {
  const today = getLocalDateString(new Date());

  const completed = activities.filter(
    item => getActivityStatus(item) === "completed"
  );

  const upcoming = activities.filter(
    item => getActivityStatus(item) === "upcoming"
  );

  const todayList = activities.filter(
    item => item.date === today
  );

  $("totalActivities").textContent = activities.length;
  $("completedActivities").textContent = completed.length;
  $("upcomingActivities").textContent = upcoming.length;
  $("todayActivities").textContent = todayList.length;

  const recent = [...activities].sort((a, b) => {
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  }).slice(0, 5);

  const container = $("recentActivities");

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>▤</div>
        <h3>Belum ada kegiatan</h3>
        <p>Mulai dengan menambahkan jadwal baru.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(item => `
    <div class="activity-item">
      <div class="activity-date-box">
        <strong>${new Date(item.date + "T00:00:00").getDate()}</strong>
        <small>${getShortMonth(item.date)}</small>
      </div>
      <div class="activity-details">
        <strong>${escapeHTML(item.name)}</strong>
        <small>${escapeHTML(item.time)} · ${escapeHTML(item.location || "Lokasi belum diisi")}</small>
      </div>
      <span class="status-badge ${
        getActivityStatus(item) === "completed"
          ? "status-completed"
          : "status-upcoming"
      }">${getStatusLabel(item)}</span>
    </div>
  `).join("");
}


/* ===== SCHEDULE TABLE ===== */

function renderScheduleTable() {
  const search = $("searchInput").value.toLowerCase().trim();
  const filter = $("filterStatus").value;

  let filtered = [...activities];

  if (search) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(search) ||
      (item.location || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search)
    );
  }

  if (filter !== "all") {
    filtered = filtered.filter(item =>
      getActivityStatus(item) === filter
    );
  }

  filtered.sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  const tbody = $("scheduleTableBody");
  $("scheduleEmpty").classList.toggle("hidden", filtered.length > 0);

  tbody.innerHTML = filtered.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHTML(item.name)}</strong><br>
        <small>${escapeHTML(item.category || "Lainnya")}</small>
      </td>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHTML(item.time)}</td>
      <td>${escapeHTML(item.location || "-")}</td>
      <td>
        <span class="status-badge ${
          getActivityStatus(item) === "completed"
            ? "status-completed"
            : "status-upcoming"
        }">${getStatusLabel(item)}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="edit-btn" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="delete-btn" data-action="delete" data-id="${item.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");
}


/* ===== SEARCH & FILTER ===== */

$("searchInput").addEventListener("input", renderScheduleTable);
$("filterStatus").addEventListener("change", renderScheduleTable);


/* ===== ADD ACTIVITY ===== */

function openAddModal() {
  $("activityForm").reset();
  $("editId").value = "";
  $("modalTitle").textContent = "Tambah Kegiatan";
  $("activityModal").classList.remove("hidden");
}

function closeModal() {
  $("activityModal").classList.add("hidden");
}

$("addActivityButton").addEventListener("click", openAddModal);
$("bannerAddButton").addEventListener("click", openAddModal);
$("quickAdd").addEventListener("click", openAddModal);
$("calendarAddButton").addEventListener("click", openAddModal);

$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);

$("activityModal").addEventListener("click", function(event) {
  if (event.target === this) closeModal();
});


/* ===== SAVE / EDIT ACTIVITY ===== */

$("activityForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const id = $("editId").value;

  const activityData = {
    name: $("activityName").value.trim(),
    date: $("activityDate").value,
    time: $("activityTime").value,
    location: $("activityLocation").value.trim(),
    category: $("activityCategory").value,
    description: $("activityDescription").value.trim()
  };

  if (!activityData.name || !activityData.date || !activityData.time) {
    showToast("Mohon isi semua kolom wajib.");
    return;
  }

  if (id) {
    const index = activities.findIndex(item => item.id === id);

    if (index === -1) return;

    activities[index] = {
      ...activities[index],
      ...activityData,
      updatedAt: new Date().toISOString()
    };

    showToast("Kegiatan berhasil diperbarui!");

  } else {
    activities.push({
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      ...activityData,
      createdAt: new Date().toISOString()
    });

    showToast("Kegiatan berhasil ditambahkan!");
  }

  if (!saveActivities()) return;

  closeModal();
  refreshAll();
});


/* ===== EDIT & DELETE ===== */

$("scheduleTableBody").addEventListener("click", function(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") editActivity(id);
  if (action === "delete") deleteActivity(id);
});

function editActivity(id) {
  const item = activities.find(activity => activity.id === id);

  if (!item) return;

  $("editId").value = item.id;
  $("activityName").value = item.name;
  $("activityDate").value = item.date;
  $("activityTime").value = item.time;
  $("activityLocation").value = item.location || "";
  $("activityCategory").value = item.category || "Lainnya";
  $("activityDescription").value = item.description || "";

  $("modalTitle").textContent = "Edit Kegiatan";
  $("activityModal").classList.remove("hidden");
}

function deleteActivity(id) {
  const item = activities.find(activity => activity.id === id);

  if (!item) return;

  if (!confirm(`Hapus kegiatan "${item.name}"?`)) return;

  activities = activities.filter(activity => activity.id !== id);

  if (!saveActivities()) return;

  refreshAll();
  showToast("Kegiatan berhasil dihapus.");
}


/* ===== CALENDAR ===== */

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("calendarMonth").textContent = calendarDate.toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" }
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  const today = getLocalDateString(new Date());

  let html = "";

  for (let i = 0; i < 42; i++) {
    let day;
    let date;
    let isOtherMonth = false;

    if (i < firstDay) {
      day = previousMonthDays - firstDay + i + 1;
      date = getLocalDateString(new Date(year, month - 1, day));
      isOtherMonth = true;

    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      date = getLocalDateString(new Date(year, month + 1, day));
      isOtherMonth = true;

    } else {
      day = i - firstDay + 1;
      date = getLocalDateString(new Date(year, month, day));
    }

    const hasActivity = activities.some(item => item.date === date);

    const classes = [
      "calendar-day",
      isOtherMonth ? "other-month" : "",
      date === today ? "today" : "",
      date === selectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");

    html += `
      <button class="${classes}" data-date="${date}">
        ${day}
        ${hasActivity ? '<span class="calendar-dot"></span>' : ""}
      </button>
    `;
  }

  $("calendarDays").innerHTML = html;

  renderSelectedDay();
}

$("calendarDays").addEventListener("click", function(event) {
  const button = event.target.closest("[data-date]");

  if (!button) return;

  selectedDate = button.dataset.date;

  const selected = new Date(selectedDate + "T00:00:00");

  if (
    selected.getMonth() !== calendarDate.getMonth() ||
    selected.getFullYear() !== calendarDate.getFullYear()
  ) {
    calendarDate = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      1
    );
  }

  renderCalendar();
});

$("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});


/* ===== SELECTED DAY ===== */

function renderSelectedDay() {
  $("selectedDateTitle").textContent = formatDate(selectedDate);

  const list = activities
    .filter(item => item.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const container = $("selectedDayActivities");

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>♡</div>
        <h3>Tidak ada kegiatan</h3>
        <p>Belum ada agenda pada tanggal ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="activity-item">
      <div class="activity-date-box">
        <strong>◷</strong>
        <small>${escapeHTML(item.time)}</small>
      </div>
      <div class="activity-details">
        <strong>${escapeHTML(item.name)}</strong>
        <small>${escapeHTML(item.location || "Lokasi belum diisi")}</small>
      </div>
    </div>
  `).join("");
}


/* ===== QUICK NAVIGATION ===== */

$("seeAllButton").addEventListener("click", () => {
  showPage("schedule");
});

$("quickCalendar").addEventListener("click", () => {
  showPage("calendar");
});

$("quickBackup").addEventListener("click", backupData);


/* ===== BACKUP DATA ===== */

function backupData() {
  const data = {
    app: "RuangAgenda",
    version: 1,
    exportedAt: new Date().toISOString(),
    activities: activities
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `RuangAgenda-Backup-${getLocalDateString(new Date())}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Backup data berhasil dibuat!");
}

$("backupButton").addEventListener("click", backupData);


/* ===== RESTORE DATA ===== */

$("restoreButton").addEventListener("click", () => {
  $("restoreInput").click();
});

$("restoreInput").addEventListener("change", async function() {
  const file = this.files[0];

  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (
      data.app !== "RuangAgenda" ||
      !Array.isArray(data.activities)
    ) {
      throw new Error("Format backup tidak valid.");
    }

    const validData = data.activities.every(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
      typeof item.time === "string"
    );

    if (!validData) {
      throw new Error("Isi data backup tidak valid.");
    }

    if (!confirm(
      "Restore akan mengganti seluruh data kegiatan saat ini. Lanjutkan?"
    )) {
      this.value = "";
      return;
    }

    const previousData = activities;
    activities = data.activities;

    if (!saveActivities()) {
      activities = previousData;
      return;
    }

    refreshAll();
    showToast("Data berhasil dipulihkan!");

  } catch (error) {
    showToast("Gagal restore: file tidak valid.");
    console.error(error);

  } finally {
    this.value = "";
  }
});


/* ===== REFRESH ALL DATA ===== */

function refreshAll() {
  renderDashboard();
  renderScheduleTable();
  renderCalendar();
}


/* ===== HTML ESCAPE ===== */

// Mencegah input pengguna dibaca sebagai HTML.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}


/* ===== TOAST NOTIFICATION ===== */

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


/* ===== START APPLICATION ===== */

document.addEventListener("DOMContentLoaded", () => {
  startLoading();
});