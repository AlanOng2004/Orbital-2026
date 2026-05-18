package com.orbital.nusmaps.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Loads a local .env (KEY=value) into the Spring Environment early.
 * Spring's spring.config.import does not treat extensionless .env files as properties
 * unless a [.properties] hint is used; this processor makes .env loading reliable.
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String ENV_FILE = ".env";
    private static final String PROPERTY_SOURCE_NAME = "dotenv";

    @Override
    public void postProcessEnvironment(final ConfigurableEnvironment environment,
                                       final SpringApplication application) {
        for (final Path path : candidatePaths()) {
            if (!Files.isRegularFile(path)) {
                continue;
            }
            try {
                final Map<String, Object> props = parseEnvFile(path);
                if (!props.isEmpty()) {
                    environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, props));
                }
                return;
            } catch (final IOException ex) {
                throw new IllegalStateException("Failed to read " + path.toAbsolutePath(), ex);
            }
        }
    }

    private static List<Path> candidatePaths() {
        final Path cwd = Path.of(System.getProperty("user.dir")).normalize();
        return List.of(
                cwd.resolve(ENV_FILE),
                cwd.resolve("backend").resolve(ENV_FILE),
                cwd.resolve("backend").resolve("app").resolve(ENV_FILE),
                cwd.getParent() != null ? cwd.getParent().resolve(ENV_FILE) : cwd.resolve(ENV_FILE)
        );
    }

    static Map<String, Object> parseEnvFile(final Path path) throws IOException {
        final Map<String, Object> props = new LinkedHashMap<>();
        for (final String rawLine : Files.readAllLines(path)) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("export ")) {
                line = line.substring("export ".length()).trim();
            }
            final int eq = line.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            final String key = line.substring(0, eq).trim();
            String value = line.substring(eq + 1).trim();
            if ((value.startsWith("\"") && value.endsWith("\""))
                    || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length() - 1);
            }
            props.put(key, value);
        }
        return props;
    }
}
