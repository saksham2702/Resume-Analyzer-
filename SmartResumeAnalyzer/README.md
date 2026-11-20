# CareerFit frontend

The frontend is a static HTML/CSS/JavaScript application. The authenticated workspace uses hash routes in `frontend/dashboard.html` (for example, `dashboard.html#resume-analyzer` and `dashboard.html#job-matcher`); it is not a React application.

Resume and job-description text is entered manually. The browser does not save resume contents to local or session storage. Save, analysis, comparison, and account data require a backend and are not simulated when the service is unavailable.

## Backend integration

Set `window.CAREERFIT_API_BASE_URL` before loading `frontend/js/api.js`. The service layer in `frontend/js/services/careerfit.js` expects these JSON REST endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Account statistics and recent activity |
| `GET` | `/api/resumes` | List saved resumes |
| `GET` | `/api/resumes/{id}` | Read a saved resume |
| `POST` / `PUT` | `/api/resumes` or `/api/resumes/{id}` | Save or update plain-text resume content |
| `DELETE` | `/api/resumes/{id}` | Delete a saved resume |
| `POST` | `/api/resumes/analyze` | Analyze resume text |
| `GET` | `/api/matches` | List saved comparisons |
| `GET` | `/api/matches/{id}` | Read a saved comparison |
| `POST` | `/api/matches` | Compare a saved resume with job-description text |

Collection responses should be arrays or objects containing a `resumes` or `matches` array. Analysis and comparison responses supply the result fields consumed by the corresponding results view. Results are displayed only when returned by the service.