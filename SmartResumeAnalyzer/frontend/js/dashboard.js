"use strict";

const pageContent = document.querySelector("#page-content");
const sidebar = document.querySelector("#app-sidebar");
const menuToggle = document.querySelector("[data-menu-toggle]");
const sidebarScrim = document.querySelector("[data-sidebar-scrim]");
const sessionStatus = document.querySelector("[data-session-status]");
let dashboardData = null;
let resumeRecords = [];
let resumeDraft = null;
let resumeAnalysis = null;

const routeTitles = {
  dashboard: ["Your Workspace", "Everything you need to understand your resume and explore career opportunities."],
  "resume-analyzer": ["Resume Analyzer", "Write or paste your resume below to review and analyze your professional profile."],
  "job-matcher": ["Job Matcher", "Compare your resume with a job description to understand how closely your profile matches the requirements."],
  "my-resumes": ["My Resumes", "Review and manage the resumes you have saved."],
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

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function collectionFrom(response, key) {
  const records = Array.isArray(response) ? response : response && response[key];
  if (!Array.isArray(records)) {
    throw new TypeError(`The service response must contain a ${key} list.`);
  }
  if (records.some((record) => !record || typeof record !== "object" || record.id == null)) {
    throw new TypeError(`Every item in the ${key} list must include an id.`);
  }
  return records;
}

function editorField(id, label, placeholder, initialValue, errorId) {
  const describedBy = errorId ? `${id}-counter ${errorId}` : `${id}-counter`;
  return `<div class="form-field editor-field">
      <label for="${id}">${label}</label>
      <textarea class="document-editor" id="${id}" name="${id}" placeholder="${escapeHtml(placeholder)}" aria-describedby="${describedBy}">${escapeHtml(initialValue || "")}</textarea>
      <div class="editor-meta" id="${id}-counter" aria-live="polite">
        <span><strong data-word-count="${id}">0</strong> words</span>
        <span><strong data-character-count="${id}">0</strong> characters</span>
      </div>
    </div>`;
}

function updateEditorCount(editor) {
  const text = editor.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wordCount = pageContent.querySelector(`[data-word-count="${editor.id}"]`);
  const characterCount = pageContent.querySelector(`[data-character-count="${editor.id}"]`);
  if (wordCount && characterCount) {
    wordCount.textContent = String(words);
    characterCount.textContent = String(text.length);
  }
}

function resultText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return value == null ? "" : String(value);
}

function showResults(container, result, fields) {
  if (!result || typeof result !== "object") {
    throw new TypeError("The service returned an invalid results response.");
  }
  container.replaceChildren();
  fields.forEach(([label, key]) => {
    if (!(key in result) || result[key] == null) {
      return;
    }
    const tile = document.createElement("article");
    tile.className = "result-tile";
    const heading = document.createElement("h3");
    heading.textContent = label;
    const value = document.createElement("p");
    value.className = "preserve-lines";
    value.textContent = key === "overallMatchPercentage" && typeof result[key] === "number"
      ? `${result[key]}%`
      : resultText(result[key]);
    tile.append(heading, value);
    container.append(tile);
  });
  if (!container.childElementCount) {
    throw new TypeError("The service response did not include any recognized results.");
  }
  container.hidden = false;
}

function displayError(element, error, fallback) {
  element.textContent = `${fallback} ${error && error.message ? error.message : "Please try again later."}`;
  element.classList.add("is-error");
}

