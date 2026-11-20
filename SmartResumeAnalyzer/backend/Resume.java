import java.util.HashSet;
import java.util.Locale;

public class Resume {
    private final String ownerEmail;
    private String fullName;
    private String summary;
    private final HashSet<String> skills;

    public Resume(String ownerEmail, String fullName, String summary) {
        if (ownerEmail == null || ownerEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Resume must belong to a user.");
        }
        this.ownerEmail = ownerEmail.trim().toLowerCase(Locale.ROOT);
        this.skills = new HashSet<>();
        setFullName(fullName);
        setSummary(summary);
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Resume name cannot be empty.");
        }
        this.fullName = fullName.trim();
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        if (summary == null || summary.trim().isEmpty()) {
            throw new IllegalArgumentException("Resume summary cannot be empty.");
        }
        this.summary = summary.trim();
    }

    public HashSet<String> getSkills() {
        return new HashSet<>(skills);
    }

    public void addSkill(String skill) {
        if (skill == null || skill.trim().isEmpty()) {
            throw new IllegalArgumentException("Skill cannot be empty.");
        }
        skills.add(skill.trim().toLowerCase(Locale.ROOT));
    }

    public void addSkills(HashSet<String> newSkills) {
        if (newSkills == null) {
            throw new IllegalArgumentException("Skill list cannot be null.");
        }
        for (String skill : newSkills) {
            addSkill(skill);
        }
    }
}
