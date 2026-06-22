package com.orbital.nusmaps.dto;

import java.util.List;

public record RouteNodeOptionResponse(
        Long nodeId,
        String label,
        String dualLabel,
        String buildingName,
        String secondaryLabel,
        String nodeType,
        Integer floorLevel,
        String floorImageUrl,
        Double x,
        Double y,
        List<String> aliases
) {}
