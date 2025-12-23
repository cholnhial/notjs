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
public class JavaExecutor implements NotJSExecutor {

    private static final String SDKMAN_JAVA_PATH = "/root/.sdkman/candidates/java";
    private static final String DEFAULT_VERSION = "25";
    private static final List<String> AVAILABLE_VERSIONS = List.of("8", "11", "17", "21", "25");

    // Mapping from short version to full SDKMAN version
    private static final java.util.Map<String, String> VERSION_MAP = java.util.Map.of(
        "8", "8.0.402-tem",
        "11", "11.0.23-tem",
        "17", "17.0.11-tem",
        "21", "21.0.3-tem",
        "25", "25.0.1-tem"
    );

    @Override
    public Process execute(String srcCode, String version, List<String> arguments) throws IOException {
        // Use default version if not specified
        if (version == null || version.isBlank()) {
            version = DEFAULT_VERSION;
        }

        // Validate version
        if (!AVAILABLE_VERSIONS.contains(version)) {
            throw new IllegalArgumentException(
                "Unsupported Java version: " + version + ". Available versions: " + AVAILABLE_VERSIONS
            );
        }

        // Get the full SDKMAN version and construct executable paths
        String fullVersion = VERSION_MAP.get(version);
        String javaHome = SDKMAN_JAVA_PATH + "/" + fullVersion;
        String javaExecutable = javaHome + "/bin/java";
        String javacExecutable = javaHome + "/bin/javac";

        // Extract class name from source code or use default
        String originalClassName = extractClassName(srcCode);

        // Generate random prefix for unique file/class name
        String randomPrefix = NotJSUtils.generateRandomExecutableName("java");
        String newClassName = randomPrefix + "_" + originalClassName;
        String fileName = newClassName + ".java";

        // Replace class name in source code with the new prefixed name
        String modifiedSrcCode = replaceClassName(srcCode, originalClassName, newClassName);

        // Ensure temp directory exists and create file with modified source code
        NotJSUtils.ensureTempDirectoryExists();
        Path tempDir = NotJSUtils.getTempDirectory();
        Path javaFilePath = tempDir.resolve(fileName);
        java.nio.file.Files.writeString(javaFilePath, modifiedSrcCode,
            java.nio.file.StandardOpenOption.CREATE,
            java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);

        log.info("Java source code written to: {} (version: {})", javaFilePath, version);

        int versionNumber = Integer.parseInt(version);

        // For Java 8-10, we need to compile first then run
        if (versionNumber < 11) {
            return executeWithCompilation(javacExecutable, javaExecutable, javaFilePath, newClassName, arguments, version);
        } else {
            // For Java 11+, use --source flag to run directly
            return executeWithSourceFlag(javaExecutable, javaFilePath, arguments, version, versionNumber);
        }
    }

    /**
     * Compile with javac and then run with java (for Java 8-10)
     */
    private Process executeWithCompilation(String javacExecutable, String javaExecutable,
                                          Path javaFilePath, String className,
                                          List<String> arguments, String version) throws IOException {
        Path tempDir = NotJSUtils.getTempDirectory();

        // Step 1: Compile the Java source file
        List<String> compileCommand = new ArrayList<>();
        compileCommand.add(javacExecutable);
        compileCommand.add("-d");
        compileCommand.add(tempDir.toString());
        compileCommand.add(javaFilePath.toString());

        log.info("Compiling Java {} source: {}", version, javaFilePath);
        ProcessBuilder compileBuilder = new ProcessBuilder(compileCommand);
        compileBuilder.redirectErrorStream(true);
        compileBuilder.directory(tempDir.toFile());

        Process compileProcess = compileBuilder.start();

        try {
            int exitCode = compileProcess.waitFor();
            if (exitCode != 0) {
                // Compilation failed - return the compile process so user sees the error
                log.error("Java compilation failed with exit code: {}", exitCode);
                return compileProcess;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Compilation interrupted", e);
        }

        log.info("Compilation successful, running class: {}", className);

        // Step 2: Run the compiled class
        List<String> runCommand = new ArrayList<>();
        runCommand.add(javaExecutable);
        runCommand.add("-cp");
        runCommand.add(tempDir.toString());
        runCommand.add(className);
        runCommand.addAll(arguments);

        ProcessBuilder runBuilder = new ProcessBuilder(runCommand);
        runBuilder.redirectErrorStream(true);
        runBuilder.directory(tempDir.toFile());

        Process process = runBuilder.start();
        log.info("Java {} process started for class: {}", version, className);

        return process;
    }

    /**
     * Run directly with --source flag (for Java 11+)
     */
    private Process executeWithSourceFlag(String javaExecutable, Path javaFilePath,
                                         List<String> arguments, String version,
                                         int versionNumber) throws IOException {
        List<String> command = new ArrayList<>();
        command.add(javaExecutable);

        // Only add preview features for Java 21+
        if (versionNumber >= 21) {
            command.add("--enable-preview");
        }

        command.add("--source");
        command.add(version);
        command.add(javaFilePath.toString());
        command.addAll(arguments);

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        processBuilder.directory(NotJSUtils.getTempDirectory().toFile());

        Process process = processBuilder.start();
        log.info("Java {} process started for file: {}", version, javaFilePath);

        return process;
    }

    @Override
    public String getLanguage() {
        return "java";
    }

    @Override
    public List<String> getAvailableVersions() {
        return AVAILABLE_VERSIONS;
    }

    @Override
    public String getDefaultVersion() {
        return DEFAULT_VERSION;
    }

    /**
     * Extracts the class name from Java source code.
     * Looks for "public class ClassName" or "class ClassName" pattern.
     * Falls back to "Main" if no class is found.
     *
     * @param srcCode the Java source code
     * @return the extracted class name or "Main" as default
     */
    private String extractClassName(String srcCode) {
        // Look for public class declaration
        int publicClassIndex = srcCode.indexOf("public class ");
        if (publicClassIndex != -1) {
            return extractClassNameFromIndex(srcCode, publicClassIndex + "public class ".length());
        }

        // Look for class declaration (non-public)
        int classIndex = srcCode.indexOf("class ");
        if (classIndex != -1) {
            return extractClassNameFromIndex(srcCode, classIndex + "class ".length());
        }

        // Default fallback for Java 21+ unnamed classes or void main()
        return "Main";
    }

    private String extractClassNameFromIndex(String srcCode, int startIndex) {
        StringBuilder className = new StringBuilder();
        for (int i = startIndex; i < srcCode.length(); i++) {
            char c = srcCode.charAt(i);
            if (Character.isWhitespace(c) || c == '{' || c == '<') {
                break;
            }
            className.append(c);
        }
        return className.toString().trim();
    }

    /**
     * Replaces the class name in Java source code.
     * Handles both "public class OldName" and "class OldName" patterns.
     *
     * @param srcCode the original source code
     * @param oldClassName the class name to replace
     * @param newClassName the new class name
     * @return the modified source code with replaced class name
     */
    private String replaceClassName(String srcCode, String oldClassName, String newClassName) {
        // Replace "public class OldName" with "public class NewName"
        String modified = srcCode.replaceAll(
            "\\bpublic\\s+class\\s+" + oldClassName + "\\b",
            "public class " + newClassName
        );

        // Replace "class OldName" (non-public) with "class NewName"
        modified = modified.replaceAll(
            "\\bclass\\s+" + oldClassName + "\\b",
            "class " + newClassName
        );

        return modified;
    }
}