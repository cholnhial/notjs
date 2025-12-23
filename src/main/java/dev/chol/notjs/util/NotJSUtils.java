package dev.chol.notjs.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Slf4j
public class NotJSUtils {

    private static final String TEMP_DIR = "/tmp/notjs";

    /**
     * Creates a temporary file with the given source code.
     * Uses a random prefix to avoid file name conflicts.
     *
     * @param fileName the name of the file (including extension)
     * @param srcCode the source code to write to the file
     * @return the path to the created temporary file
     * @throws IOException if an I/O error occurs during file creation
     */
    public static Path createTempFile(String fileName, String srcCode) throws IOException {
        // Create temp directory if it doesn't exist
        Path tempDir = Path.of(TEMP_DIR);
        Files.createDirectories(tempDir);

        // Generate random prefix to avoid conflicts
        String randomPrefix = RandomStringUtils.randomAlphanumeric(8);
        String randomFileName = randomPrefix + "_" + fileName;

        // Create the file path
        Path filePath = tempDir.resolve(randomFileName);

        // Write source code to the file
        Files.writeString(filePath, srcCode, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.debug("Source code written to temporary file: {}", filePath);

        return filePath;
    }

    /**
     * Generates a random executable name for compiled programs.
     *
     * @param baseName the base name for the executable
     * @return a unique executable name
     */
    public static String generateRandomExecutableName(String baseName) {
        String randomSuffix = RandomStringUtils.randomAlphanumeric(8);
        return baseName + "_" + randomSuffix;
    }

    /**
     * Gets the temporary directory path used by NotJS.
     *
     * @return the temporary directory path
     */
    public static Path getTempDirectory() {
        return Path.of(TEMP_DIR);
    }

    /**
     * Ensures the temporary directory exists.
     *
     * @throws IOException if an I/O error occurs during directory creation
     */
    public static void ensureTempDirectoryExists() throws IOException {
        Path tempDir = Path.of(TEMP_DIR);
        Files.createDirectories(tempDir);
        log.debug("Temporary directory ensured: {}", tempDir);
    }
}