package dev.chol.notjs.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class TerminalWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, Process> sessionProcessMap = new ConcurrentHashMap<>();
    private final Map<String, BufferedWriter> sessionWriterMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {}", session.getId());

        String currentUser = System.getProperty("user.name");
        log.info("Current user: {}", currentUser);

        try {
            String javaFilePath = "/app/src/main/resources/Hello.java";

            ProcessBuilder processBuilder = new ProcessBuilder("/root/.sdkman/candidates/java/current/bin/java", "--enable-preview", "--source", "25", javaFilePath);
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            sessionProcessMap.put(session.getId(), process);

            BufferedWriter processWriter = new BufferedWriter(
                new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)
            );
            sessionWriterMap.put(session.getId(), processWriter);

            startOutputReader(session, process);

            log.info("Java process started for session: {}", session.getId());

        } catch (Exception e) {
            log.error("Error starting process for session: {}", session.getId(), e);
            session.sendMessage(new TextMessage("Error starting process: " + e.getMessage() + "\r\n"));
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        BufferedWriter writer = sessionWriterMap.get(session.getId());

        if (writer != null) {
            try {
                String payload = message.getPayload();
                writer.write(payload);
                writer.flush();
                log.debug("Sent input to process: {}", payload);
            } catch (IOException e) {
                log.error("Error writing to process stdin for session: {}", session.getId(), e);
                session.sendMessage(new TextMessage("Error writing to process: " + e.getMessage() + "\r\n"));
            }
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
    }
}