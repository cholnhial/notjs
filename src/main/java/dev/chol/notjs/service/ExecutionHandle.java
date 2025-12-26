package dev.chol.notjs.service;

import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Handle for a code execution process that provides cleanup capabilities.
 * This allows WebSocket handlers or other callers to explicitly cleanup
 * resources when a session ends prematurely.
 */
@Slf4j
public class ExecutionHandle {
    private final Process process;
    private final Set<File> tempFiles;
    private final String language;
    private volatile boolean cleanedUp = false;

    public ExecutionHandle(Process process, Set<File> tempFiles, String language) {
        this.process = process;
        this.tempFiles = tempFiles;
        this.language = language;
    }

    /**
     * Gets the underlying process.
     */
    public Process getProcess() {
        return process;
    }

    /**
     * Gets the process input stream.
     */
    public InputStream getInputStream() {
        return process.getInputStream();
    }

    /**
     * Gets the process output stream.
     */
    public OutputStream getOutputStream() {
        return process.getOutputStream();
    }

    /**
     * Gets the process error stream.
     */
    public InputStream getErrorStream() {
        return process.getErrorStream();
    }

    /**
     * Checks if the process is still alive.
     */
    public boolean isAlive() {
        return process.isAlive();
    }

    /**
     * Forcibly terminates the process and cleans up temporary files.
     * This should be called when a WebSocket session ends prematurely.
     * Safe to call multiple times - subsequent calls are no-ops.
     */
    public void forceCleanup() {
        if (cleanedUp) {
            return;
        }

        synchronized (this) {
            if (cleanedUp) {
                return;
            }
            cleanedUp = true;

            log.info("Force cleanup triggered for {} execution", language);

            // Kill the process if still running
            if (process.isAlive()) {
                log.info("Destroying running {} process", language);
                process.destroyForcibly();
                try {
                    process.waitFor(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("Interrupted while waiting for {} process to terminate", language);
                }
            }

            // Clean up temp files
            cleanupTempFiles();
        }
    }

    /**
     * Cleans up temporary files associated with this execution.
     */
    private void cleanupTempFiles() {
        log.info("Cleaning up {} temporary files for {} execution", tempFiles.size(), language);
        for (File file : tempFiles) {
            try {
                if (file != null && file.exists()) {
                    Files.deleteIfExists(file.toPath());
                    log.debug("Deleted temporary file: {}", file.getAbsolutePath());
                }
            } catch (IOException e) {
                log.error("Failed to delete temporary file: {} - {}", file.getAbsolutePath(), e.getMessage());
            }
        }
        tempFiles.clear();
    }

    /**
     * Returns whether cleanup has been performed.
     */
    public boolean isCleanedUp() {
        return cleanedUp;
    }

    /**
     * Waits for the process to complete naturally and returns the exit code.
     * This does NOT trigger cleanup - use forceCleanup() for that.
     */
    public int waitFor() throws InterruptedException {
        return process.waitFor();
    }

    /**
     * Waits for the process to complete with a timeout.
     */
    public boolean waitFor(long timeout, TimeUnit unit) throws InterruptedException {
        return process.waitFor(timeout, unit);
    }
}