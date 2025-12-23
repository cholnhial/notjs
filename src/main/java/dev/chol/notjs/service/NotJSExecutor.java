package dev.chol.notjs.service;

import java.io.IOException;
import java.util.List;

public interface NotJSExecutor {
    /**
     * Executes compiled language code with the given version and arguments.
     *
     * @param srcCode the source code to execute
     * @param version the language version to use (null or empty for default)
     * @param arguments list of command-line arguments to pass to the program
     * @return the running process
     * @throws IOException if an I/O error occurs during execution
     */
    Process execute(String srcCode, String version, List<String> arguments) throws IOException;

    /**
     * Returns the language identifier for this executor.
     *
     * @return the language name (e.g., "java", "c", "cpp", "go", "rust")
     */
    String getLanguage();

    /**
     * Returns the list of available versions for this language.
     *
     * @return list of version identifiers
     */
    List<String> getAvailableVersions();

    /**
     * Returns the default version for this language.
     *
     * @return the default version identifier
     */
    String getDefaultVersion();
}