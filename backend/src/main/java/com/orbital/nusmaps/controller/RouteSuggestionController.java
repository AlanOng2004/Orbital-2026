package com.orbital.nusmaps.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbital.nusmaps.dto.RouteSuggestionResponse;
import com.orbital.nusmaps.model.RouteSuggestion;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.RouteSuggestionRepository;
import com.orbital.nusmaps.repository.UserRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/annotator/suggestions")
public class RouteSuggestionController {
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final RouteSuggestionRepository routeSuggestionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public RouteSuggestionController(
        RouteSuggestionRepository routeSuggestionRepository,
        UserRepository userRepository,
        ObjectMapper objectMapper
    ) {
        this.routeSuggestionRepository = routeSuggestionRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public RouteSuggestionResponse submitSuggestion(
        @RequestParam String title,
        @RequestParam String description,
        @RequestPart("file") MultipartFile file,
        Authentication authentication
    ) {
        String normalizedTitle = requireText(title, "Title", 160);
        String normalizedDescription = requireText(description, "Description", 4000);
        validateFile(file);
        String fileContent = readAndValidateJson(file);

        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new IllegalArgumentException("User not found."));

        RouteSuggestion suggestion = new RouteSuggestion();
        suggestion.setTitle(normalizedTitle);
        suggestion.setDescription(normalizedDescription);
        suggestion.setOriginalFileName(normalizeFileName(file.getOriginalFilename()));
        suggestion.setContentType(
            file.getContentType() == null || file.getContentType().isBlank()
                ? MediaType.APPLICATION_JSON_VALUE
                : file.getContentType()
        );
        suggestion.setFileContent(fileContent);
        suggestion.setSubmittedBy(user);
        suggestion.setCreatedAt(LocalDateTime.now());

        return toResponse(routeSuggestionRepository.save(suggestion));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RouteSuggestionResponse> getSuggestions() {
        return routeSuggestionRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @GetMapping("/{suggestionId}/file")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadSuggestion(@PathVariable Long suggestionId) {
        RouteSuggestion suggestion = routeSuggestionRepository.findById(suggestionId)
            .orElseThrow(() -> new IllegalArgumentException("Suggested route not found."));
        byte[] content = suggestion.getFileContent().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setContentDisposition(
            ContentDisposition.attachment()
                .filename(suggestion.getOriginalFileName(), StandardCharsets.UTF_8)
                .build()
        );
        return ResponseEntity.ok()
            .headers(headers)
            .contentLength(content.length)
            .body(content);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A JSON import file is required.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("The JSON import file must be 5 MB or smaller.");
        }
        String fileName = normalizeFileName(file.getOriginalFilename());
        if (!fileName.toLowerCase().endsWith(".json")) {
            throw new IllegalArgumentException("The suggested import must be a JSON file.");
        }
    }

    private String readAndValidateJson(MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            objectMapper.readTree(content);
            return content;
        } catch (IOException ex) {
            throw new IllegalArgumentException("The selected file does not contain valid JSON.");
        }
    }

    private String requireText(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " must be " + maxLength + " characters or fewer.");
        }
        return normalized;
    }

    private String normalizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "suggested-route.json";
        }
        String normalized = fileName.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        return lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
    }

    private RouteSuggestionResponse toResponse(RouteSuggestion suggestion) {
        return new RouteSuggestionResponse(
            suggestion.getSuggestionId(),
            suggestion.getTitle(),
            suggestion.getDescription(),
            suggestion.getOriginalFileName(),
            suggestion.getSubmittedBy().getUsername(),
            suggestion.getCreatedAt()
        );
    }
}
