"use strict";

(function () {
  const api = window.CareerFitApi;
  const resumeStorageKey = "careerFitResumes";
  const matchStorageKey = "careerFitMatchHistory";

  function readCollection(key, label, isValidRecord) {
    const value = window.localStorage.getItem(key);
    if (value == null) {
      return [];
    }

    let records;
    try {
      records = JSON.parse(value);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      throw new Error(`Saved ${label} data is invalid. Remove the corrupted ${label} data from browser storage and try again.`);
    }

    if (!Array.isArray(records) || records.some((record) => !isValidRecord(record))) {
      throw new TypeError(`Saved ${label} data has an invalid format.`);
    }
    return records;
  }

  function readResumes() {
    return readCollection(
      resumeStorageKey,
      "resume",
      (record) => record && typeof record === "object" &&
        record.id != null && typeof record.title === "string" && typeof record.content === "string"
    );
  }

  function readMatches() {
    return readCollection(
      matchStorageKey,
      "match history",
      (record) => record && typeof record === "object" &&
        record.id != null && typeof record.overallMatchPercentage === "number" &&
        Number.isFinite(record.overallMatchPercentage) &&
        record.overallMatchPercentage >= 0 && record.overallMatchPercentage <= 100 &&
        Array.isArray(record.matchedSkills) && Array.isArray(record.missingSkills) &&
        record.results && typeof record.results === "object"
    );
  }

  function writeCollection(key, records) {
    window.localStorage.setItem(key, JSON.stringify(records));
  }

  function createId(prefix) {
    const value = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${value}`;
  }

  function newestFirst(records, dateKey) {
    return records.slice().sort((left, right) =>
      Date.parse(right[dateKey] || "") - Date.parse(left[dateKey] || "")
    );
  }

  function getDashboard() {
    const resumes = newestFirst(readResumes(), "updatedAt");
    const matches = newestFirst(readMatches(), "comparedAt");
    const analyzedResumes = resumes.filter((resume) => Number(resume.analysisCount) > 0);
    const activities = [
      ...resumes.map((resume) => ({
        type: resume.analyzedAt ? "resume_analysis" : "resume_saved",
        title: resume.analyzedAt ? "Resume analyzed" : "Resume saved",
        resumeName: resume.title,
        date: resume.analyzedAt || resume.updatedAt || resume.createdAt
      })),
      ...matches.map((match) => ({
        type: "job_comparison",
        title: "Job comparison",
        resumeName: match.resumeTitle,
        jobTitle: match.jobTitle,
        date: match.comparedAt
      }))
    ].sort((left, right) => Date.parse(right.date || "") - Date.parse(left.date || ""));
    const latestAnalysis = newestFirst(
      resumes.filter((resume) => resume.analyzedAt),
      "analyzedAt"
    )[0];
    const averageMatchScore = matches.length
      ? matches.reduce((total, match) => total + match.overallMatchPercentage, 0) / matches.length
      : null;

    return {
      totalResumes: resumes.length,
      resumesAnalyzed: analyzedResumes.length,
      jobComparisons: matches.length,
      savedResults: matches.length,
      averageMatchScore,
      mostRecentlyAnalyzedResume: latestAnalysis
        ? { name: latestAnalysis.title, analyzedAt: latestAnalysis.analyzedAt }
        : null,
      mostRecentComparison: matches[0] || null,
      recentActivity: activities.slice(0, 6)
    };
  }

  window.CareerFitService = {
    getDashboard() {
      return Promise.resolve().then(getDashboard);
    },
    listResumes() {
      return Promise.resolve().then(() => ({ resumes: newestFirst(readResumes(), "updatedAt") }));
    },
    getResume(id) {
      return Promise.resolve().then(() => {
        const resume = readResumes().find((record) => String(record.id) === String(id));
        return resume ? { resume } : null;
      });
    },
    saveResume(resume) {
      return Promise.resolve().then(() => {
        if (!resume || typeof resume.title !== "string" || !resume.title.trim() ||
            typeof resume.content !== "string" || !resume.content.trim()) {
          throw new TypeError("A resume title and content are required.");
        }

        const resumes = readResumes();
        const existingIndex = resume.id == null
          ? -1
          : resumes.findIndex((record) => String(record.id) === String(resume.id));
        if (resume.id != null && existingIndex < 0) {
          throw new Error("The selected resume no longer exists in browser storage.");
        }

        const previous = existingIndex >= 0 ? resumes[existingIndex] : null;
        const now = new Date().toISOString();
        const saved = {
          id: previous ? previous.id : createId("resume"),
          title: resume.title.trim(),
          content: resume.content,
          createdAt: previous ? previous.createdAt : now,
          updatedAt: now,
          analysisCount: previous && resume.content === previous.content ? previous.analysisCount || 0 : 0,
          analyzedAt: previous && resume.content === previous.content ? previous.analyzedAt || null : null
        };

        if (existingIndex >= 0) {
          resumes[existingIndex] = saved;
        } else {
          resumes.push(saved);
        }
        writeCollection(resumeStorageKey, resumes);
        return saved;
      });
    },
    analyzeResume(resume) {
      return api.request("/api/resumes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resume.title, content: resume.content })
      }).then((result) => {
        if (resume.id != null) {
          const resumes = readResumes();
          const saved = resumes.find((record) => String(record.id) === String(resume.id));
          if (saved && saved.content === resume.content) {
            saved.analysisCount = (Number(saved.analysisCount) || 0) + 1;
            saved.analyzedAt = new Date().toISOString();
            writeCollection(resumeStorageKey, resumes);
          }
        }
        return result;
      });
    },
    deleteResume(id) {
      return Promise.resolve().then(() => {
        const resumes = readResumes();
        const remaining = resumes.filter((record) => String(record.id) !== String(id));
        if (remaining.length === resumes.length) {
          throw new Error("The selected resume no longer exists in browser storage.");
        }
        writeCollection(resumeStorageKey, remaining);
        return null;
      });
    },
    compareJob(comparison) {
      return Promise.resolve().then(() => {
        if (!comparison || comparison.resumeId == null) {
          throw new TypeError("Select a saved resume before comparing.");
        }
        const resume = readResumes().find((record) =>
          String(record.id) === String(comparison.resumeId)
        );
        if (!resume) {
          throw new Error("The selected resume no longer exists in browser storage.");
        }
        return api.request("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId: String(resume.id),
            resumeTitle: resume.title,
            resumeContent: resume.content,
            jobTitle: comparison.jobTitle,
            companyName: comparison.companyName || "",
            jobDescription: comparison.jobDescription
          })
        });
      });
    },
    getMatch(id) {
      return Promise.resolve().then(() => {
        const match = readMatches().find((record) => String(record.id) === String(id));
        return match ? { match } : null;
      });
    },
    listMatches() {
      return Promise.resolve().then(() => ({ matches: newestFirst(readMatches(), "comparedAt") }));
    },
    saveMatchReport(report) {
      return Promise.resolve().then(() => {
        if (!report || report.id == null || !report.results ||
            typeof report.results !== "object" ||
            typeof report.overallMatchPercentage !== "number" ||
            !Number.isFinite(report.overallMatchPercentage) ||
            report.overallMatchPercentage < 0 || report.overallMatchPercentage > 100 ||
            !Array.isArray(report.matchedSkills) || !Array.isArray(report.missingSkills)) {
          throw new TypeError("The comparison response cannot be saved as a report.");
        }

        const matches = readMatches();
        const existingIndex = matches.findIndex((record) => String(record.id) === String(report.id));
        const saved = { ...report, savedAt: new Date().toISOString() };
        if (existingIndex >= 0) {
          matches[existingIndex] = saved;
        } else {
          matches.push(saved);
        }
        writeCollection(matchStorageKey, matches);
        return saved;
      });
    }
  };
})();
