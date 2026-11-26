# CareerFit

CareerFit is a static HTML/CSS/JavaScript frontend with a Core Java HTTP service. The existing console application remains available separately; the HTTP server uses the same resume-matching classes.

## Run locally

1. Install JDK 11 or newer and ensure `java` and `javac` are on `PATH`.
2. From the `SmartResumeAnalyzer` directory, run `start-careerfit.bat`.
3. Open `http://127.0.0.1:8080/` in your browser. The server serves the frontend and API on the same origin.
4. Use the existing demo sign-in or registration form to open the workspace. These forms remain a frontend-only demo and do not send credentials to Java.
5. Save a resume, then use Resume Analyzer or Job Matcher. Match History reports are saved to browser Local Storage when you choose **Save Report**.
6. Press Ctrl+C in the server window to stop it.

Set `CAREERFIT_PORT` before running the batch file to use another port.

## HTTP API

The server binds to loopback only. It supports:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check server availability |
| `POST` | `/api/resumes/analyze` | Return recognized skills from resume content |
| `POST` | `/api/matches` | Extract resume/job skills and return matched/missing skills and the calculated percentage |

JSON request bodies use string values. The match endpoint receives `resumeId`, `resumeTitle`, `resumeContent`, `jobTitle`, `companyName`, and `jobDescription`. If the frontend is served from another local HTTP port, set `window.CAREERFIT_API_BASE_URL` before `js/api.js` loads; local HTTP origins are permitted by CORS.

## Storage and limitations

Resume details and explicitly saved match reports live in the current browser's Local Storage and remain after refresh. Java does not retain resume text or reports after responding. Browser data is local to that browser/profile and is not synchronized or protected by server authentication. Login and registration remain separate demo-only flows; passwords are not sent to or stored by the Java server.

Skill extraction uses a small built-in vocabulary, so skills outside that list are not included in the comparison. The percentage is calculated from recognized job-description skills only.