function currentRoute() {
  return window.location.hash.slice(1).split("/")[0] || "dashboard";
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
    <p class="form-status" data-dashboard-status role="status" aria-live="polite"></p>
    <div class="dashboard-lower-grid">
      <section class="panel activity-panel" aria-labelledby="recent-activity-title">
        <div class="panel-heading activity-heading">
          <div><p class="panel-kicker">Your recent work</p><h2 id="recent-activity-title">Recent Activity</h2></div>
          <span class="activity-period">Latest updates</span>
        </div>
        <div class="activity-list" data-activity-list>
          <div class="activity-empty"><strong>Loading recent activity...</strong></div>
        </div>
      </section>
      <div class="overview-stack">
        <section class="overview-card resume-overview" aria-labelledby="resume-overview-title">
          <div class="overview-heading">
            <span class="overview-icon" aria-hidden="true">${icon("resume")}</span>
            <div><p class="panel-kicker">Your documents</p><h2 id="resume-overview-title">Resume Overview</h2></div>
          </div>
          <div class="overview-metrics">
            <div><span>Saved</span><strong data-overview="totalResumes">--</strong></div>
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
    resume_saved: ["Resume saved", "resume"],
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
  const draft = resumeDraft || {};
  const resumePlaceholder = `Start writing your resume here...

Include your:

- Contact Information
- Professional Summary
- Education
- Work Experience
- Technical Skills
- Projects
- Certifications
You can write your resume in any structure you prefer.`;
  return `${pageHeading("resume-analyzer")}
    <div class="editor-layout">
      <section class="panel form-panel document-panel" aria-labelledby="resume-editor-title">
        <h2 id="resume-editor-title">${draft.id ? "Edit Resume" : "Your Resume"}</h2>
        <p>Your resume is only sent to the connected service when you choose Save or Analyze.</p>
        <form data-resume-form novalidate>
          <div class="form-field">
            <label for="resume-title">Resume Title</label>
            <input id="resume-title" name="title" type="text" maxlength="120" placeholder="e.g. Java Developer Resume" value="${escapeHtml(draft.title)}" aria-describedby="resume-title-error" required>
            <p class="form-error" id="resume-title-error" data-title-error aria-live="polite"></p>
          </div>
          ${editorField("resume-content", "Resume", resumePlaceholder, draft.content)}
          <div class="form-actions">
            <button class="button" type="button" data-save-resume>Save Resume</button>
            <button class="button" type="button" data-analyze-resume>Analyze Resume</button>
            <button class="button button-secondary" type="button" data-clear-resume>Clear</button>
          </div>
          <p class="form-status" data-resume-status role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="panel results-panel" aria-labelledby="analysis-results-title">
        <div class="panel-heading"><h2 id="analysis-results-title">Analysis Results</h2><p>Only results returned by the analysis service are shown.</p></div>
        <div class="results-grid" data-analysis-results hidden></div>
      </section>
    </div>`;
}

function renderJobMatcher() {
  return `${pageHeading("job-matcher")}
    <div class="editor-layout">
      <section class="panel form-panel document-panel" aria-labelledby="comparison-title">
        <h2 id="comparison-title">Compare your profile</h2>
        <p>Select one of your saved resumes and enter the job details.</p>
        <form data-match-form novalidate>
          <div class="form-field">
            <label for="match-resume">Resume</label>
            <select id="match-resume" name="resume" aria-describedby="match-resume-note">
              <option value="">Loading saved resumes...</option>
            </select>
            <p class="field-note" id="match-resume-note">Choose a saved resume to compare.</p>
            <p class="form-error" data-match-resume-error aria-live="polite"></p>
          </div>
          <div class="form-field">
            <label for="job-title">Job Title</label>
            <input id="job-title" name="jobTitle" type="text" maxlength="160" placeholder="e.g. Software Engineer" required>
          </div>
          <div class="form-field">
            <label for="company-name">Company Name <span class="optional-label">(optional)</span></label>
            <input id="company-name" name="companyName" type="text" maxlength="160" placeholder="e.g. Acme Inc.">
          </div>
          ${editorField("job-description", "Job Description", `Paste or write the complete job description here...

Include:

- Job Responsibilities
- Required Skills
- Qualifications
- Experience Requirements
- Preferred Skills`, "", "job-description-error")}
          <div class="form-error" id="job-description-error" data-job-description-error aria-live="polite"></div>
          <div class="form-actions">
            <button class="button" type="submit">Compare Resume ${icon("arrow")}</button>
          </div>
          <p class="form-status" data-match-status role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="panel results-panel" aria-labelledby="match-results-title">
        <div class="panel-heading"><h2 id="match-results-title">Your Job Match Results</h2><p>Results are based on the comparison service response.</p></div>
        <p class="match-results-empty" data-match-empty role="status" aria-live="polite">Your matching results will appear here after comparison.</p>
        <div class="match-results-content" data-match-results aria-live="polite" hidden></div>
      </section>
    </div>`;
}

