import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        DataStorage dataStorage = new DataStorage();

        System.out.println("Smart Resume Analyzer and Job Matcher");
        runMainMenu(scanner, dataStorage);

        scanner.close();
        System.out.println("Goodbye!");
    }

    private static void runMainMenu(Scanner scanner, DataStorage dataStorage) {
        boolean running = true;

        while (running) {
            System.out.println("\nMain Menu");
            System.out.println("1. Register");
            System.out.println("2. Log in");
            System.out.println("0. Exit");
            System.out.print("Choose an option: ");
            String choice = scanner.nextLine().trim();

            switch (choice) {
                case "1":
                    register(scanner, dataStorage);
                    break;
                case "2":
                    User user = logIn(scanner, dataStorage);
                    if (user != null) {
                        runUserMenu(scanner, dataStorage, user);
                    }
                    break;
                case "0":
                    running = false;
                    break;
                default:
                    System.out.println("Please choose 1, 2, or 0.");
            }
        }
    }

    private static void register(Scanner scanner, DataStorage dataStorage) {
        System.out.println("\nCreate an account");
        String name = readRequiredLine(scanner, "Name: ");
        String email = readRequiredLine(scanner, "Email: ");
        String password = readRequiredLine(scanner, "Password: ");

        try {
            User newUser = new User(name, email, password);
            if (dataStorage.registerUser(newUser)) {
                System.out.println("Registration successful. You can now log in.");
            } else {
                System.out.println("An account with that email already exists.");
            }
        } catch (IllegalArgumentException exception) {
            System.out.println("Could not register: " + exception.getMessage());
        }
    }

    private static User logIn(Scanner scanner, DataStorage dataStorage) {
        System.out.println("\nLog in");
        String email = readRequiredLine(scanner, "Email: ");
        String password = readRequiredLine(scanner, "Password: ");

        User user = dataStorage.logIn(email, password);
        if (user == null) {
            System.out.println("Email or password is incorrect.");
        } else {
            System.out.println("Welcome, " + user.getName() + "!");
        }
        return user;
    }

    private static void runUserMenu(Scanner scanner, DataStorage dataStorage, User user) {
        boolean loggedIn = true;

        while (loggedIn) {
            System.out.println("\nUser Menu");
            System.out.println("1. Add or update resume details");
            System.out.println("2. Add resume skills");
            System.out.println("3. Add a job");
            System.out.println("4. Display available jobs");
            System.out.println("5. Match resume with a job");
            System.out.println("6. View previous reports");
            System.out.println("0. Log out");
            System.out.print("Choose an option: ");
            String choice = scanner.nextLine().trim();

            switch (choice) {
                case "1":
                    addOrUpdateResume(scanner, dataStorage, user);
                    break;
                case "2":
                    addResumeSkills(scanner, dataStorage, user);
                    break;
                case "3":
                    addJob(scanner, dataStorage);
                    break;
                case "4":
                    displayJobs(dataStorage);
                    break;
                case "5":
                    matchResume(scanner, dataStorage, user);
                    break;
                case "6":
                    displayPreviousReports(dataStorage, user);
                    break;
                case "0":
                    loggedIn = false;
                    System.out.println("You have logged out.");
                    break;
                default:
                    System.out.println("Please choose a number from the menu.");
            }
        }
    }

    private static void addOrUpdateResume(Scanner scanner, DataStorage dataStorage, User user) {
        Resume resume = dataStorage.getResume(user.getEmail());

        System.out.println("\nAdd or update resume details");
        String fullName = readRequiredLine(scanner, "Resume name: ");
        String summary = readRequiredLine(scanner, "Resume summary: ");

        try {
            if (resume == null) {
                resume = new Resume(user.getEmail(), fullName, summary);
            } else {
                resume.setFullName(fullName);
                resume.setSummary(summary);
            }
            dataStorage.saveResume(resume);
            System.out.println("Resume details saved.");
        } catch (IllegalArgumentException exception) {
            System.out.println("Could not save resume: " + exception.getMessage());
        }
    }

    private static void addResumeSkills(Scanner scanner, DataStorage dataStorage, User user) {
        Resume resume = dataStorage.getResume(user.getEmail());
        if (resume == null) {
            System.out.println("Add your resume details before adding skills.");
            return;
        }

        HashSet<String> skills = readSkills(scanner, "Enter skills separated by commas: ");
        resume.addSkills(skills);
        dataStorage.saveResume(resume);
        System.out.println("Resume skills saved: " + resume.getSkills());
    }

    private static void addJob(Scanner scanner, DataStorage dataStorage) {
        System.out.println("\nAdd a job");
        String title = readRequiredLine(scanner, "Job title: ");
        String description = readRequiredLine(scanner, "Job description: ");
        HashSet<String> requiredSkills = readSkills(scanner, "Enter required skills separated by commas: ");

        try {
            Job job = dataStorage.addJob(title, description, requiredSkills);
            System.out.println("Job added with ID " + job.getId() + ".");
        } catch (IllegalArgumentException exception) {
            System.out.println("Could not add job: " + exception.getMessage());
        }
    }

    private static void displayJobs(DataStorage dataStorage) {
        ArrayList<Job> jobs = dataStorage.getJobs();
        System.out.println("\nAvailable Jobs");
        for (Job job : jobs) {
            System.out.println(job);
            System.out.println("Required skills: " + job.getRequiredSkills());
            System.out.println();
        }
    }

    private static void matchResume(Scanner scanner, DataStorage dataStorage, User user) {
        Resume resume = dataStorage.getResume(user.getEmail());
        if (resume == null) {
            System.out.println("Add your resume before starting a match.");
            return;
        }
        if (resume.getSkills().isEmpty()) {
            System.out.println("Add skills to your resume before starting a match.");
            return;
        }

        displayJobs(dataStorage);
        String jobId = readRequiredLine(scanner, "Enter the ID of the job to match: ");
        Job job = dataStorage.getJob(jobId);
        if (job == null) {
            System.out.println("No job was found with that ID.");
            return;
        }

        ResumeMatcher matcher = new ResumeMatcher();
        MatchReport report = matcher.compare(resume, job);
        dataStorage.saveReport(report);
        displayReport(report);
        System.out.println("This report has been saved for this session.");
    }

    private static void displayPreviousReports(DataStorage dataStorage, User user) {
        ArrayList<MatchReport> reports = dataStorage.getReports(user.getEmail());
        if (reports.isEmpty()) {
            System.out.println("You do not have any matching reports yet.");
            return;
        }

        System.out.println("\nPrevious Matching Reports");
        for (int index = 0; index < reports.size(); index++) {
            System.out.println("\nReport " + (index + 1));
            displayReport(reports.get(index));
        }
    }

    private static void displayReport(MatchReport report) {
        System.out.println("Job: " + report.getJobTitle());
        System.out.println("Resume: " + report.getResumeName());
        System.out.printf(Locale.ROOT, "Matching percentage: %.2f%%%n", report.getMatchingPercentage());
        System.out.println("Matched skills: " + report.getMatchedSkills());
        System.out.println("Missing skills: " + report.getMissingSkills());
        System.out.println("Created: " + report.getCreatedAt());
    }

    private static String readRequiredLine(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String value = scanner.nextLine().trim();
            if (!value.isEmpty()) {
                return value;
            }
            System.out.println("This value cannot be empty.");
        }
    }

    private static HashSet<String> readSkills(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String input = scanner.nextLine();
            HashSet<String> skills = parseSkills(input);
            if (!skills.isEmpty()) {
                return skills;
            }
            System.out.println("Enter at least one skill.");
        }
    }

    private static HashSet<String> parseSkills(String input) {
        HashSet<String> skills = new HashSet<>();
        String[] parts = input.split(",");

        for (String part : parts) {
            String skill = part.trim().toLowerCase(Locale.ROOT);
            if (!skill.isEmpty()) {
                skills.add(skill);
            }
        }
        return skills;
    }
}
