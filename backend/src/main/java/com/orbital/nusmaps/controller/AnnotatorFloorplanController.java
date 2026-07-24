package com.orbital.nusmaps.controller;

import com.orbital.nusmaps.dto.AnnotatorFloorplanResponse;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.repository.FloorplanRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/annotator/floorplans")
public class AnnotatorFloorplanController {
    private final FloorplanRepository floorplanRepository;

    public AnnotatorFloorplanController(FloorplanRepository floorplanRepository) {
        this.floorplanRepository = floorplanRepository;
    }

    @GetMapping
    public List<AnnotatorFloorplanResponse> getFloorplans() {
        return floorplanRepository.findAllByOrderByBuildingBuildingNameAscLevelAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    private AnnotatorFloorplanResponse toResponse(Floorplan floorplan) {
        String buildingName = floorplan.getBuilding() == null
            ? "Unknown building"
            : floorplan.getBuilding().getBuildingName();

        return new AnnotatorFloorplanResponse(
            floorplan.getFloorplanId(),
            buildingName,
            floorplan.getLevel(),
            floorplan.getImageUrl()
        );
    }
}