function renderMyResumes() {
  return `${pageHeading("my-resumes")}
    <div class="table-toolbar">
      <p>Saved resume text is managed by the connected account service.</p>
      <a class="button" href="#resume-analyzer" data-new-resume>Create Resume ${icon("arrow")}</a>
    </div>
    <p class="form-status" data-resume-list-status role="status" aria-live="polite"></p>
    <section class="panel" aria-label="Saved resumes">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Resume Title</th><th scope="col">Created Date</th><th scope="col">Last Updated</th><th scope="col">Actions</th></tr></thead>
          <tbody data-resume-list><tr class="table-empty"><td colspan="4">Loading saved resumes...</td></tr></tbody>
        </table>
      </div>
    </section>`;
}

function renderMatchHistory() {
  return `${pageHeading("match-history")}
    <section class="panel" aria-label="Job comparison history">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th scope="col">Resume Title</th><th scope="col">Job Title</th><th scope="col">Company</th><th scope="col">Match Percentage</th><th scope="col">Comparison Date</th><th scope="col">View Results</th></tr></thead>
          <tbody data-match-list><tr class="table-empty"><td colspan="6">Loading matching history...</td></tr></tbody>
        </table>
      </div>
    </section>
    <p class="form-status" data-match-list-status role="status" aria-live="polite"></p>`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderResumeRows(records) {
  const body = pageContent.querySelector("[data-resume-list]");
  if (!body) {
    return;
  }
  body.replaceChildren();
  if (!records.length) {
    const row = body.insertRow();
    row.className = "table-empty";
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = "No saved resumes yet.";
    return;
  }
  records.forEach((resume) => {
    const row = body.insertRow();
    const title = row.insertCell();
    title.textContent = resume.title || "Untitled Resume";
    row.insertCell().textContent = formatDate(resume.createdAt || resume.createdDate);
    row.insertCell().textContent = formatDate(resume.updatedAt || resume.lastUpdated);
    const actions = row.insertCell();
    actions.className = "table-actions";
    ["View", "Edit", "Analyze", "Delete"].forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = label === "Delete" ? "table-action is-danger" : "table-action";
      button.textContent = label;
      button.dataset.resumeAction = label.toLowerCase();
      button.dataset.resumeId = resume.id;
      actions.append(button);
    });
  });
}

function renderMatchRows(records) {
  const body = pageContent.querySelector("[data-match-list]");
  if (!body) {
    return;
  }
  body.replaceChildren();
  if (!records.length) {
    const row = body.insertRow();
    row.className = "table-empty";
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = "No matching history available.";
    return;
  }
  records.forEach((match) => {
    const row = body.insertRow();
    row.insertCell().textContent = match.resumeTitle || match.resumeName || "—";
    row.insertCell().textContent = match.jobTitle || "—";
    row.insertCell().textContent = match.companyName || match.company || "—";
    row.insertCell().textContent = typeof match.overallMatchPercentage === "number"
      ? `${match.overallMatchPercentage}%`
      : "—";
    row.insertCell().textContent = formatDate(match.comparedAt || match.comparisonDate);
    const action = row.insertCell();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-action";
    button.textContent = "View Results";
    button.dataset.matchAction = "view";
    button.dataset.matchId = match.id;
    action.append(button);
  });
}

