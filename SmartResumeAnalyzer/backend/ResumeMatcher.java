import java.util.HashSet;

public class ResumeMatcher {
    public MatchReport compare(Resume resume, Job job) {
        if (resume == null || job == null) {
            throw new IllegalArgumentException("Resume and job are both required for matching.");
        }

        HashSet<String> resumeSkills = resume.getSkills();
        HashSet<String> requiredSkills = job.getRequiredSkills();
        HashSet<String> matchedSkills = new HashSet<>();
        HashSet<String> missingSkills = new HashSet<>();

        for (String requiredSkill : requiredSkills) {
            if (resumeSkills.contains(requiredSkill)) {
                matchedSkills.add(requiredSkill);
            } else {
                missingSkills.add(requiredSkill);
            }
        }

        double percentage = 0.0;
        if (!requiredSkills.isEmpty()) {
            percentage = matchedSkills.size() * 100.0 / requiredSkills.size();
        }

        return new MatchReport(
                resume.getOwnerEmail(),
                resume.getFullName(),
                job.getTitle(),
                percentage,
                matchedSkills,
                missingSkills
        );
    }
}
