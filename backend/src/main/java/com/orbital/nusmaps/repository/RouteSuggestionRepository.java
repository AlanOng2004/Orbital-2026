package com.orbital.nusmaps.repository;

import com.orbital.nusmaps.model.RouteSuggestion;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteSuggestionRepository extends JpaRepository<RouteSuggestion, Long> {
    @EntityGraph(attributePaths = "submittedBy")
    List<RouteSuggestion> findAllByOrderByCreatedAtDesc();
}
