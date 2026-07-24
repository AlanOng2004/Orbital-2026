package com.orbital.nusmaps.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.dto.RouteSuggestionResponse;
import com.orbital.nusmaps.model.RouteSuggestion;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.RouteSuggestionRepository;
import com.orbital.nusmaps.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.TestingAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class RouteSuggestionControllerTest {

    @Mock
    private RouteSuggestionRepository routeSuggestionRepository;

    @Mock
    private UserRepository userRepository;

    private RouteSuggestionController controller;

    @BeforeEach
    void setUp() {
        controller = new RouteSuggestionController(
            routeSuggestionRepository,
            userRepository,
            new ObjectMapper()
        );
    }

    @Test
    void submitSuggestionStoresMetadataAndJsonForSignedInUser() {
        User user = TestDataFactory.user(4L, "alice", "encoded", false);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(routeSuggestionRepository.save(any(RouteSuggestion.class))).thenAnswer(invocation -> {
            RouteSuggestion suggestion = invocation.getArgument(0);
            suggestion.setSuggestionId(12L);
            return suggestion;
        });
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "com1-route.json",
            "application/json",
            "{\"nodes\":[],\"edges\":[]}".getBytes()
        );

        RouteSuggestionResponse response = controller.submitSuggestion(
            "  Add COM1 link  ",
            "  Connect the lobby to the lift.  ",
            file,
            new TestingAuthenticationToken("alice", null)
        );

        ArgumentCaptor<RouteSuggestion> suggestionCaptor = ArgumentCaptor.forClass(RouteSuggestion.class);
        verify(routeSuggestionRepository).save(suggestionCaptor.capture());
        RouteSuggestion saved = suggestionCaptor.getValue();
        assertEquals("Add COM1 link", saved.getTitle());
        assertEquals("Connect the lobby to the lift.", saved.getDescription());
        assertEquals("com1-route.json", saved.getOriginalFileName());
        assertEquals("alice", saved.getSubmittedBy().getUsername());
        assertEquals(12L, response.suggestionId());
    }

    @Test
    void submitSuggestionRejectsInvalidJson() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "broken.json",
            "application/json",
            "not json".getBytes()
        );

        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> controller.submitSuggestion(
                "Broken route",
                "This should not be stored.",
                file,
                new TestingAuthenticationToken("alice", null)
            )
        );

        assertEquals("The selected file does not contain valid JSON.", ex.getMessage());
    }

    @Test
    void getSuggestionsReturnsNewestFirstRepositoryResults() {
        User user = TestDataFactory.user(1L, "admin1", "encoded", true);
        RouteSuggestion suggestion = new RouteSuggestion();
        suggestion.setSuggestionId(9L);
        suggestion.setTitle("New covered path");
        suggestion.setDescription("Add the sheltered connector.");
        suggestion.setOriginalFileName("covered-path.json");
        suggestion.setContentType("application/json");
        suggestion.setFileContent("{}");
        suggestion.setSubmittedBy(user);
        suggestion.setCreatedAt(LocalDateTime.of(2026, 7, 25, 1, 0));
        when(routeSuggestionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(suggestion));

        List<RouteSuggestionResponse> response = controller.getSuggestions();

        assertEquals(1, response.size());
        assertEquals("New covered path", response.get(0).title());
        assertEquals("admin1", response.get(0).submittedBy());
    }
}
