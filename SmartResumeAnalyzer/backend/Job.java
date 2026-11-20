import java.util.HashSet;
import java.util.Locale;

public class Job {
    private final String id;
    private String title;
    private String description;
    private final HashSet<String> requiredSkills;

    public Job(String id, String title, String description, HashSet<String> requiredSkills) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Job ID cannot be empty.");
        }
        this.id = id.trim();
        this.requiredSkills = new HashSet<>();
        setTitle(title);
        setDescription(description);
        setRequiredSkills(requiredSkills);
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Job title cannot be empty.");
        }
        this.title = title.trim();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Job description cannot be empty.");
        }
        this.description = description.trim();
    }

    public HashSet<String> getRequiredSkills() {
        return new HashSet<>(requiredSkills);
    }

    public void setRequiredSkills(HashSet<String> skills) {
        if (skills == null || skills.isEmpty()) {
            throw new IllegalArgumentException("A job must have at least one required skill.");
        }
        requiredSkills.clear();
        for (String skill : skills) {
            addRequiredSkill(skill);
        }
    }

    public void addRequiredSkill(String skill) {
        if (skill == null || skill.trim().isEmpty()) {
            throw new IllegalArgumentException("Required skill cannot be empty.");
        }
        requiredSkills.add(skill.trim().toLowerCase(Locale.ROOT));
    }

    @Override
    public String toString() {
        return "ID: " + id + " | " + title + " - " + description;
    }
}
