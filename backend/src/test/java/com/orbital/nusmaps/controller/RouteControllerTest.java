package com.orbital.nusmaps.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.dto.RouteNodeOptionResponse;
import com.orbital.nusmaps.dto.SameBuildingRouteRequest;
import com.orbital.nusmaps.dto.SameBuildingRouteResponse;
import com.orbital.nusmaps.model.Building;
import com.orbital.nusmaps.model.Edge;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.repository.NodeRepository;
import com.orbital.nusmaps.service.SSSPService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.DoubleUnaryOperator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RouteControllerTest {

    @Mock
    private NodeRepository nodeRepository;

    @Mock
    private SSSPService ssspService;

    private RouteController routeController;

    @BeforeEach
    void setUp() {
        routeController = new RouteController(nodeRepository, ssspService);
    }

    @Test
    void getBuildingNodesFiltersOutNonSearchableNodes() {
        Building building = TestDataFactory.building(1L, "COM1");
        Floorplan floorplan = TestDataFactory.floorplan(2L, building, 1, "L1.png");
        Node room = TestDataFactory.node(10L, "Seminar Room", "SR1", Node.NodeType.Room, floorplan, 10, 20);
        room.addAlias(TestDataFactory.alias("Meeting Room"));
        Node corridor = TestDataFactory.node(11L, "Corridor", null, Node.NodeType.Corridor, floorplan, 11, 21);

        when(nodeRepository.findAllByBuildingQuery("COM1")).thenReturn(List.of(room, corridor));

        List<RouteNodeOptionResponse> results = routeController.getBuildingNodes("COM1");

        assertEquals(1, results.size());
        assertEquals("Seminar Room", results.get(0).label());
        assertEquals(List.of("Meeting Room"), results.get(0).aliases());
        assertEquals("COM1 L1 • Room", results.get(0).secondaryLabel());
    }

    @Test
    void searchRouteNodesReturnsEmptyWhenQueryTooShort() {
        assertTrue(routeController.searchRouteNodes("a", "COM1").isEmpty());
    }

    @Test
    void searchRouteNodesSortsExactAndRoomMatchesFirst() {
        Building building = TestDataFactory.building(1L, "COM1");
        Floorplan floorplan = TestDataFactory.floorplan(2L, building, 1, "L1.png");
        Node exactRoom = TestDataFactory.node(1L, "SR1", null, Node.NodeType.Room, floorplan, 1, 1);
        Node prefixToilet = TestDataFactory.node(2L, "SR1 Toilet", null, Node.NodeType.Toilet, floorplan, 2, 2);
        Node containsRoom = TestDataFactory.node(3L, "Open Space", "SR1 Lounge", Node.NodeType.Room, floorplan, 3, 3);

        when(nodeRepository.searchRouteNodes("SR1", "COM1")).thenReturn(List.of(containsRoom, prefixToilet, exactRoom));

        List<RouteNodeOptionResponse> results = routeController.searchRouteNodes("SR1", "COM1");

        assertEquals(List.of(1L, 3L, 2L), results.stream().map(RouteNodeOptionResponse::nodeId).toList());
    }

    @Test
    void getSameBuildingRoutesBuildsSortedRouteOptions() {
        Building building = TestDataFactory.building(1L, "COM1");
        Floorplan floorplan = TestDataFactory.floorplan(2L, building, 1, "L1.png");
        Node source = TestDataFactory.node(1L, "Entrance", null, Node.NodeType.Room, floorplan, 1, 1);
        Node target = TestDataFactory.node(2L, "Lab", null, Node.NodeType.Room, floorplan, 5, 5);

        Edge fastestEdge = TestDataFactory.edge(1L, source, target, 90);
        Edge shelteredEdge = TestDataFactory.edge(2L, source, target, 100);
        shelteredEdge.setSheltered(true);
        Edge accessibleEdge = TestDataFactory.edge(3L, source, target, 110);
        accessibleEdge.setElevator(true);

        when(nodeRepository.findRouteNodeById(1L)).thenReturn(Optional.of(source));
        when(nodeRepository.findRouteNodeById(2L)).thenReturn(Optional.of(target));
        when(ssspService.SSSP(org.mockito.ArgumentMatchers.eq(source), org.mockito.ArgumentMatchers.eq(target), anyMap()))
                .thenAnswer(invocation -> {
                    Map<Edge.EdgeTag, DoubleUnaryOperator> perms = invocation.getArgument(2);
                    if (perms.isEmpty()) {
                        return List.of(fastestEdge);
                    }
                    if (perms.containsKey(Edge.EdgeTag.Sheltered)) {
                        return List.of(shelteredEdge);
                    }
                    return List.of(accessibleEdge);
                });

        SameBuildingRouteResponse response =
                routeController.getSameBuildingRoutes(new SameBuildingRouteRequest(1L, 2L));

        assertEquals("COM1", response.buildingName());
        assertEquals(List.of("Fastest", "Sheltered", "Accessible"),
                response.routes().stream().map(SameBuildingRouteResponse.RouteOptionResponse::label).toList());
        assertEquals(2, response.routes().get(0).pathNodes().size());
        assertEquals(1.0, response.routes().get(0).estimatedTimeMinutes());
    }

    @Test
    void getSameBuildingRoutesRejectsDifferentBuildings() {
        Building sourceBuilding = TestDataFactory.building(1L, "COM1");
        Building targetBuilding = TestDataFactory.building(2L, "COM2");
        Node source = TestDataFactory.node(1L, "Entrance", null, Node.NodeType.Room,
                TestDataFactory.floorplan(1L, sourceBuilding, 1, "L1.png"), 1, 1);
        Node target = TestDataFactory.node(2L, "Lab", null, Node.NodeType.Room,
                TestDataFactory.floorplan(2L, targetBuilding, 1, "L1.png"), 5, 5);
        when(nodeRepository.findRouteNodeById(1L)).thenReturn(Optional.of(source));
        when(nodeRepository.findRouteNodeById(2L)).thenReturn(Optional.of(target));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> routeController.getSameBuildingRoutes(new SameBuildingRouteRequest(1L, 2L))
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Only same-building routing is supported right now.", ex.getReason());
    }
}
