import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

public final class CareerFitHttpServer {
    private static final int DEFAULT_PORT = 8080;
    private static final int MAX_REQUEST_BYTES = 1_000_000;
    private static final String[] SKILL_NAMES = {
        "Agile", "AWS", "Azure", "Bash", "C#", "C++", "CSS", "Communication",
        "Cybersecurity", "Data Analysis", "Data Analytics", "Docker", "Excel",
        "Express", "Figma", "Git", "GitHub", "GCP", "HTML", "Java", "JavaScript",
        "Kubernetes", "Linux", "Machine Learning", "MongoDB", "MySQL", "Networking",
        "Node.js", "PostgreSQL", "Problem Solving", "Project Management", "Python",
        "React", "REST API", "Spring Boot", "SQL", "TensorFlow", "Testing",
        "TypeScript", "UI/UX"
    };
    private static final Map<String, Pattern> SKILL_PATTERNS = createSkillPatterns();
    private static final ResumeMatcher RESUME_MATCHER = new ResumeMatcher();
    private static Path frontendRoot;

    private CareerFitHttpServer() {
    }

    public static void main(String[] args) throws IOException {
        frontendRoot = findFrontendRoot();
        int port = configuredPort();
        HttpServer server = HttpServer.create(
            new InetSocketAddress(InetAddress.getByName("127.0.0.1"), port),
            0
        );
        server.createContext("/api/", CareerFitHttpServer::handleApi);
        server.createContext("/", CareerFitHttpServer::handleStaticFile);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0), "careerfit-http-shutdown"));
        server.start();
        System.out.println("CareerFit server ready at http://127.0.0.1:" + port + "/");
        System.out.println("Serving frontend from " + frontendRoot);
        System.out.println("Press Ctrl+C to stop the server.");
    }

    private static int configuredPort() {
        String value = System.getenv("CAREERFIT_PORT");
        if (value == null || value.trim().isEmpty()) {
            return DEFAULT_PORT;
        }
        try {
            int port = Integer.parseInt(value.trim());
            if (port < 1 || port > 65535) {
                throw new NumberFormatException("outside valid port range");
            }
            return port;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("CAREERFIT_PORT must be a number from 1 to 65535.", exception);
        }
    }

    private static Path findFrontendRoot() throws IOException {
        Path workingDirectory = Paths.get("").toAbsolutePath().normalize();
        Path[] candidates = {
            workingDirectory.resolve("frontend").normalize(),
            workingDirectory.resolve("..").resolve("frontend").normalize()
        };
        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate) && Files.isRegularFile(candidate.resolve("index.html"))) {
                return candidate;
            }
        }
        throw new IOException("Could not find the frontend directory. Run the server from the project or backend directory.");
    }

    private static void handleApi(HttpExchange exchange) throws IOException {
        try {
            applyCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            String origin = exchange.getRequestHeaders().getFirst("Origin");
            if (origin != null && !isLocalOrigin(origin)) {
                throw new HttpProblem(403, "Only requests from a local CareerFit page are allowed.");
            }

            String path = exchange.getRequestURI().getPath();
            if ("/api/health".equals(path)) {
                requireMethod(exchange, "GET");
                sendJson(exchange, 200, jsonObject("status", "ok"));
            } else if ("/api/resumes/analyze".equals(path)) {
                requireMethod(exchange, "POST");
                Map<String, String> request = readJsonObject(exchange);
                String content = requiredValue(request, "content");
                sendJson(exchange, 200, jsonObject("extractedSkills", extractSkills(content)));
            } else if ("/api/matches".equals(path)) {
                requireMethod(exchange, "POST");
                sendJson(exchange, 200, compare(readJsonObject(exchange)));
            } else {
                throw new HttpProblem(404, "The requested CareerFit API endpoint was not found.");
            }
        } catch (HttpProblem problem) {
            sendJson(exchange, problem.statusCode, jsonObject("error", problem.getMessage()));
        } catch (IllegalArgumentException exception) {
            sendJson(exchange, 400, jsonObject("error", exception.getMessage()));
        } catch (RuntimeException exception) {
            System.err.println("CareerFit API request failed: " + exception.getMessage());
            exception.printStackTrace(System.err);
            sendJson(exchange, 500, jsonObject("error", "The CareerFit server could not complete the request."));
        } finally {
            exchange.close();
        }
    }

    private static void applyCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && isLocalOrigin(origin)) {
            Headers headers = exchange.getResponseHeaders();
            headers.set("Access-Control-Allow-Origin", origin);
            headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "Accept, Content-Type");
            headers.set("Vary", "Origin");
        }
    }

    private static boolean isLocalOrigin(String value) {
        try {
            URI origin = URI.create(value);
            String host = origin.getHost();
            return "http".equalsIgnoreCase(origin.getScheme())
                && host != null
                && (host.equalsIgnoreCase("localhost") || "127.0.0.1".equals(host) || "::1".equals(host))
                && origin.getRawUserInfo() == null
                && (origin.getRawPath() == null || origin.getRawPath().isEmpty())
                && origin.getRawQuery() == null
                && origin.getRawFragment() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static void requireMethod(HttpExchange exchange, String expected) {
        if (!expected.equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Allow", expected + ", OPTIONS");
            throw new HttpProblem(405, "This endpoint requires the " + expected + " method.");
        }
    }

    private static Map<String, Object> compare(Map<String, String> request) {
        String resumeId = requiredValue(request, "resumeId");
        String resumeTitle = requiredValue(request, "resumeTitle");
        String resumeContent = requiredValue(request, "resumeContent");
        String jobTitle = requiredValue(request, "jobTitle");
        String jobDescription = requiredValue(request, "jobDescription");
        String companyName = optionalValue(request, "companyName");

        List<String> resumeSkills = extractSkills(resumeContent);
        List<String> requiredSkills = extractSkills(jobDescription);
        if (requiredSkills.isEmpty()) {
            throw new HttpProblem(422, "No recognized skills were found in the job description.");
        }

        Resume resume = new Resume("local@careerfit.local", resumeTitle, resumeContent);
        resume.addSkills(new HashSet<>(resumeSkills));
        Job job = new Job(
            UUID.randomUUID().toString(),
            jobTitle,
            jobDescription,
            new HashSet<>(requiredSkills)
        );
        MatchReport report = RESUME_MATCHER.compare(resume, job);
        List<String> matchedSkills = displaySkillNames(report.getMatchedSkills());
        List<String> missingSkills = displaySkillNames(report.getMissingSkills());
        double percentage = Math.round(report.getMatchingPercentage() * 100.0) / 100.0;

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("overallMatchPercentage", percentage);
        results.put("matchedSkills", matchedSkills);
        results.put("missingSkills", missingSkills);
        results.put("totalRequiredSkills", requiredSkills.size());
        results.put("matchedSkillsCount", matchedSkills.size());
        results.put("missingSkillsCount", missingSkills.size());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", UUID.randomUUID().toString());
        response.put("resumeId", resumeId);
        response.put("resumeTitle", resumeTitle);
        response.put("jobTitle", jobTitle);
        response.put("companyName", companyName);
        response.put("comparedAt", Instant.now().toString());
        response.put("overallMatchPercentage", percentage);
        response.put("matchedSkills", matchedSkills);
        response.put("missingSkills", missingSkills);
        response.put("results", results);
        return response;
    }

    private static Map<String, Pattern> createSkillPatterns() {
        Map<String, Pattern> patterns = new LinkedHashMap<>();
        for (String skill : SKILL_NAMES) {
            String expression = "(?<![\\p{L}\\p{N}])" + Pattern.quote(skill) + "(?![\\p{L}\\p{N}])";
            patterns.put(skill, Pattern.compile(expression, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE));
        }
        return Collections.unmodifiableMap(patterns);
    }

    private static List<String> extractSkills(String text) {
        List<String> skills = new ArrayList<>();
        for (Map.Entry<String, Pattern> entry : SKILL_PATTERNS.entrySet()) {
            if (entry.getValue().matcher(text).find()) {
                skills.add(entry.getKey());
            }
        }
        return sorted(skills);
    }

    private static List<String> sorted(Iterable<String> values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            result.add(value);
        }
        result.sort(String.CASE_INSENSITIVE_ORDER);
        return result;
    }

    private static List<String> displaySkillNames(Iterable<String> values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            for (String skillName : SKILL_NAMES) {
                if (skillName.equalsIgnoreCase(value)) {
                    result.add(skillName);
                    break;
                }
            }
        }
        return sorted(result);
    }

    private static Map<String, Object> jsonObject(String key, Object value) {
        Map<String, Object> object = new LinkedHashMap<>();
        object.put(key, value);
        return object;
    }

    private static String requiredValue(Map<String, String> request, String key) {
        String value = request.get(key);
        if (value == null || value.trim().isEmpty()) {
            throw new HttpProblem(400, "The " + key + " field is required.");
        }
        return value.trim();
    }

    private static String optionalValue(Map<String, String> request, String key) {
        String value = request.get(key);
        return value == null ? "" : value.trim();
    }

    private static Map<String, String> readJsonObject(HttpExchange exchange) throws IOException {
        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("application/json")) {
            throw new HttpProblem(415, "Send request data with the application/json content type.");
        }

        byte[] body;
        try (InputStream input = exchange.getRequestBody()) {
            body = input.readNBytes(MAX_REQUEST_BYTES + 1);
        }
        if (body.length > MAX_REQUEST_BYTES) {
            throw new HttpProblem(413, "The request body is too large.");
        }
        return new JsonObjectReader(new String(body, StandardCharsets.UTF_8)).read();
    }

    private static void sendJson(HttpExchange exchange, int statusCode, Object value) throws IOException {
        byte[] body = toJson(value).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(statusCode, body.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(body);
        }
    }

    private static String toJson(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String) {
            return quoteJson((String) value);
        }
        if (value instanceof Number) {
            double number = ((Number) value).doubleValue();
            if (!Double.isFinite(number)) {
                throw new IllegalArgumentException("JSON numbers must be finite.");
            }
            return value.toString();
        }
        if (value instanceof Map<?, ?>) {
            StringBuilder output = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                if (!(entry.getKey() instanceof String)) {
                    throw new IllegalArgumentException("JSON object keys must be strings.");
                }
                if (!first) {
                    output.append(',');
                }
                output.append(quoteJson((String) entry.getKey()))
                    .append(':')
                    .append(toJson(entry.getValue()));
                first = false;
            }
            return output.append('}').toString();
        }
        if (value instanceof Iterable<?>) {
            StringBuilder output = new StringBuilder("[");
            boolean first = true;
            for (Object item : (Iterable<?>) value) {
                if (!first) {
                    output.append(',');
                }
                output.append(toJson(item));
                first = false;
            }
            return output.append(']').toString();
        }
        throw new IllegalArgumentException("Unsupported JSON response value.");
    }

    private static String quoteJson(String value) {
        StringBuilder output = new StringBuilder("\"");
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"':
                    output.append("\\\"");
                    break;
                case '\\':
                    output.append("\\\\");
                    break;
                case '\b':
                    output.append("\\b");
                    break;
                case '\f':
                    output.append("\\f");
                    break;
                case '\n':
                    output.append("\\n");
                    break;
                case '\r':
                    output.append("\\r");
                    break;
                case '\t':
                    output.append("\\t");
                    break;
                default:
                    if (character < 0x20) {
                        output.append(String.format(Locale.ROOT, "\\u%04x", (int) character));
                    } else {
                        output.append(character);
                    }
            }
        }
        return output.append('"').toString();
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        try {
            String method = exchange.getRequestMethod();
            if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
                exchange.getResponseHeaders().set("Allow", "GET, HEAD");
                sendText(exchange, 405, "Method not allowed.");
                return;
            }

            String requestPath = exchange.getRequestURI().getPath();
            if (requestPath == null || requestPath.equals("/")) {
                requestPath = "/index.html";
            }
            Path file = frontendRoot.resolve(requestPath.substring(1)).normalize();
            if (!file.startsWith(frontendRoot) || !Files.isRegularFile(file)) {
                sendText(exchange, 404, "File not found.");
                return;
            }

            byte[] body = Files.readAllBytes(file);
            exchange.getResponseHeaders().set("Content-Type", contentType(file));
            exchange.getResponseHeaders().set("Cache-Control", "no-store");
            exchange.sendResponseHeaders(200, "HEAD".equalsIgnoreCase(method) ? -1 : body.length);
            if ("GET".equalsIgnoreCase(method)) {
                try (OutputStream output = exchange.getResponseBody()) {
                    output.write(body);
                }
            }
        } catch (InvalidPathException exception) {
            sendText(exchange, 404, "File not found.");
        } finally {
            exchange.close();
        }
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (name.endsWith(".js")) {
            return "application/javascript; charset=utf-8";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        if (name.endsWith(".ico")) {
            return "image/x-icon";
        }
        return "application/octet-stream";
    }

    private static void sendText(HttpExchange exchange, int statusCode, String value) throws IOException {
        byte[] body = value.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, body.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(body);
        }
    }

    private static final class HttpProblem extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private final int statusCode;

        private HttpProblem(int statusCode, String message) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    private static final class JsonObjectReader {
        private final String input;
        private int index;

        private JsonObjectReader(String input) {
            this.input = input;
        }

        private Map<String, String> read() {
            skipWhitespace();
            expect('{');
            Map<String, String> values = new LinkedHashMap<>();
            skipWhitespace();
            if (take('}')) {
                finish();
                return values;
            }

            while (true) {
                skipWhitespace();
                String key = readString();
                skipWhitespace();
                expect(':');
                skipWhitespace();
                String value = takeLiteral("null") ? null : readString();
                if (values.containsKey(key)) {
                    throw invalidJson();
                }
                values.put(key, value);
                skipWhitespace();
                if (take('}')) {
                    finish();
                    return values;
                }
                expect(',');
            }
        }

        private String readString() {
            expect('"');
            StringBuilder value = new StringBuilder();
            while (index < input.length()) {
                char character = input.charAt(index++);
                if (character == '"') {
                    return value.toString();
                }
                if (character < 0x20) {
                    throw invalidJson();
                }
                if (character != '\\') {
                    value.append(character);
                    continue;
                }
                if (index >= input.length()) {
                    throw invalidJson();
                }
                char escape = input.charAt(index++);
                switch (escape) {
                    case '"':
                    case '\\':
                    case '/':
                        value.append(escape);
                        break;
                    case 'b':
                        value.append('\b');
                        break;
                    case 'f':
                        value.append('\f');
                        break;
                    case 'n':
                        value.append('\n');
                        break;
                    case 'r':
                        value.append('\r');
                        break;
                    case 't':
                        value.append('\t');
                        break;
                    case 'u':
                        value.append(readUnicodeEscape());
                        break;
                    default:
                        throw invalidJson();
                }
            }
            throw invalidJson();
        }

        private char readUnicodeEscape() {
            if (index + 4 > input.length()) {
                throw invalidJson();
            }
            try {
                char value = (char) Integer.parseInt(input.substring(index, index + 4), 16);
                index += 4;
                return value;
            } catch (NumberFormatException exception) {
                throw invalidJson();
            }
        }

        private boolean takeLiteral(String literal) {
            if (!input.startsWith(literal, index)) {
                return false;
            }
            index += literal.length();
            return true;
        }

        private boolean take(char expected) {
            if (index < input.length() && input.charAt(index) == expected) {
                index++;
                return true;
            }
            return false;
        }

        private void expect(char expected) {
            if (!take(expected)) {
                throw invalidJson();
            }
        }

        private void skipWhitespace() {
            while (index < input.length()) {
                char value = input.charAt(index);
                if (value != ' ' && value != '\t' && value != '\r' && value != '\n') {
                    return;
                }
                index++;
            }
        }

        private void finish() {
            skipWhitespace();
            if (index != input.length()) {
                throw invalidJson();
            }
        }

        private HttpProblem invalidJson() {
            return new HttpProblem(400, "The request body must be a valid JSON object containing string values.");
        }
    }
}
