-import java.util.Locale;

public class User {
    private String name;
    private final String email;
    private String password;

    public User(String name, String email, String password) {
        setName(name);

        if (email == null || email.trim().isEmpty()
                || !email.contains("@") || email.lastIndexOf('.') < email.indexOf('@') + 2) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }

        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be empty.");
        }
        this.name = name.trim();
    }

    public String getEmail() {
        return email;
    }

    public boolean passwordMatches(String enteredPassword) {
        return password.equals(enteredPassword);
    }

    public void setPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }
        this.password = password;
    }
}
