"use strict";

const pageContent = document.querySelector("#page-content");
const sidebar = document.querySelector("#app-sidebar");
const menuToggle = document.querySelector("[data-menu-toggle]");
const sidebarScrim = document.querySelector("[data-sidebar-scrim]");
const sessionStatus = document.querySelector("[data-session-status]");
let dashboardData = null;

const routeTitles = {
  dashboard: ["Your Workspace", "Everything you need to understand your resume and explore career opportunities."],
  "resume-analyzer": ["Resume Analyzer", "Upload a resume to review your professional information."],
  "job-matcher": ["Job Matcher", "Compare a resume with a job description you provide."],
  "my-resumes": ["My Resumes", "Review the resumes available in your account."],
  "match-history": ["Match History", "Review your previous job comparisons."],
  profile: ["Profile", "Manage your personal and account details."],
  settings: ["Settings", "Manage your account preferences."]
};

function icon(name) {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    resume: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    analysis: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    comparison: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/>',
    saved: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function pageHeading(route) {
  const [title, description] = routeTitles[route];
  return `<header class="page-heading"><h1>${title}</h1><p>${description}</p></header>`;
}

function renderDashboard() {
  const stats = [
    ["Total Resumes", "totalResumes", "resume"],
    ["Resumes Analyzed", "resumesAnalyzed", "analysis"],
    ["Job Comparisons", "jobComparisons", "comparison"],
    ["Saved Results", "savedResults", "saved"]
  ];

  return `<section class="dashboard-hero" aria-labelledby="dashboard-title">
      <p class="dashboard-kicker">CareerFit <span aria-hidden="true">/</span> Workspace</p>
      <h1 id="dashboard-title">Your Workspace</h1>
      <p class="dashboard-subtitle">Everything you need to understand your resume and explore career opportunities.</p>
      <p class="welcome-line">Welcome back<span data-user-name></span></p>
    </section>
    <section class="stats-grid" aria-label="Account statistics">
      ${stats.map(([label, key, symbol]) => `<article class="stat-card stat-card-${key}"><div class="stat-card-top"><span class="stat-label">${label}</span><span class="stat-icon" aria-hidden="true">${icon(symbol)}</span></div><strong class="stat-value" data-stat="${key}">--</strong><span class="stat-footnote">From your account</span></article>`).join("")}
    </section>
    <div class="dashboard-lower-grid">
      <section class="panel activity-panel" aria-labelledby="recent-activity-title">
        <div class="panel-heading activity-heading">
          <div><p class="panel-kicker">Your recent work</p><h2 id="recent-activity-title">Recent Activity</h2></div>
          <span class="activity-period">Latest updates</span>
        </div>
        <div class="activity-list" data-activity-list>
          <div class="activity-empty"><strong>No activity yet.</strong><p>Resume and job matching updates will appear here.</p></div>
        </div>
      </section>
      <div class="overview-stack">
        <section class="overview-card resume-overview" aria-labelledby="resume-overview-title">
          <div class="overview-heading">
            <span class="overview-icon" aria-hidden="true">${icon("resume")}</span>
            <div><p class="panel-kicker">Your documents</p><h2 id="resume-overview-title">Resume Overview</h2></div>
          </div>
          <div class="overview-metrics">
            <div><span>Uploaded</span><strong data-overview="totalResumes">--</strong></div>
            <div><span>Analyzed</span><strong data-overview="resumesAnalyzed">--</strong></div>
          </div>
          <div class="overview-recent">
            <span>Most recently analyzed</span>
            <strong data-most-recent-resume>Not available</strong>
            <time data-most-recent-resume-date></time>
          </div>
        </section>
        <section class="overview-card matching-overview" aria-labelledby="matching-overview-title">
          <div class="overview-heading">
            <span class="overview-icon" aria-hidden="true">${icon("comparison")}</span>
            <div><p class="panel-kicker">Your comparisons</p><h2 id="matching-overview-title">Job Matching Overview</h2></div>
          </div>
          <div class="overview-metrics">
            <div><span>Total comparisons</span><strong data-overview="jobComparisons">--</strong></div>
            <div><span>Average match score</span><strong data-average-match-score>--</strong></div>
          </div>
          <div class="overview-recent">
            <span>Most recent comparison</span>
            <strong data-most-recent-comparison>No comparison yet</strong>
            <time data-most-recent-comparison-date></time>
          </div>
        </section>
      </div>
    </div>`;
}

function setTimeElement(element, value) {
  element.textContent = "";
  element.removeAttribute("datetime");

  if (typeof value !== "string" && typeof value !== "number") {
    return;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    element.textContent = String(value);
    return;
  }

  element.dateTime = date.toISOString();
  element.textContent = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderRecentActivity(items) {
  const list = pageContent.querySelector("[data-activity-list]");
  if (!list) {
    return;
  }

  list.replaceChildren();
  const activities = Array.isArray(items) ? items.filter((item) => item && typeof item === "object") : [];

  if (!activities.length) {
    const empty = document.createElement("div");
    empty.className = "activity-empty";
    empty.innerHTML = "<strong>No activity yet.</strong><p>Resume and job matching updates will appear here.</p>";
    list.append(empty);
    return;
  }

  const labels = {
    resume_analysis: ["Resume analyzed", "analysis"],
    resume_upload: ["Resume activity", "resume"],
    job_comparison: ["Job comparison", "comparison"]
  };

  activities.forEach((activity) => {
    const [defaultTitle, iconName] = labels[activity.type] || ["Career activity", "activity"];
    const row = document.createElement("article");
    row.className = "activity-row";

    const symbol = document.createElement("span");
    symbol.className = "activity-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.innerHTML = icon(iconName);

    const content = document.createElement("div");
    content.className = "activity-content";

    const title = document.createElement("h3");
    title.textContent = typeof activity.title === "string" && activity.title.trim()
      ? activity.title
      : defaultTitle;
    content.append(title);

    const detailText = typeof activity.detail === "string" && activity.detail.trim()
      ? activity.detail
      : [activity.resumeName, activity.jobTitle].filter((value) => typeof value === "string" && value.trim()).join(" · ");

    if (detailText) {
      const detail = document.createElement("p");
      detail.textContent = detailText;
      content.append(detail);
    }

    const time = document.createElement("time");
    setTimeElement(time, activity.date || activity.createdAt || activity.occurredAt);

    row.append(symbol, content, time);
    list.append(row);
  });
}

function updateDashboardData(data) {
  if (!data || typeof data !== "object") {
    throw new TypeError("Dashboard data must be an object.");
  }
  if (!pageContent.querySelector("[data-stat]")) {
    return;
  }

  pageContent.querySelectorAll("[data-stat], [data-overview]").forEach((element) => {
    element.textContent = "--";
  });
  const userName = pageContent.querySelector("[data-user-name]");
  if (userName) {
    userName.textContent = "";
  }
  pageContent.querySelector("[data-most-recent-resume]").textContent = "Not available";
  pageContent.querySelector("[data-most-recent-comparison]").textContent = "No comparison yet";
  pageContent.querySelector("[data-average-match-score]").textContent = "--";
  setTimeElement(pageContent.querySelector("[data-most-recent-resume-date]"), "");
  setTimeElement(pageContent.querySelector("[data-most-recent-comparison-date]"), "");

  const countFields = ["totalResumes", "resumesAnalyzed", "jobComparisons", "savedResults"];
  countFields.forEach((field) => {
    const value = data[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return;
    }

    pageContent.querySelectorAll(`[data-stat="${field}"], [data-overview="${field}"]`)
      .forEach((element) => {
        element.textContent = String(value);
      });
  });

  if (userName && typeof data.userName === "string") {
    userName.textContent = data.userName.trim() ? `, ${data.userName.trim()}` : "";
  }

  const recentResume = data.mostRecentlyAnalyzedResume;
  const recentResumeName = pageContent.querySelector("[data-most-recent-resume]");
  if (recentResumeName && recentResume && typeof recentResume.name === "string" && recentResume.name.trim()) {
    recentResumeName.textContent = recentResume.name;
    setTimeElement(pageContent.querySelector("[data-most-recent-resume-date]"), recentResume.analyzedAt);
  }

  const averageScore = data.averageMatchScore;
  const comparisonCount = data.jobComparisons;
  if (
    typeof averageScore === "number"
    && Number.isFinite(averageScore)
    && averageScore >= 0
    && averageScore <= 100
    && typeof comparisonCount === "number"
    && comparisonCount > 0
  ) {
    pageContent.querySelector("[data-average-match-score]").textContent =
      `${averageScore.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  }

  const recentComparison = data.mostRecentComparison;
  const comparisonTitle = pageContent.querySelector("[data-most-recent-comparison]");
  if (recentComparison && typeof recentComparison === "object") {
    const title = recentComparison.title || recentComparison.jobDescriptionTitle || recentComparison.resumeName;
    if (typeof title === "string" && title.trim()) {
      comparisonTitle.textContent = title;
      setTimeElement(
        pageContent.querySelector("[data-most-recent-comparison-date]"),
        recentComparison.comparedAt || recentComparison.date
      );
    }
  }

  renderRecentActivity(data.recentActivity);
}

function renderResumeAnalyzer() {
  return `${pageHeading("resume-analyzer")}
    <div class="two-column">
      <section class="panel form-panel" aria-labelledby="upload-title">
        <h2 id="upload-title">Upload Resume</h2>
        <p>Select a resume file to prepare it for analysis.</p>
        <form data-resume-form novalidate>
          <div class="form-field">
            <label for="resume-file">Resume file</label>
            <input class="file-input" id="resume-file" name="resume" type="file" aria-describedby="file-format-note file-error">
            <label class="upload-zone" for="resume-file">
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>
                <strong>Choose a resume file</strong>
                <p>File format and size requirements depend on the connected service.</p>
                <span class="button button-secondary">Browse files</span>
              </span>
            </label>
            <p class="field-note" id="file-format-note">Accepted formats and limits have not been confirmed yet.</p>
            <p class="form-error" id="file-error" data-file-error aria-live="polite"></p>
            <div class="file-selected" data-file-selected hidden>
              <span class="file-name" data-file-name></span>
              <button class="text-button" type="button" data-remove-file>Remove file</button>
            </div>
          </div>
          <button class="button" type="submit">Analyze Resume ${icon("arrow")}</button>
          <p class="form-status" data-resume-status role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="panel results-panel" aria-labelledby="analysis-results-title">
        <div class="panel-heading"><h2 id="analysis-results-title">Analysis Results</h2><p>Results will appear after analysis is connected.</p></div>
        <div class="results-grid">
          ${["Personal Information", "Education", "Experience", "Skills", "Resume Feedback"].map((item) => `<article class="result-tile"><h3>${item}</h3><p>No analysis data yet.</p></article>`).join("")}
        </div>
      </section>
    </div>`;
}

function renderJobMatcher() {
  const resultTiles = ["Match Score", "Matched Skills", "Missing Skills", "Relevant Resume Information"];
  return `${pageHeading("job-matcher")}
    <div class="two-column">
      <section class="panel form-panel" aria-labelledby="comparison-title">
        <h2 id="comparison-title">Compare a Resume</h2>
        <p>Choose an available resume and provide a job description.</p>
        <form data-match-form novalidate>
          <div class="form-field">
            <label for="match-resume">Resume</label>
            <select id="match-resume" name="resume" aria-describedby="match-resume-note">
              <option value="">No resumes available</option>
            </select>
            <p class="field-note" id="match-resume-note">Uploaded resumes will be available here when account data is connected.</p>
            <p class="form-error" data-match-resume-error aria-live="polite"></p>
          </div>
          <div class="form-field">
            <label for="job-description">Job Description</label>
            <textarea id="job-description" name="jobDescription" placeholder="Paste the job description here." aria-describedby="job-description-error"></textarea>
            <p class="form-error" id="job-description-error" data-job-description-error aria-live="polite"></p>
          </div>
          <button class="button" type="submit">Compare Resume ${icon("arrow")}</button>
          <p class="form-status" data-match-status role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="panel results-panel" aria-labelledby="match-results-title">
        <div class="panel-heading"><h2 id="match-results-title">Comparison Results</h2><p>Results will only appear after a connected service completes a comparison.</p></div>
        <div class="results-grid">
          ${resultTiles.map((item) => `<article class="result-tile"><h3>${item}</h3><p>No comparison results yet.</p></article>`).join("")}
        </div>
      </section>
    </div>`;
}

function renderMyResumes() {
  return `${pageHeading("my-resumes")}
    <div class="table-toolbar">
      <p>Resume records will appear here when available.</p>
      <a class="button" href="#resume-analyzer">Upload Resume ${icon("arrow")}</a>
    </div>
    <section class="panel" aria-label="Uploaded resumes">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Resume Name</th><th scope="col">Upload Date</th><th scope="col">File Type</th><th scope="col">Actions</th></tr></thead>
          <tbody><tr class="table-empty"><td colspan="4">No resumes uploaded yet.</td></tr></tbody>
        </table>
      </div>
    </section>`;
}

function renderMatchHistory() {
  return `${pageHeading("match-history")}
    <section class="panel" aria-label="Job comparison history">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Resume Name</th><th scope="col">Job Description Title</th><th scope="col">Match Score</th><th scope="col">Comparison Date</th><th scope="col">Actions</th></tr></thead>
          <tbody><tr class="table-empty"><td colspan="5">No matching history available.</td></tr></tbody>
        </table>
      </div>
    </section>`;
}

function renderProfile() {
  return `${pageHeading("profile")}
    <form class="profile-card" data-profile-form novalidate>
      <div class="section-heading"><div><h2>Personal information</h2><p>Your details will load when account data is connected.</p></div></div>
      <div class="profile-grid">
        <div class="form-field"><label for="profile-name">Full Name</label><input id="profile-name" type="text" placeholder="Not available" disabled></div>
        <div class="form-field"><label for="profile-email">Email</label><input id="profile-email" type="email" placeholder="Not available" disabled></div>
      </div>
      <div class="profile-actions">
        <button class="button" type="button" data-edit-profile>Edit Profile</button>
        <button class="button" type="submit" data-save-profile hidden>Save Changes</button>
        <span class="profile-note" data-profile-status role="status" aria-live="polite"></span>
      </div>
    </form>`;
}

function renderSettings() {
  return `${pageHeading("settings")}
    <div class="settings-stack">
      <section class="setting-card" aria-labelledby="change-password-title">
        <h2 id="change-password-title">Change Password</h2>
        <p>Password updates will be available when account services are connected.</p>
        <form data-password-form novalidate>
          <div class="profile-grid">
            <div class="form-field"><label for="current-password">Current Password</label><input id="current-password" type="password" autocomplete="current-password" required></div>
            <div class="form-field"><label for="new-password">New Password</label><input id="new-password" type="password" autocomplete="new-password" minlength="8" required></div>
          </div>
          <button class="button" type="submit">Update Password</button>
          <p class="form-status" data-password-status role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="setting-card" aria-labelledby="account-settings-title">
        <h2 id="account-settings-title">Account Settings</h2>
        <p>Account controls will be available when account services are connected.</p>
        <a class="account-setting-row" href="#profile"><strong>Profile information</strong><span>Manage your details ${icon("arrow")}</span></a>
        <div class="account-setting-row"><strong>Account data</strong><span>Not available yet</span></div>
      </section>
    </div>`;
}

const pageRenderers = {
  dashboard: renderDashboard,
  "resume-analyzer": renderResumeAnalyzer,
  "job-matcher": renderJobMatcher,
  "my-resumes": renderMyResumes,
  "match-history": renderMatchHistory,
  profile: renderProfile,
  settings: renderSettings
};

function closeMobileSidebar() {
  sidebar.classList.remove("is-open");
  sidebarScrim.classList.remove("is-visible");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}

function renderRoute() {
  const route = window.location.hash.slice(1) || "dashboard";
  const renderPage = pageRenderers[route] || renderDashboard;
  const validRoute = pageRenderers[route] ? route : "dashboard";

  if (!pageRenderers[route]) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`);
  }

  pageContent.innerHTML = renderPage();
  if (validRoute === "dashboard" && dashboardData) {
    updateDashboardData(dashboardData);
  }
  document.title = `${routeTitles[validRoute][0]} | CareerFit`;
  document.querySelectorAll(".side-nav [data-route]").forEach((link) => {
    if (link.dataset.route === validRoute) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  closeMobileSidebar();
}

window.addEventListener("hashchange", renderRoute);

menuToggle.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("is-open");
  sidebarScrim.classList.toggle("is-visible", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

sidebarScrim.addEventListener("click", closeMobileSidebar);

document.querySelector("[data-logout]").addEventListener("click", (event) => {
  event.preventDefault();

  try {
    window.CareerFitDemoSession.clear();
    window.location.assign("login.html");
  } catch (error) {
    if (!window.CareerFitDemoSession.isStorageError(error)) {
      throw error;
    }

    sessionStatus.textContent = "The demo session could not be cleared because browser storage is unavailable.";
  }
});

document.querySelectorAll(".side-nav").forEach((nav) => {
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMobileSidebar();
    }
  });
});

pageContent.addEventListener("change", (event) => {
  if (event.target.id !== "resume-file") {
    return;
  }

  const file = event.target.files[0];
  const selected = pageContent.querySelector("[data-file-selected]");
  const fileName = pageContent.querySelector("[data-file-name]");
  const error = pageContent.querySelector("[data-file-error]");
  error.textContent = "";
  pageContent.querySelector("[data-resume-status]").textContent = "";

  if (file) {
    fileName.textContent = file.name;
    selected.hidden = false;
  } else {
    selected.hidden = true;
    fileName.textContent = "";
  }
});

pageContent.addEventListener("click", (event) => {
  if (event.target.closest("[data-remove-file]")) {
    const fileInput = pageContent.querySelector("#resume-file");
    fileInput.value = "";
    pageContent.querySelector("[data-file-selected]").hidden = true;
    pageContent.querySelector("[data-file-name]").textContent = "";
    pageContent.querySelector("[data-file-error]").textContent = "";
    pageContent.querySelector("[data-resume-status]").textContent = "";
  }

  if (event.target.closest("[data-edit-profile]")) {
    pageContent.querySelectorAll("#profile-name, #profile-email").forEach((field) => {
      field.disabled = false;
    });
    pageContent.querySelector("[data-edit-profile]").hidden = true;
    pageContent.querySelector("[data-save-profile]").hidden = false;
    pageContent.querySelector("[data-profile-status]").textContent = "Profile changes are not saved until account services are connected.";
    pageContent.querySelector("#profile-name").focus();
  }
});

pageContent.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();

  if (form.matches("[data-resume-form]")) {
    const fileInput = form.querySelector("#resume-file");
    const error = form.querySelector("[data-file-error]");
    const status = form.querySelector("[data-resume-status]");

    if (!fileInput.files.length) {
      error.textContent = "Choose a resume file before continuing.";
      status.textContent = "";
      fileInput.focus();
      return;
    }

    error.textContent = "";
    status.textContent = "Analysis is not connected yet. Your selected file has not been uploaded.";
  }

  if (form.matches("[data-match-form]")) {
    const resume = form.querySelector("#match-resume");
    const jobDescription = form.querySelector("#job-description");
    const resumeError = form.querySelector("[data-match-resume-error]");
    const descriptionError = form.querySelector("[data-job-description-error]");
    const status = form.querySelector("[data-match-status]");

    resumeError.textContent = resume.value ? "" : "No uploaded resumes are available. Upload a resume first.";
    descriptionError.textContent = jobDescription.value.trim() ? "" : "Enter a job description.";
    status.textContent = "";

    if (!resume.value) {
      resume.focus();
    } else if (!jobDescription.value.trim()) {
      jobDescription.focus();
    } else {
      status.textContent = "Job matching is not connected yet. No comparison has been run.";
    }
  }

  if (form.matches("[data-profile-form]")) {
    form.querySelector("[data-profile-status]").textContent = "Profile changes are not saved until account services are connected.";
  }

  if (form.matches("[data-password-form]")) {
    const currentPassword = form.querySelector("#current-password");
    const newPassword = form.querySelector("#new-password");
    const status = form.querySelector("[data-password-status]");

    if (!currentPassword.value || newPassword.value.length < 8) {
      status.textContent = "Enter your current password and a new password with at least 8 characters.";
      status.classList.add("is-error");
    } else {
      status.textContent = "Password updates are not connected. No changes were made.";
      status.classList.remove("is-error");
    }
  }
});

try {
  if (window.CareerFitDemoSession.get()) {
    renderRoute();
  } else {
    window.location.replace("login.html");
  }
} catch (error) {
  if (!window.CareerFitDemoSession.isStorageError(error)) {
    throw error;
  }

  pageContent.textContent = "Browser storage is unavailable. The dashboard demo session cannot be checked.";
}

window.CareerFitDashboard = {
  setDashboardData(data) {
    dashboardData = data;
    updateDashboardData(dashboardData);
  },
  api: window.CareerFitApi
};