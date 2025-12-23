package dev.chol.notjs.handler;

import dev.chol.notjs.dto.ExecutionRequest;
import dev.chol.notjs.service.NotJSExecutor;
import dev.chol.notjs.service.ExecutorFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.json.JsonMapper;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class TerminalWebSocketHandler extends TextWebSocketHandler {

    private final ExecutorFactory executorFactory;


    private final Map<String, Process> sessionProcessMap = new ConcurrentHashMap<>();
    private final Map<String, BufferedWriter> sessionWriterMap = new ConcurrentHashMap<>();
    private final Map<String, Boolean> sessionInitializedMap = new ConcurrentHashMap<>();
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {} - waiting for execution request", session.getId());
        sessionInitializedMap.put(session.getId(), false);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = session.getId();
        Boolean isInitialized = sessionInitializedMap.get(sessionId);

        // First message should be the execution request
        if (isInitialized == null || !isInitialized) {
            handleExecutionRequest(session, message);
            return;
        }

        // Subsequent messages are stdin input for the running process
        BufferedWriter writer = sessionWriterMap.get(sessionId);
        if (writer != null) {
            try {
                String payload = message.getPayload();
                writer.write(payload);
                writer.flush();
                log.debug("Sent input to process: {}", payload);
            } catch (IOException e) {
                log.error("Error writing to process stdin for session: {}", sessionId, e);
                session.sendMessage(new TextMessage("Error writing to process: " + e.getMessage() + "\r\n"));
            }
        }
    }

    private void handleExecutionRequest(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = session.getId();

        try {
            // Parse the execution request
            ExecutionRequest request = jsonMapper.readValue(message.getPayload(), ExecutionRequest.class);
            log.info("Received execution request for session {}: language={}, version={}, argsCount={}",
                    sessionId, request.language(), request.version(), request.arguments().size());

            // Validate language support
            if (!executorFactory.isSupported(request.language())) {
                String supportedLangs = String.join(", ", executorFactory.getSupportedLanguages());
                throw new UnsupportedOperationException(
                    "Language '" + request.language() + "' is not supported. Supported languages: " + supportedLangs
                );
            }

            // Get the appropriate executor using strategy pattern
            NotJSExecutor executor = executorFactory.getExecutor(request.language());

            // Validate version if specified
            String version = request.version();
            if (version != null && !version.isBlank() && !executor.getAvailableVersions().contains(version)) {
                throw new IllegalArgumentException(
                    "Unsupported version '" + version + "' for language '" + request.language() +
                    "'. Available versions: " + executor.getAvailableVersions()
                );
            }

            // Execute the code with the specified or default version
            Process process = executor.execute(request.code(), version, request.arguments());
            sessionProcessMap.put(sessionId, process);

            // Set up process I/O streams
            BufferedWriter processWriter = new BufferedWriter(
                new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)
            );
            sessionWriterMap.put(sessionId, processWriter);

            // Start reading process output
            startOutputReader(session, process);

            // Mark session as initialized
            sessionInitializedMap.put(sessionId, true);

            log.info("Process started successfully for session: {}", sessionId);

        } catch (Exception e) {
            log.error("Error processing execution request for session: {}", sessionId, e);
            session.sendMessage(new TextMessage("Error: " + e.getMessage() + "\r\n"));
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("WebSocket connection closed: {} with status: {}", session.getId(), status);
        cleanupSession(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error for session: {}", session.getId(), exception);
        cleanupSession(session.getId());
    }

    private void startOutputReader(WebSocketSession session, Process process) {
        Thread outputThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {

                char[] buffer = new char[1024];
                int bytesRead;

                while ((bytesRead = reader.read(buffer)) != -1 && session.isOpen()) {
                    String output = new String(buffer, 0, bytesRead);
                    session.sendMessage(new TextMessage(output));
                    log.debug("Sent output to client: {}", output);
                }

            } catch (IOException e) {
                if (session.isOpen()) {
                    log.error("Error reading process output for session: {}", session.getId(), e);
                    try {
                        session.sendMessage(new TextMessage("Error reading process output: " + e.getMessage() + "\r\n"));
                    } catch (IOException ex) {
                        log.error("Error sending error message to client", ex);
                    }
                }
            } finally {
                if (session.isOpen()) {
                    try {
                        session.close(CloseStatus.NORMAL);
                    } catch (IOException e) {
                        log.error("Error closing session", e);
                    }
                }
                cleanupSession(session.getId());
            }
        });

        outputThread.setName("output-reader-" + session.getId());
        outputThread.setDaemon(true);
        outputThread.start();
    }

    private void cleanupSession(String sessionId) {
        Process process = sessionProcessMap.remove(sessionId);
        if (process != null && process.isAlive()) {
            log.info("Destroying process for session: {}", sessionId);
            process.destroy();
            try {
                process.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                process.destroyForcibly();
            }
        }

        BufferedWriter writer = sessionWriterMap.remove(sessionId);
        if (writer != null) {
            try {
                writer.close();
            } catch (IOException e) {
                log.error("Error closing process writer", e);
            }
        }

        sessionInitializedMap.remove(sessionId);
    }
}