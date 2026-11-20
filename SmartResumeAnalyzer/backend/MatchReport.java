import java.time.LocalDateTime;
import java.util.HashSet;

public class MatchReport {
    private final String ownerEmail;
    private final String resumeName;
    private final String jobTitle;
    private final double matchingPercentage;
    private final HashSet<String> matchedSkills;
    private final HashSet<String> missingSkills;
    private final LocalDateTime createdAt;

    public MatchReport(String ownerEmail, String resumeName, String jobTitle, double matchingPercentage,
            HashSet<String> matchedSkills, HashSet<String> missingSkills) {
        if (ownerEmail == null || ownerEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Report must belong to a user.");
        }
        if (resumeName == null || resumeName.trim().isEmpty()) {
            throw new IllegalArgumentException("Resume name cannot be empty.");
        }
        if (jobTitle == null || jobTitle.trim().isEmpty()) {
            throw new IllegalArgumentException("Job title cannot be empty.");
        }
        if (Double.isNaN(matchingPercentage) || matchingPercentage < 0.0 || matchingPercentage > 100.0) {
            throw new IllegalArgumentException("Matching percentage must be between 0 and 100.");
        }
        if (matchedSkills == null || missingSkills == null) {
            throw new IllegalArgumentException("Skill lists cannot be null.");
        }

        this.ownerEmail = ownerEmail.trim().toLowerCase(java.util.Locale.ROOT);
        this.resumeName = resumeName.trim();
        this.jobTitle = jobTitle.trim();
        this.matchingPercentage = matchingPercentage;
        this.matchedSkills = new HashSet<>(matchedSkills);
        this.missingSkills = new HashSet<>(missingSkills);
        this.createdAt = LocalDateTime.now();
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public String getResumeName() {
        return resumeName;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public double getMatchingPercentage() {
        return matchingPercentage;
    }

    public HashSet<String> getMatchedSkills() {
        return new HashSet<>(matchedSkills);
    }

    public HashSet<String> getMissingSkills() {
        return new HashSet<>(missingSkills);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
