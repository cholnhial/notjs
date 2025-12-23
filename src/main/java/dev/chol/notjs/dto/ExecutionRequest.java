package dev.chol.notjs.dto;

import java.util.List;

public record ExecutionRequest(
    String language,
    String code,
    String version,
    List<String> arguments
) {
    public ExecutionRequest {
        // Null-safe initialization for arguments
        if (arguments == null) {
            arguments = List.of();
        }
    }
}