package com.orbital.nusmaps.dto;

import java.util.List;

public record SameBuildingRouteResponse(
        String buildingName,
        Long sourceNodeId,
        Long targetNodeId,
        RouteResponse route
) {
    public record RouteResponse(
            String label,
            double estimatedTimeMinutes,
            double totalWeight,
            List<RoutePathNodeResponse> pathNodes,
            List<RouteInstructionResponse> instructions
    ) {}

    public record RoutePathNodeResponse(
            Long nodeId,
            String label,
            String nodeType,
            Integer floorLevel,
            String floorImageUrl,
            Double x,
            Double y
    ) {}

    public record RouteInstructionResponse(
            String instruction,
            Integer distanceMeters
    ) {}
}
