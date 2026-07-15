package com.orbital.nusmaps.dto;

import java.util.List;

public record SearchResultResponse(
        SearchResultType type,
        Long id,
        String label,
        String dualLabel,
        String secondaryLabel,
        String matchSource,
        Long facultyId,
        Long buildingId,
        Long nodeId,
        Integer floorLevel,
        String floorImageUrl,
        Double x,
        Double y,
        String polygon,
        List<String> aliases
) {
    public enum SearchResultType {
        FACULTY,
        BUILDING,
        NODE
    }
}
