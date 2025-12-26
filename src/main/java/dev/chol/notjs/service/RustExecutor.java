package dev.chol.notjs.service;

import dev.chol.notjs.util.NotJSUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
public class RustExecutor implements NotJSExecutor {

    // ThreadLocal to track temp files per execution (thread-safe for concurrent executions)
    private final ThreadLocal<Set<File>> tempFiles = ThreadLocal.withInitial(HashSet::new);

    private static final String RUST_COMPILER = "rustc";
    private static final String DEFAULT_VERSION = "1.63.0";
    // Only rustc is available in the Docker image (not rustup)
    private static final List<String> AVAILABLE_VERSIONS = List.of("1.63.0");

    @Override
    public ExecutionHandle execute(String srcCode, String version, List<String> arguments) throws IOException {
        // Clear any previous temp files from this thread
        getTempFiles().clear();

        // Use default version if not specified
        if (version == null || version.isBlank()) {
            version = DEFAULT_VERSION;
        }

        // Validate version
        if (!AVAILABLE_VERSIONS.contains(version)) {
            throw new IllegalArgumentException(
                "Unsupported Rust version: " + version + ". Available versions: " + AVAILABLE_VERSIONS
            );
        }

        Path tempDir = NotJSUtils.getTempDirectory();

        // Generate random file names to avoid conflicts
        String randomPrefix = NotJSUtils.generateRandomExecutableName("rust");
        String sourceFileName = randomPrefix + ".rs";
        String executableName = randomPrefix + ".out";

        // Create temporary source file
        Path rustFilePath = NotJSUtils.createTempFile(sourceFileName, srcCode);
        Path executablePath = tempDir.resolve(executableName);

        // Register temp files for cleanup
        registerTempFile(rustFilePath.toFile());
        registerTempFile(executablePath.toFile());

        log.info("Rust source code written to: {} (version: {})", rustFilePath, version);

        // Step 1: Compile the Rust source file
        List<String> compileCommand = new ArrayList<>();
        compileCommand.add(RUST_COMPILER);
        compileCommand.add("-o");
        compileCommand.add(executablePath.toString());
        compileCommand.add(rustFilePath.toString());

        log.info("Compiling Rust source with rustc {}: {}", version, rustFilePath);
        ProcessBuilder compileBuilder = new ProcessBuilder(compileCommand);
        compileBuilder.redirectErrorStream(true);
        compileBuilder.directory(tempDir.toFile());

        Process compileProcess = compileBuilder.start();

        try {
            int exitCode = compileProcess.waitFor();
            if (exitCode != 0) {
                // Compilation failed - return the compile process so user sees the error
                log.error("Rust compilation failed with exit code: {}", exitCode);
                Set<File> filesToClean = new HashSet<>(getTempFiles());
                ExecutionHandle handle = new ExecutionHandle(compileProcess, filesToClean, getLanguage());
                scheduleCleanupAfterProcessTermination(handle, filesToClean);
                return handle;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Rust compilation interrupted", e);
        }

        log.info("Rust compilation successful, running executable: {}", executablePath);

        // Step 2: Run the compiled executable
        List<String> runCommand = new ArrayList<>();
        runCommand.add(executablePath.toString());
        runCommand.addAll(arguments);

        ProcessBuilder runBuilder = new ProcessBuilder(runCommand);
        runBuilder.redirectErrorStream(true);
        runBuilder.directory(tempDir.toFile());

        Process process = runBuilder.start();
        log.info("Rust process started for executable: {}", executablePath);

        // Create execution handle with current temp files
        Set<File> filesToClean = new HashSet<>(getTempFiles());
        ExecutionHandle handle = new ExecutionHandle(process, filesToClean, getLanguage());

        // Schedule automatic cleanup after process terminates (unless already cleaned up)
        scheduleCleanupAfterProcessTermination(handle, filesToClean);

        return handle;
    }

    @Override
    public String getLanguage() {
        return "rust";
    }

    @Override
    public List<String> getAvailableVersions() {
        return AVAILABLE_VERSIONS;
    }

    @Override
    public String getDefaultVersion() {
        return DEFAULT_VERSION;
    }

    @Override
    public Set<File> getTempFiles() {
        return tempFiles.get();
    }

    /**
     * Schedules cleanup of temporary files after the process terminates.
     * Only cleans up if forceCleanup() hasn't been called on the handle.
     *
     * @param handle the execution handle to check for cleanup status
     * @param filesToClean the files to clean up
     */
    private void scheduleCleanupAfterProcessTermination(ExecutionHandle handle, Set<File> filesToClean) {
        Thread cleanupThread = new Thread(() -> {
            try {
                handle.waitFor();

                // Only cleanup if not already cleaned up by forceCleanup()
                if (!handle.isCleanedUp()) {
                    log.info("Rust process terminated naturally, cleaning up {} temporary files", filesToClean.size());
                    tempFiles.set(filesToClean);
                    cleanupTempFiles();
                    tempFiles.remove();
                } else {
                    log.debug("Rust temp files already cleaned up via forceCleanup()");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                if (!handle.isCleanedUp()) {
                    log.warn("Rust cleanup thread interrupted, performing cleanup anyway");
                    tempFiles.set(filesToClean);
                    cleanupTempFiles();
                    tempFiles.remove();
                }
            }
        }, "rust-executor-cleanup");

        cleanupThread.setDaemon(true);
        cleanupThread.start();
    }
}