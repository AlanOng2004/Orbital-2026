package com.orbital.nusmaps.dto;

import java.time.LocalDateTime;

public record RouteSuggestionResponse(
        Long suggestionId,
        String title,
        String description,
        String fileName,
        String submittedBy,
        LocalDateTime createdAt
) {}
