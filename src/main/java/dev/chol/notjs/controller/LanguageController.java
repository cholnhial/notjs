package dev.chol.notjs.controller;

import dev.chol.notjs.service.ExecutorFactory;
import dev.chol.notjs.service.NotJSExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/language")
@RequiredArgsConstructor
public class LanguageController {

    private final ExecutorFactory executorFactory;

    /**
     * Get available versions for a specific language.
     *
     * @param language the language identifier (e.g., "java", "c", "cpp")
     * @return list of available versions for the language
     */
    @GetMapping("/version/{language}")
    public ResponseEntity<List<String>> getLanguageVersions(@PathVariable String language) {
        log.info("Fetching versions for language: {}", language);

        if (!executorFactory.isSupported(language)) {
            log.warn("Unsupported language requested: {}", language);
            return ResponseEntity.notFound().build();
        }

        NotJSExecutor executor = executorFactory.getExecutor(language);
        List<String> versions = executor.getAvailableVersions();

        log.info("Available versions for {}: {}", language, versions);
        return ResponseEntity.ok(versions);
    }

    /**
     * Get the default version for a specific language.
     *
     * @param language the language identifier
     * @return the default version
     */
    @GetMapping("/version/{language}/default")
    public ResponseEntity<Map<String, String>> getDefaultVersion(@PathVariable String language) {
        log.info("Fetching default version for language: {}", language);

        if (!executorFactory.isSupported(language)) {
            log.warn("Unsupported language requested: {}", language);
            return ResponseEntity.notFound().build();
        }

        NotJSExecutor executor = executorFactory.getExecutor(language);
        String defaultVersion = executor.getDefaultVersion();

        log.info("Default version for {}: {}", language, defaultVersion);
        return ResponseEntity.ok(Map.of("language", language, "defaultVersion", defaultVersion));
    }

    /**
     * Get all supported languages.
     *
     * @return set of supported language identifiers
     */
    @GetMapping("/supported")
    public ResponseEntity<Set<String>> getSupportedLanguages() {
        log.info("Fetching all supported languages");
        Set<String> languages = executorFactory.getSupportedLanguages();
        log.info("Supported languages: {}", languages);
        return ResponseEntity.ok(languages);
    }

    /**
     * Get complete language information including versions and default.
     *
     * @param language the language identifier
     * @return map containing language info, versions, and default version
     */
    @GetMapping("/info/{language}")
    public ResponseEntity<Map<String, Object>> getLanguageInfo(@PathVariable String language) {
        log.info("Fetching complete info for language: {}", language);

        if (!executorFactory.isSupported(language)) {
            log.warn("Unsupported language requested: {}", language);
            return ResponseEntity.notFound().build();
        }

        NotJSExecutor executor = executorFactory.getExecutor(language);

        Map<String, Object> info = Map.of(
            "language", language,
            "availableVersions", executor.getAvailableVersions(),
            "defaultVersion", executor.getDefaultVersion()
        );

        log.info("Language info for {}: {}", language, info);
        return ResponseEntity.ok(info);
    }
}