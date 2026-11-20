"use strict";

(function () {
  const api = window.CareerFitApi;

  window.CareerFitService = {
    getDashboard() {
      return api.request("/api/dashboard");
    },
    listResumes() {
      return api.request("/api/resumes");
    },
    getResume(id) {
      return api.request(`/api/resumes/${encodeURIComponent(id)}`);
    },
    saveResume(resume) {
      const options = {
        method: resume.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resume.title,
          content: resume.content
        })
      };
      const path = resume.id
        ? `/api/resumes/${encodeURIComponent(resume.id)}`
        : "/api/resumes";
      return api.request(path, options);
    },
    analyzeResume(resume) {
      return api.request("/api/resumes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume)
      });
    },
    deleteResume(id) {
      return api.request(`/api/resumes/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    },
    compareJob(comparison) {
      return api.request("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comparison)
      });
    },
    getMatch(id) {
      return api.request(`/api/matches/${encodeURIComponent(id)}`);
    },
    listMatches() {
      return api.request("/api/matches");
    }
  };
})();
