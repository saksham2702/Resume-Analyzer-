import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;

public class DataStorage {
    private final HashMap<String, User> users;
    private final HashMap<String, Resume> resumes;
    private final ArrayList<Job> jobs;
    private final HashMap<String, ArrayList<MatchReport>> reports;
    private int nextJobId;

    public DataStorage() {
        users = new HashMap<>();
        resumes = new HashMap<>();
        jobs = new ArrayList<>();
        reports = new HashMap<>();
        nextJobId = 1;
        addSampleJobs();
    }

    public boolean registerUser(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null.");
        }

        String emailKey = normalizeEmail(user.getEmail());
        if (users.containsKey(emailKey)) {
            return false;
        }

        users.put(emailKey, user);
        reports.put(emailKey, new ArrayList<MatchReport>());
        return true;
    }

    public User logIn(String email, String password) {
        if (email == null || password == null) {
            return null;
        }

        User user = users.get(normalizeEmail(email));
        if (user != null && user.passwordMatches(password)) {
            return user;
        }
        return null;
    }

    public void saveResume(Resume resume) {
        if (resume == null) {
            throw new IllegalArgumentException("Resume cannot be null.");
        }

        String emailKey = normalizeEmail(resume.getOwnerEmail());
        if (!users.containsKey(emailKey)) {
            throw new IllegalArgumentException("Register and log in before saving a resume.");
        }
        resumes.put(emailKey, resume);
    }

    public Resume getResume(String email) {
        if (email == null) {
            return null;
        }
        return resumes.get(normalizeEmail(email));
    }

    public Job addJob(String title, String description, HashSet<String> requiredSkills) {
        String id = String.valueOf(nextJobId);
        Job job = new Job(id, title, description, requiredSkills);
        jobs.add(job);
        nextJobId++;
        return job;
    }

    public ArrayList<Job> getJobs() {
        return new ArrayList<>(jobs);
    }

    public Job getJob(String id) {
        if (id == null) {
            return null;
        }
        for (Job job : jobs) {
            if (job.getId().equals(id.trim())) {
                return job;
            }
        }
        return null;
    }

    public void saveReport(MatchReport report) {
        if (report == null) {
            throw new IllegalArgumentException("Report cannot be null.");
        }

        String emailKey = normalizeEmail(report.getOwnerEmail());
        ArrayList<MatchReport> userReports = reports.get(emailKey);
        if (userReports == null) {
            throw new IllegalArgumentException("Report owner must be registered.");
        }
        userReports.add(report);
    }

    public ArrayList<MatchReport> getReports(String email) {
        if (email == null) {
            return new ArrayList<>();
        }

        ArrayList<MatchReport> userReports = reports.get(normalizeEmail(email));
        if (userReports == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(userReports);
    }

    private void addSampleJobs() {
        addJob(
                "Java Developer",
                "Build backend applications and work with databases.",
                new HashSet<>(Arrays.asList("java", "sql", "git", "problem solving"))
        );
        addJob(
                "Web Developer",
                "Create websites and interactive user interfaces.",
                new HashSet<>(Arrays.asList("html", "css", "javascript", "react", "git"))
        );
        addJob(
                "Data Analyst",
                "Analyze data and prepare reports for the business.",
                new HashSet<>(Arrays.asList("python", "sql", "excel", "data analysis"))
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
