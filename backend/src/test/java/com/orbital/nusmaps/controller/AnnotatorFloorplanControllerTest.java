package com.orbital.nusmaps.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.dto.AnnotatorFloorplanResponse;
import com.orbital.nusmaps.model.Building;
import com.orbital.nusmaps.repository.FloorplanRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnnotatorFloorplanControllerTest {

    @Mock
    private FloorplanRepository floorplanRepository;

    private AnnotatorFloorplanController controller;

    @BeforeEach
    void setUp() {
        controller = new AnnotatorFloorplanController(floorplanRepository);
    }

    @Test
    void returnsFloorplansWithBuildingAndImageDetails() {
        Building building = TestDataFactory.building(5L, "COM1");
        when(floorplanRepository.findAllByOrderByBuildingBuildingNameAscLevelAsc())
            .thenReturn(List.of(
                TestDataFactory.floorplan(10L, building, 1, "/img/COMBLK1_01.jpg"),
                TestDataFactory.floorplan(11L, building, 2, "/img/COMBLK1_02.jpg")
            ));

        List<AnnotatorFloorplanResponse> response = controller.getFloorplans();

        assertEquals(2, response.size());
        assertEquals("COM1", response.get(0).buildingName());
        assertEquals(1, response.get(0).level());
        assertEquals("/img/COMBLK1_02.jpg", response.get(1).imageUrl());
    }
}