async function loadRouteData(route) {
  try {
    if (route === "dashboard") {
      dashboardData = await window.CareerFitService.getDashboard();
      if (currentRoute() === route) {
        updateDashboardData(dashboardData);
      }
    } else if (route === "job-matcher" || route === "my-resumes") {
      resumeRecords = collectionFrom(await window.CareerFitService.listResumes(), "resumes");
      if (currentRoute() !== route) {
        return;
      }
      if (route === "job-matcher") {
        const select = pageContent.querySelector("#match-resume");
        select.replaceChildren(new Option("Select a saved resume", ""));
        resumeRecords.forEach((resume) => {
          select.add(new Option(resume.title || "Untitled Resume", resume.id));
        });
        if (!resumeRecords.length) {
          select.options[0].textContent = "No saved resumes available. Create your resume first.";
          const note = pageContent.querySelector("#match-resume-note");
          note.innerHTML = 'No saved resumes available. <a href="#resume-analyzer" data-new-resume>Create your resume first.</a>';
        }
      } else {
        renderResumeRows(resumeRecords);
      }
    } else if (route === "match-history") {
      const matches = collectionFrom(await window.CareerFitService.listMatches(), "matches");
      if (currentRoute() === route) {
        renderMatchRows(matches);
      }
    }
  } catch (error) {
    if (currentRoute() !== route) {
      return;
    }
    const status = pageContent.querySelector(
      "[data-dashboard-status], [data-resume-list-status], [data-match-list-status]"
    );
    if (status) {
      displayError(status, error, "Could not load account data.");
    }
    if (route === "dashboard") {
      const activity = pageContent.querySelector("[data-activity-list]");
      if (activity) {
        activity.replaceChildren();
        const empty = document.createElement("div");
        empty.className = "activity-empty";
        const message = document.createElement("strong");
        message.textContent = "Recent activity could not be loaded.";
        empty.append(message);
        activity.append(empty);
      }
    }
    if (route === "job-matcher") {
      const select = pageContent.querySelector("#match-resume");
      if (select) {
        select.replaceChildren(new Option("No saved resumes available. Create your resume first.", ""));
        pageContent.querySelector("#match-resume-note").innerHTML =
          'No saved resumes available. <a href="#resume-analyzer" data-new-resume>Create your resume first.</a>';
      }
    }
    if (route === "my-resumes") {
      const body = pageContent.querySelector("[data-resume-list]");
      if (body) {
        body.replaceChildren();
        const row = body.insertRow();
        row.className = "table-empty";
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = "Saved resumes could not be loaded.";
      }
    }
    if (route === "match-history") {
      const body = pageContent.querySelector("[data-match-list]");
      if (body) {
        body.replaceChildren();
        const row = body.insertRow();
        row.className = "table-empty";
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.textContent = "Matching history could not be loaded.";
      }
    }
  }
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
  const route = currentRoute();
  const renderPage = pageRenderers[route] || renderDashboard;
  const validRoute = pageRenderers[route] ? route : "dashboard";

  if (!pageRenderers[route]) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#dashboard`);
  }

  pageContent.innerHTML = renderPage();
  if (validRoute === "dashboard" && dashboardData) {
    updateDashboardData(dashboardData);
  }
  if (validRoute === "resume-analyzer") {
    resumeAnalysis = null;
    if (resumeDraft && resumeDraft.analysis) {
      resumeAnalysis = resumeDraft.analysis;
      delete resumeDraft.analysis;
    }
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
  if (validRoute === "resume-analyzer" && resumeAnalysis) {
    showResults(pageContent.querySelector("[data-analysis-results]"), resumeAnalysis.results || resumeAnalysis, [
      ["Extracted Skills", "extractedSkills"],
      ["Education Details", "educationDetails"],
      ["Experience Details", "experienceDetails"],
      ["Professional Summary Feedback", "professionalSummaryFeedback"],
      ["Areas for Improvement", "areasForImprovement"]
    ]);
  }
  if (validRoute === "my-resumes" || validRoute === "match-history") {
    pageContent.insertAdjacentHTML("beforeend", `<dialog class="document-dialog" data-result-dialog>
      <div class="document-dialog-heading"><h2 data-dialog-title></h2><button class="table-action" type="button" data-close-dialog>Close</button></div>
      <pre data-dialog-content class="preserve-lines"></pre>
    </dialog>`);
  }
  loadRouteData(validRoute);
  pageContent.querySelectorAll(".document-editor").forEach(updateEditorCount);
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

pageContent.addEventListener("input", (event) => {
  if (event.target.matches(".document-editor")) {
    updateEditorCount(event.target);
  }
});

pageContent.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-resume]");
  const analyzeButton = event.target.closest("[data-analyze-resume]");
  const clearButton = event.target.closest("[data-clear-resume]");
  if (saveButton || analyzeButton) {
    submitResume(saveButton ? "save" : "analyze");
  }
  if (clearButton) {
    if (window.confirm("Clear the resume text in this editor? This cannot be undone.")) {
      const editor = pageContent.querySelector("#resume-content");
      editor.value = "";
      updateEditorCount(editor);
      pageContent.querySelector("[data-resume-status]").textContent = "";
      pageContent.querySelector("[data-analysis-results]").replaceChildren();
      pageContent.querySelector("[data-analysis-results]").hidden = true;
    }
  }
  const resumeAction = event.target.closest("[data-resume-action]");
  if (resumeAction) {
    handleResumeAction(resumeAction.dataset.resumeAction, resumeAction.dataset.resumeId);
  }
  const matchAction = event.target.closest("[data-match-action]");
  if (matchAction) {
    handleMatchAction(matchAction.dataset.matchId);
  }
  if (event.target.closest("[data-save-match-report]")) {
    pageContent.querySelector("[data-match-action-status]").textContent =
      "Report saving is not available until a report service is connected. No report was saved.";
  }
  if (event.target.closest("[data-compare-another]")) {
    const form = pageContent.querySelector("[data-match-form]");
    form.querySelector("#job-title").value = "";
    form.querySelector("#company-name").value = "";
    form.querySelector("#job-description").value = "";
    updateEditorCount(form.querySelector("#job-description"));
    form.querySelector("[data-match-status]").textContent = "";
    form.querySelector("[data-match-status]").classList.remove("is-error");
    pageContent.querySelector("[data-match-results]").hidden = true;
    pageContent.querySelector("[data-match-empty]").hidden = false;
    pageContent.querySelector("[data-match-empty]").textContent =
      "Your matching results will appear here after comparison.";
    pageContent.querySelector("[data-match-action-status]").textContent = "";
    form.querySelector("#job-title").focus();
  }
  if (event.target.closest("[data-close-dialog]")) {
    pageContent.querySelector("[data-result-dialog]").close();
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

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-new-resume]")) {
    resumeDraft = null;
  }
});

