package dev.chol.notjs.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
public class ExecutorFactory {

    private final Map<String, NotJSExecutor> executors;

    public ExecutorFactory(List<NotJSExecutor> executorList) {
        this.executors = executorList.stream()
                .collect(Collectors.toMap(
                        NotJSExecutor::getLanguage,
                        Function.identity()
                ));
        log.info("Registered language executors: {}", executors.keySet());
    }

    /**
     * Gets the appropriate executor for the given language.
     *
     * @param language the language identifier (e.g., "java", "c", "cpp", "go", "rust")
     * @return the executor for the specified language
     * @throws UnsupportedOperationException if the language is not supported
     */
    public NotJSExecutor getExecutor(String language) {
        NotJSExecutor executor = executors.get(language.toLowerCase());
        if (executor == null) {
            throw new UnsupportedOperationException("Unsupported language: " + language);
        }
        return executor;
    }

    /**
     * Checks if a language is supported.
     *
     * @param language the language identifier
     * @return true if the language is supported, false otherwise
     */
    public boolean isSupported(String language) {
        return executors.containsKey(language.toLowerCase());
    }

    /**
     * Gets all supported language identifiers.
     *
     * @return set of supported language names
     */
    public java.util.Set<String> getSupportedLanguages() {
        return executors.keySet();
    }
}