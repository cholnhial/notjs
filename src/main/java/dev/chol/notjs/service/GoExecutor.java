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
public class GoExecutor implements NotJSExecutor {

    private static final String GO_COMPILER = "go";
    private static final String DEFAULT_VERSION = "1.21";
    private static final List<String> AVAILABLE_VERSIONS = List.of("1.19", "1.20", "1.21", "1.22", "1.23");

    @Override
    public Process execute(String srcCode, String version, List<String> arguments) throws IOException {
        // Use default version if not specified
        if (version == null || version.isBlank()) {
            version = DEFAULT_VERSION;
        }

        // Validate version
        if (!AVAILABLE_VERSIONS.contains(version)) {
            throw new IllegalArgumentException(
                "Unsupported Go version: " + version + ". Available versions: " + AVAILABLE_VERSIONS
            );
        }

        Path tempDir = NotJSUtils.getTempDirectory();

        // Generate random file names to avoid conflicts
        String randomPrefix = NotJSUtils.generateRandomExecutableName("go");
        String sourceFileName = randomPrefix + ".go";
        String executableName = randomPrefix + ".out";

        // Create temporary source file
        Path goFilePath = NotJSUtils.createTempFile(sourceFileName, srcCode);
        Path executablePath = tempDir.resolve(executableName);

        log.info("Go source code written to: {} (version: {})", goFilePath, version);

        // Step 1: Compile the Go source file
        List<String> compileCommand = new ArrayList<>();
        compileCommand.add(GO_COMPILER);
        compileCommand.add("build");
        compileCommand.add("-o");
        compileCommand.add(executablePath.toString());
        compileCommand.add(goFilePath.toString());

        log.info("Compiling Go source with Go {}: {}", version, goFilePath);
        ProcessBuilder compileBuilder = new ProcessBuilder(compileCommand);
        compileBuilder.redirectErrorStream(true);
        compileBuilder.directory(tempDir.toFile());

        Process compileProcess = compileBuilder.start();

        try {
            int exitCode = compileProcess.waitFor();
            if (exitCode != 0) {
                // Compilation failed - return the compile process so user sees the error
                log.error("Go compilation failed with exit code: {}", exitCode);
                return compileProcess;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Go compilation interrupted", e);
        }

        log.info("Go compilation successful, running executable: {}", executablePath);

        // Step 2: Run the compiled executable with unbuffered output
        // Use stdbuf to disable buffering so output appears immediately
        List<String> runCommand = new ArrayList<>();
        runCommand.add("stdbuf");
        runCommand.add("-o0");  // Unbuffered output
        runCommand.add(executablePath.toString());
        runCommand.addAll(arguments);

        ProcessBuilder runBuilder = new ProcessBuilder(runCommand);
        runBuilder.redirectErrorStream(true);
        runBuilder.directory(tempDir.toFile());

        Process process = runBuilder.start();
        log.info("Go process started for executable: {}", executablePath);

        return process;
    }

    @Override
    public String getLanguage() {
        return "go";
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