async function handleResumeAction(action, id) {
  const status = pageContent.querySelector("[data-resume-list-status]");
  try {
    if (action === "delete") {
      if (!window.confirm("Delete this saved resume?")) {
        return;
      }
      await window.CareerFitService.deleteResume(id);
      status.textContent = "Resume deleted.";
      await loadRouteData("my-resumes");
      return;
    }
    const response = await window.CareerFitService.getResume(id);
    const resume = response && response.resume ? response.resume : response;
    if (!resume || typeof resume !== "object") {
      throw new TypeError("The service returned an invalid resume.");
    }
    if (action === "view") {
      const dialog = pageContent.querySelector("[data-result-dialog]");
      dialog.querySelector("[data-dialog-title]").textContent = resume.title || "Resume";
      dialog.querySelector("[data-dialog-content]").textContent = resume.content || "";
      dialog.showModal();
    } else if (action === "edit") {
      resumeDraft = resume;
      window.location.hash = "resume-analyzer";
    } else if (action === "analyze") {
      if (typeof resume.content !== "string" || !resume.content.trim()) {
        throw new TypeError("The saved resume has no readable text to analyze.");
      }
      const result = await window.CareerFitService.analyzeResume({
        id: resume.id,
        title: resume.title,
        content: resume.content
      });
      resumeDraft = { ...resume, analysis: result };
      window.location.hash = "resume-analyzer";
    }
  } catch (error) {
    displayError(status, error, "Could not complete the resume action.");
  }
}

async function handleMatchAction(id) {
  const status = pageContent.querySelector("[data-match-list-status]");
  try {
    const response = await window.CareerFitService.getMatch(id);
    const match = response && response.match ? response.match : response;
    if (!match || typeof match !== "object") {
      throw new TypeError("The service returned invalid comparison results.");
    }
    const dialog = pageContent.querySelector("[data-result-dialog]");
    dialog.querySelector("[data-dialog-title]").textContent =
      `${match.jobTitle || "Job comparison"} — ${match.resumeTitle || match.resumeName || "Resume"}`;
    dialog.querySelector("[data-dialog-content]").textContent = resultText(match.results || match);
    dialog.showModal();
  } catch (error) {
    displayError(status, error, "Could not load comparison results.");
  }
}

