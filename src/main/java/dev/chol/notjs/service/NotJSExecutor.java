package dev.chol.notjs.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Set;

public interface NotJSExecutor {
    /**
     * Executes compiled language code with the given version and arguments.
     * Returns an ExecutionHandle that provides access to the process and
     * allows explicit cleanup when a WebSocket session ends prematurely.
     *
     * @param srcCode the source code to execute
     * @param version the language version to use (null or empty for default)
     * @param arguments list of command-line arguments to pass to the program
     * @return ExecutionHandle for managing the execution and cleanup
     * @throws IOException if an I/O error occurs during execution
     */
    ExecutionHandle execute(String srcCode, String version, List<String> arguments) throws IOException;

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

    /**
     * Returns the set of temporary files created during execution.
     * Implementations should maintain this set and add files to it via registerTempFile().
     *
     * @return set of temporary files to be cleaned up
     */
    Set<File> getTempFiles();

    /**
     * Registers a temporary file for cleanup after execution.
     * This method should be called for all temporary files created during execution
     * (source files, compiled binaries, intermediate files, etc.).
     *
     * @param file the temporary file to register
     */
    default void registerTempFile(File file) {
        if (file != null) {
            getTempFiles().add(file);
        }
    }

    /**
     * Cleans up all registered temporary files.
     * This method should be called after execution completes or if execution fails.
     * It will attempt to delete all files registered via registerTempFile().
     */
    default void cleanupTempFiles() {
        Set<File> tempFiles = getTempFiles();
        if (tempFiles != null) {
            for (File file : tempFiles) {
                try {
                    if (file != null && file.exists()) {
                        Files.deleteIfExists(file.toPath());
                    }
                } catch (IOException e) {
                    System.err.println("Failed to delete temporary file: " + file.getAbsolutePath() + " - " + e.getMessage());
                }
            }
            tempFiles.clear();
        }
    }
}