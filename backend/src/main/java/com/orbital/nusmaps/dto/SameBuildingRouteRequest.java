package com.orbital.nusmaps.dto;

public record SameBuildingRouteRequest(
        Long sourceNodeId,
        Long targetNodeId
) {}