pageContent.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();

  if (form.matches("[data-match-form]")) {
    submitMatch(form);
    return;
  }

  if (form.matches("[data-resume-form]")) {
    submitResume("save");
    return;
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

async function submitResume(action) {
  const title = pageContent.querySelector("#resume-title");
  const editor = pageContent.querySelector("#resume-content");
  const error = pageContent.querySelector("[data-title-error]");
  const status = pageContent.querySelector("[data-resume-status]");
  const resultContainer = pageContent.querySelector("[data-analysis-results]");
  const trimmedTitle = title.value.trim();
  const content = editor.value;
  error.textContent = "";
  status.textContent = "";
  status.classList.remove("is-error");
  resultContainer.replaceChildren();
  resultContainer.hidden = true;

  if (!trimmedTitle || !content.trim()) {
    error.textContent = !trimmedTitle ? "Enter a title for your resume." : "";
    status.textContent = content.trim() ? "" : "Enter your resume text before continuing.";
    (!trimmedTitle ? title : editor).focus();
    return;
  }

  const payload = { title: trimmedTitle, content };
  if (resumeDraft && resumeDraft.id) {
    payload.id = resumeDraft.id;
  }
  const buttons = pageContent.querySelectorAll("[data-save-resume], [data-analyze-resume]");
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = action === "save" ? "Saving resume..." : "Sending resume for analysis...";
  try {
    if (action === "save") {
      const saved = await window.CareerFitService.saveResume(payload);
      if (!saved || typeof saved !== "object" || saved.id == null) {
        throw new TypeError("The save service did not return a saved resume.");
      }
      resumeDraft = { ...payload, ...saved };
      status.textContent = "Resume saved.";
    } else {
      const result = await window.CareerFitService.analyzeResume(payload);
      showResults(resultContainer, result && result.results ? result.results : result, [
        ["Extracted Skills", "extractedSkills"],
        ["Education Details", "educationDetails"],
        ["Experience Details", "experienceDetails"],
        ["Professional Summary Feedback", "professionalSummaryFeedback"],
        ["Areas for Improvement", "areasForImprovement"]
      ]);
      status.textContent = "Analysis received.";
    }
  } catch (serviceError) {
    displayError(status, serviceError, action === "save" ? "Resume was not saved." : "Analysis was not completed.");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function submitMatch(form) {
    const resume = form.querySelector("#match-resume");
    const jobDescription = form.querySelector("#job-description");
    const jobTitle = form.querySelector("#job-title");
    const resumeError = form.querySelector("[data-match-resume-error]");
    const descriptionError = form.querySelector("[data-job-description-error]");
    const status = form.querySelector("[data-match-status]");
    const resultContainer = pageContent.querySelector("[data-match-results]");
    const emptyState = pageContent.querySelector("[data-match-empty]");
    resumeError.textContent = resume.value ? "" : "Select a saved resume first.";
    descriptionError.textContent = jobDescription.value.trim() ? "" : "Enter a job description.";
    status.classList.remove("is-error");
    status.textContent = "";
    resultContainer.replaceChildren();
    resultContainer.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "Your matching results will appear here after comparison.";

    if (!resume.value) {
      resume.focus();
    } else if (!jobDescription.value.trim()) {
      jobDescription.focus();
    } else if (!jobTitle.value.trim()) {
      jobTitle.focus();
      status.textContent = "Enter a job title.";
    } else {
      const selectedResume = resumeRecords.find((record) => String(record.id) === resume.value);
      if (!selectedResume) {
        status.textContent = "The selected resume is no longer available. Reload your saved resumes and try again.";
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      emptyState.textContent = "Analyzing your resume against the job requirements...";
      try {
        const result = await window.CareerFitService.compareJob({
          resumeId: selectedResume.id,
          jobTitle: jobTitle.value.trim(),
          companyName: form.querySelector("#company-name").value.trim(),
          jobDescription: jobDescription.value
        });
        renderMatchingResults(resultContainer, result && result.results ? result.results : result);
        resultContainer.hidden = false;
        emptyState.hidden = true;
        status.textContent = "Comparison results received.";
      } catch (error) {
        emptyState.textContent = "Your matching results will appear here after comparison.";
        displayError(status, error, "Comparison was not completed.");
      } finally {
        button.disabled = false;
      }
    }
}

function normalizeMatchSkills(value, fieldName) {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`The service response must contain ${fieldName} as a list.`);
  }
  return value.map((skill) => {
    const name = typeof skill === "string"
      ? skill
      : skill && typeof skill === "object"
        ? skill.name || skill.skillName || skill.skill || skill.label
        : "";
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError(`The service returned an invalid item in ${fieldName}.`);
    }
    return name.trim();
  });
}

function matchResultCount(value, fieldName) {
  if (value == null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`The service returned an invalid ${fieldName} count.`);
  }
  return value;
}

