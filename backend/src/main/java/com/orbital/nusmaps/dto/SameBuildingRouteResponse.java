package com.orbital.nusmaps.dto;

import java.util.List;

public record SameBuildingRouteResponse(
        String buildingName,
        Long sourceNodeId,
        Long targetNodeId,
        List<RouteOptionResponse> routes
) {
    public record RouteOptionResponse(
            String routeId,
            String label,
            double estimatedTimeMinutes,
            double totalWeight,
            List<RoutePathNodeResponse> pathNodes
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
}
