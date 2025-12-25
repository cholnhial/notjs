package dev.chol.notjs.service;

import dev.chol.notjs.util.NotJSUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class CExecutor implements NotJSExecutor {

    private static final String C_COMPILER = "gcc";
    private static final String DEFAULT_VERSION = "17"; // C17 (ISO/IEC 9899:2018)
    private static final List<String> AVAILABLE_VERSIONS = List.of("89", "99", "11", "17", "23");

    @Override
    public Process execute(String srcCode, String version, List<String> arguments) throws IOException {
        // Use default version if not specified
        if (version == null || version.isBlank()) {
            version = DEFAULT_VERSION;
        }

        // Validate version
        if (!AVAILABLE_VERSIONS.contains(version)) {
            throw new IllegalArgumentException(
                "Unsupported C version: " + version + ". Available versions: " + AVAILABLE_VERSIONS
            );
        }

        Path tempDir = NotJSUtils.getTempDirectory();

        // Generate random file names to avoid conflicts
        String randomPrefix = NotJSUtils.generateRandomExecutableName("c");
        String sourceFileName = randomPrefix + ".c";
        String executableName = randomPrefix + ".out";

        // Create temporary source file
        Path cFilePath = NotJSUtils.createTempFile(sourceFileName, srcCode);
        Path executablePath = tempDir.resolve(executableName);

        log.info("C source code written to: {} (version: C{})", cFilePath, version);

        // Step 1: Compile the C source file
        List<String> compileCommand = new ArrayList<>();
        compileCommand.add(C_COMPILER);
        compileCommand.add("-std=c" + version);
        compileCommand.add("-o");
        compileCommand.add(executablePath.toString());
        compileCommand.add(cFilePath.toString());

        log.info("Compiling C source with C{}: {}", version, cFilePath);
        ProcessBuilder compileBuilder = new ProcessBuilder(compileCommand);
        compileBuilder.redirectErrorStream(true);
        compileBuilder.directory(tempDir.toFile());

        Process compileProcess = compileBuilder.start();

        try {
            int exitCode = compileProcess.waitFor();
            if (exitCode != 0) {
                // Compilation failed - return the compile process so user sees the error
                log.error("C compilation failed with exit code: {}", exitCode);
                return compileProcess;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("C compilation interrupted", e);
        }

        log.info("C compilation successful, running executable: {}", executablePath);

        // Step 2: Run the compiled executable
        List<String> runCommand = new ArrayList<>();
        runCommand.add(executablePath.toString());
        runCommand.addAll(arguments);

        ProcessBuilder runBuilder = new ProcessBuilder(runCommand);
        runBuilder.redirectErrorStream(true);
        runBuilder.directory(tempDir.toFile());

        Process process = runBuilder.start();
        log.info("C process started for executable: {}", executablePath);

        return process;
    }

    @Override
    public String getLanguage() {
        return "c";
    }

    @Override
    public List<String> getAvailableVersions() {
        return AVAILABLE_VERSIONS;
    }

    @Override
    public String getDefaultVersion() {
        return DEFAULT_VERSION;
    }
}