function renderMatchSkillList(container, skills, emptyMessage, statusClass) {
  if (!skills || !skills.length) {
    const empty = document.createElement("p");
    empty.className = "match-skill-empty";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = `match-skill-list ${statusClass}`;
  skills.forEach((skill) => {
    const item = document.createElement("li");
    item.textContent = skill;
    list.append(item);
  });
  container.append(list);
}

function renderMatchingResults(container, result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new TypeError("The service returned invalid comparison results.");
  }

  const matchedSkills = normalizeMatchSkills(result.matchedSkills, "matched skills");
  const missingSkills = normalizeMatchSkills(result.missingSkills, "missing skills");
  const overallMatchPercentage = result.overallMatchPercentage;
  if (overallMatchPercentage != null &&
      (typeof overallMatchPercentage !== "number" ||
        !Number.isFinite(overallMatchPercentage) ||
        overallMatchPercentage < 0 ||
        overallMatchPercentage > 100)) {
    throw new TypeError("The service returned an invalid overall match percentage.");
  }

  const totalRequiredSkills = matchResultCount(result.totalRequiredSkills, "required skills") ??
    (matchedSkills && missingSkills ? matchedSkills.length + missingSkills.length : null);
  const matchedSkillCount = matchedSkills
    ? matchedSkills.length
    : matchResultCount(result.matchedSkillsCount, "matched skills");
  const missingSkillCount = missingSkills
    ? missingSkills.length
    : matchResultCount(result.missingSkillsCount, "missing skills");
  const noSkillsIdentified = totalRequiredSkills === 0 ||
    (matchedSkills && missingSkills && matchedSkills.length === 0 && missingSkills.length === 0);

  container.replaceChildren();

  const scoreSection = document.createElement("section");
  scoreSection.className = "match-score-card";
  scoreSection.setAttribute("aria-labelledby", "overall-match-title");
  const scoreHeader = document.createElement("div");
  scoreHeader.className = "match-score-header";
  const scoreTitle = document.createElement("h3");
  scoreTitle.id = "overall-match-title";
  scoreTitle.textContent = "Overall Match Percentage";
  const scoreValue = document.createElement("strong");
  scoreValue.className = "match-score-value";
  scoreValue.textContent = overallMatchPercentage == null ? "—" : `${overallMatchPercentage}%`;
  scoreHeader.append(scoreTitle, scoreValue);
  scoreSection.append(scoreHeader);

  const scoreTrack = document.createElement("div");
  scoreTrack.className = "match-score-track";
  scoreTrack.setAttribute("aria-hidden", "true");
  const scoreFill = document.createElement("span");
  scoreFill.className = "match-score-fill";
  if (overallMatchPercentage != null) {
    scoreFill.style.width = `${overallMatchPercentage}%`;
    scoreTrack.setAttribute("role", "progressbar");
    scoreTrack.setAttribute("aria-label", "Overall match percentage");
    scoreTrack.setAttribute("aria-valuemin", "0");
    scoreTrack.setAttribute("aria-valuemax", "100");
    scoreTrack.setAttribute("aria-valuenow", String(overallMatchPercentage));
    scoreTrack.setAttribute("aria-valuetext", `${overallMatchPercentage}%`);
    scoreTrack.removeAttribute("aria-hidden");
  }
  scoreTrack.append(scoreFill);
  scoreSection.append(scoreTrack);

  const metrics = document.createElement("dl");
  metrics.className = "match-metrics";
  [
    ["Total Required Skills", totalRequiredSkills],
    ["Matched Skills", matchedSkillCount],
    ["Missing Skills", missingSkillCount]
  ].forEach(([label, count]) => {
    const metric = document.createElement("div");
    const metricLabel = document.createElement("dt");
    const metricValue = document.createElement("dd");
    metricLabel.textContent = label;
    metricValue.textContent = count == null ? "—" : String(count);
    metric.append(metricLabel, metricValue);
    metrics.append(metric);
  });
  scoreSection.append(metrics);
  container.append(scoreSection);

  if (noSkillsIdentified) {
    const noSkills = document.createElement("p");
    noSkills.className = "match-no-skills";
    noSkills.textContent = "No required skills were identified in this job description.";
    container.append(noSkills);
  }

  const skillsGrid = document.createElement("div");
  skillsGrid.className = "match-skills-grid";
  [
    ["Matched Skills", matchedSkills, "No matching skills available.", "is-matched"],
    ["Skills to Improve", missingSkills, "No missing skills identified.", "is-missing"]
  ].forEach(([heading, skills, emptyMessage, statusClass]) => {
    const section = document.createElement("section");
    section.className = `match-skill-card ${statusClass}`;
    const title = document.createElement("h3");
    title.textContent = heading;
    section.append(title);
    if (heading === "Skills to Improve") {
      const description = document.createElement("p");
      description.className = "match-skill-description";
      description.textContent =
        "These job requirements were not identified in your entered resume.";
      section.append(description);
    }
    renderMatchSkillList(section, skills, emptyMessage, statusClass);
    skillsGrid.append(section);
  });
  container.append(skillsGrid);

  const comparisonSection = document.createElement("section");
  comparisonSection.className = "match-table-section";
  const comparisonTitle = document.createElement("h3");
  comparisonTitle.textContent = "Skills Comparison";
  comparisonSection.append(comparisonTitle);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.className = "data-table match-comparison-table";
  table.innerHTML = "<thead><tr><th scope=\"col\">Skill</th><th scope=\"col\">Match Status</th></tr></thead>";
  const tableBody = document.createElement("tbody");
  const skillRows = [
    ...(matchedSkills || []).map((skill) => [skill, "Matched", "is-matched"]),
    ...(missingSkills || []).map((skill) => [skill, "Missing", "is-missing"])
  ];
  if (!skillRows.length) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 2;
    cell.textContent = noSkillsIdentified
      ? "No required skills were identified in this job description."
      : "No skill comparison data is available.";
  } else {
    skillRows.forEach(([skill, statusLabel, statusClass]) => {
      const row = tableBody.insertRow();
      row.insertCell().textContent = skill;
      const status = row.insertCell();
      status.className = `match-status-label ${statusClass}`;
      status.textContent = statusLabel;
    });
  }
  table.append(tableBody);
  tableWrap.append(table);
  comparisonSection.append(tableWrap);
  container.append(comparisonSection);

  const focusSection = document.createElement("section");
  focusSection.className = "match-focus-section";
  const focusTitle = document.createElement("h3");
  focusTitle.textContent = "Areas to Focus On";
  focusSection.append(focusTitle);
  if (missingSkills && missingSkills.length) {
    const focusList = document.createElement("ul");
    focusList.className = "match-focus-list";
    missingSkills.forEach((skill) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      const description = document.createElement("span");
      name.textContent = skill;
      description.textContent = "Review your experience for examples related to this requirement.";
      item.append(name, description);
      focusList.append(item);
    });
    focusSection.append(focusList);
  } else {
    const empty = document.createElement("p");
    empty.className = "match-skill-empty";
    empty.textContent = "No missing skills identified.";
    focusSection.append(empty);
  }
  container.append(focusSection);

  const actions = document.createElement("div");
  actions.className = "match-result-actions";
  actions.innerHTML = '<button class="button" type="button" data-save-match-report>Save Report</button>' +
    '<a class="button button-secondary" href="#match-history">View Match History</a>' +
    '<button class="button button-secondary" type="button" data-compare-another>Compare Another Job</button>';
  const actionStatus = document.createElement("p");
  actionStatus.className = "form-status match-action-status";
  actionStatus.dataset.matchActionStatus = "";
  actionStatus.setAttribute("role", "status");
  actionStatus.setAttribute("aria-live", "polite");
  container.append(actions, actionStatus);
}

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