package com.orbital.nusmaps.dto;

public record AnnotatorFloorplanResponse(
    Long floorplanId,
    String buildingName,
    Integer level,
    String imageUrl
) {
}
