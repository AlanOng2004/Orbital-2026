package com.orbital.nusmaps.controller;

import com.orbital.nusmaps.dto.RouteNodeOptionResponse;
import com.orbital.nusmaps.dto.SameBuildingRouteRequest;
import com.orbital.nusmaps.dto.SameBuildingRouteResponse;
import com.orbital.nusmaps.model.Edge;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.NodeAlias;
import com.orbital.nusmaps.repository.NodeRepository;
import com.orbital.nusmaps.service.SSSPService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.DoubleUnaryOperator;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
    private static final double PIXELS_PER_MINUTE = 90.0;

    private final NodeRepository nodeRepository;
    private final SSSPService ssspService;

    public RouteController(NodeRepository nodeRepository, SSSPService ssspService) {
        this.nodeRepository = nodeRepository;
        this.ssspService = ssspService;
    }

    @GetMapping("/buildings/{buildingQuery}/nodes")
    public List<RouteNodeOptionResponse> getBuildingNodes(@PathVariable String buildingQuery) {
        return nodeRepository.findAllByBuildingQuery(buildingQuery).stream()
                .filter(this::isSearchableNode)
                .map(this::toRouteNodeOption)
                .toList();
    }

    @PostMapping("/same-building")
    public SameBuildingRouteResponse getSameBuildingRoutes(@RequestBody SameBuildingRouteRequest request) {
        if (request == null || request.sourceNodeId() == null || request.targetNodeId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "sourceNodeId and targetNodeId are required."
            );
        }

        Node source = nodeRepository.findRouteNodeById(request.sourceNodeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source node not found."));
        Node target = nodeRepository.findRouteNodeById(request.targetNodeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target node not found."));

        Long sourceBuildingId = getBuildingId(source);
        Long targetBuildingId = getBuildingId(target);
        if (sourceBuildingId == null || !sourceBuildingId.equals(targetBuildingId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only same-building routing is supported right now."
            );
        }

        List<SameBuildingRouteResponse.RouteOptionResponse> routes = buildRouteOptions(source, target);
        if (routes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No route found between the selected nodes.");
        }

        return new SameBuildingRouteResponse(
                source.getFloorplan().getBuilding().getBuildingName(),
                source.getNodeId(),
                target.getNodeId(),
                routes
        );
    }

    private List<SameBuildingRouteResponse.RouteOptionResponse> buildRouteOptions(Node source, Node target) {
        Map<String, Map<Edge.EdgeTag, DoubleUnaryOperator>> presets = new LinkedHashMap<>();
        presets.put("Fastest", Map.of());
        presets.put("Sheltered", Map.of(
                Edge.EdgeTag.Sheltered, dist -> dist * 0.45
        ));
        presets.put("Accessible", Map.of(
                Edge.EdgeTag.Stair, dist -> dist * 8.0,
                Edge.EdgeTag.Ramp, DoubleUnaryOperator.identity(),
                Edge.EdgeTag.Elevator, dist -> dist * 1.05
        ));

        return presets.entrySet().stream()
                .map(entry -> toRouteOption(entry.getKey(), source, target, entry.getValue()))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(SameBuildingRouteResponse.RouteOptionResponse::estimatedTimeMinutes))
                .toList();
    }

    private SameBuildingRouteResponse.RouteOptionResponse toRouteOption(
            String label,
            Node source,
            Node target,
            Map<Edge.EdgeTag, DoubleUnaryOperator> perms
    ) {
        List<Edge> path = ssspService.SSSP(source, target, perms);
        if (path.isEmpty() && !Objects.equals(source.getNodeId(), target.getNodeId())) {
            return null;
        }

        List<Node> pathNodes = buildPathNodes(source, path);
        double totalWeight = path.stream()
                .map(Edge::getWeight)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        double estimatedTimeMinutes = roundToOneDecimal(Math.max(0.5, totalWeight / PIXELS_PER_MINUTE));

        return new SameBuildingRouteResponse.RouteOptionResponse(
                label.toLowerCase().replace(' ', '-'),
                label,
                estimatedTimeMinutes,
                roundToOneDecimal(totalWeight),
                pathNodes.stream().map(this::toPathNode).toList()
        );
    }

    private List<Node> buildPathNodes(Node source, List<Edge> path) {
        List<Node> pathNodes = new ArrayList<>();
        pathNodes.add(source);
        for (Edge edge : path) {
            pathNodes.add(edge.getTarget());
        }
        return pathNodes;
    }

    private SameBuildingRouteResponse.RoutePathNodeResponse toPathNode(Node node) {
        return new SameBuildingRouteResponse.RoutePathNodeResponse(
                node.getNodeId(),
                node.getNodeName(),
                node.getNodeType().name(),
                node.getFloorplan().getLevel(),
                node.getFloorplan().getImageUrl(),
                node.getXCoordinate(),
                node.getYCoordinate()
        );
    }

    private RouteNodeOptionResponse toRouteNodeOption(Node node) {
        return new RouteNodeOptionResponse(
                node.getNodeId(),
                node.getNodeName(),
                node.getDualName(),
                formatSecondaryLabel(node),
                node.getNodeType().name(),
                node.getFloorplan().getLevel(),
                node.getFloorplan().getImageUrl(),
                node.getXCoordinate(),
                node.getYCoordinate(),
                node.getAliases().stream()
                        .map(NodeAlias::getNodeAlias)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        );
    }

    private boolean isSearchableNode(Node node) {
        return node != null
                && node.getNodeId() != null
                && node.getNodeName() != null
                && !node.getNodeName().isBlank()
                && node.getFloorplan() != null
                && node.getFloorplan().getBuilding() != null
                && node.getFloorplan().getLevel() != null
                && node.getXCoordinate() != null
                && node.getYCoordinate() != null
                && node.getNodeType() != Node.NodeType.Corridor
                && node.getNodeType() != Node.NodeType.Junction;
    }

    private String formatSecondaryLabel(Node node) {
        String buildingName = node.getFloorplan().getBuilding().getBuildingName();
        String floorLabel = formatFloorLabel(node.getFloorplan().getLevel());
        return buildingName + " " + floorLabel + " • " + node.getNodeType().name();
    }

    private String formatFloorLabel(Integer level) {
        if (level == null) {
            return "";
        }
        if (level == 0) {
            return "B1";
        }
        return "L" + level;
    }

    private Long getBuildingId(Node node) {
        if (node == null || node.getFloorplan() == null || node.getFloorplan().getBuilding() == null) {
            return null;
        }
        return node.getFloorplan().getBuilding().getBuildingId();
    }

    private double roundToOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
