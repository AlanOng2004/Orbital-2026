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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
    private static final double PIXELS_PER_MINUTE = 90.0;
    // Keep this aligned with the frontend scale marker so indoor route steps read naturally.
    private static final double PIXELS_PER_METER = 1.42;
    private static final double TURN_THRESHOLD_DEGREES = 30.0;

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

    @GetMapping("/nodes/search")
    public List<RouteNodeOptionResponse> searchRouteNodes(
            @RequestParam String query,
            @RequestParam(required = false) String buildingQuery
    ) {
        String trimmedQuery = query == null ? "" : query.trim();
        if (trimmedQuery.length() < 2) {
            return List.of();
        }

        String trimmedBuildingQuery = buildingQuery == null || buildingQuery.isBlank()
                ? null
                : buildingQuery.trim();

        return nodeRepository.searchRouteNodes(trimmedQuery, trimmedBuildingQuery).stream()
                .filter(this::isSearchableNode)
                .sorted((left, right) -> compareSearchPriority(left, right, trimmedQuery))
                .limit(12)
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

        SameBuildingRouteResponse.RouteResponse route = buildRoute(source, target);
        if (route == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No route found between the selected nodes.");
        }

        return new SameBuildingRouteResponse(
                source.getFloorplan().getBuilding().getBuildingName(),
                source.getNodeId(),
                target.getNodeId(),
                route
        );
    }

    private SameBuildingRouteResponse.RouteResponse buildRoute(Node source, Node target) {
        Map<Edge.EdgeTag, DoubleUnaryOperator> perms = Map.of();
        List<Edge> path = ssspService.SSSP(source, target, perms);
        if (path.isEmpty() && !Objects.equals(source.getNodeId(), target.getNodeId())) {
            return null;
        }

        List<Node> pathNodes = buildPathNodes(source, path);
        double totalWeight = ssspService.calculatePathWeight(path, perms);
        double estimatedTimeMinutes = roundToOneDecimal(Math.max(0.5, totalWeight / PIXELS_PER_MINUTE));
        List<SameBuildingRouteResponse.RouteInstructionResponse> instructions =
                buildRouteInstructions(pathNodes, path);

        return new SameBuildingRouteResponse.RouteResponse(
                "Indoor route",
                estimatedTimeMinutes,
                roundToOneDecimal(totalWeight),
                pathNodes.stream().map(this::toPathNode).toList(),
                instructions
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

    private List<SameBuildingRouteResponse.RouteInstructionResponse> buildRouteInstructions(
            List<Node> pathNodes,
            List<Edge> path
    ) {
        if (pathNodes.isEmpty()) {
            return List.of();
        }

        Node source = pathNodes.get(0);
        Node target = pathNodes.get(pathNodes.size() - 1);
        if (pathNodes.size() == 1) {
            return List.of(new SameBuildingRouteResponse.RouteInstructionResponse(
                    "You are already at " + source.getNodeName(),
                    null
            ));
        }

        List<SameBuildingRouteResponse.RouteInstructionResponse> instructions = new ArrayList<>();
        instructions.add(new SameBuildingRouteResponse.RouteInstructionResponse(
                source.getNodeType() == Node.NodeType.Room
                        ? "Exit " + source.getNodeName()
                        : "Start at " + source.getNodeName(),
                null
        ));

        double pendingWalkMeters = 0.0;
        for (int index = 0; index < path.size(); index++) {
            Edge edge = path.get(index);
            pendingWalkMeters += toMeters(edge.getWeight());

            Node current = pathNodes.get(index + 1);
            boolean isLastEdge = index == path.size() - 1;
            if (isLastEdge) {
                continue;
            }

            Node next = pathNodes.get(index + 2);
            if (isVerticalTransition(edge, current, next)) {
                pendingWalkMeters = flushWalkInstruction(instructions, pendingWalkMeters);
                instructions.add(new SameBuildingRouteResponse.RouteInstructionResponse(
                        buildVerticalInstruction(edge, current, next),
                        null
                ));
                continue;
            }

            TurnDirection turn = getTurnDirection(pathNodes.get(index), current, next);
            if (turn != TurnDirection.STRAIGHT) {
                pendingWalkMeters = flushWalkInstruction(instructions, pendingWalkMeters);
                instructions.add(new SameBuildingRouteResponse.RouteInstructionResponse(
                        buildTurnInstruction(turn, next),
                        null
                ));
            }
        }

        flushWalkInstruction(instructions, pendingWalkMeters);
        instructions.add(new SameBuildingRouteResponse.RouteInstructionResponse(
                "Enter " + target.getNodeName(),
                null
        ));
        return instructions;
    }

    private double flushWalkInstruction(
            List<SameBuildingRouteResponse.RouteInstructionResponse> instructions,
            double pendingWalkMeters
    ) {
        int roundedDistance = (int) Math.round(pendingWalkMeters);
        if (roundedDistance > 0) {
            instructions.add(new SameBuildingRouteResponse.RouteInstructionResponse(
                    "Walk " + roundedDistance + " metres",
                    roundedDistance
            ));
        }
        return 0.0;
    }

    private double toMeters(Double weight) {
        if (weight == null) {
            return 0.0;
        }
        return weight / PIXELS_PER_METER;
    }

    private boolean isVerticalTransition(Edge edge, Node current, Node next) {
        if (edge == null || current == null || next == null) {
            return false;
        }
        return !Objects.equals(current.getFloorplan().getLevel(), next.getFloorplan().getLevel())
                || Boolean.TRUE.equals(edge.isStair())
                || Boolean.TRUE.equals(edge.isRamp())
                || Boolean.TRUE.equals(edge.isElevator())
                || current.getNodeType() == Node.NodeType.Stair;
    }

    private String buildVerticalInstruction(Edge edge, Node current, Node next) {
        String destinationFloor = formatFloorLabel(next.getFloorplan().getLevel());
        if (Boolean.TRUE.equals(edge.isElevator())) {
            return "Take the elevator to " + destinationFloor;
        }
        if (Boolean.TRUE.equals(edge.isRamp())) {
            return "Follow the ramp to " + destinationFloor;
        }
        return "Take the stairs to " + destinationFloor;
    }

    private String buildTurnInstruction(TurnDirection turn, Node next) {
        String destination = next.getNodeType() == Node.NodeType.Room
                ? next.getNodeName()
                : "the aisle";
        return switch (turn) {
            case LEFT -> "Turn left toward " + destination;
            case RIGHT -> "Turn right toward " + destination;
            case U_TURN -> "Make a U-turn";
            case STRAIGHT -> "Continue straight";
        };
    }

    private TurnDirection getTurnDirection(Node previous, Node current, Node next) {
        if (previous == null || current == null || next == null) {
            return TurnDirection.STRAIGHT;
        }

        Double prevX = previous.getXCoordinate();
        Double prevY = previous.getYCoordinate();
        Double currentX = current.getXCoordinate();
        Double currentY = current.getYCoordinate();
        Double nextX = next.getXCoordinate();
        Double nextY = next.getYCoordinate();
        if (prevX == null || prevY == null || currentX == null || currentY == null || nextX == null || nextY == null) {
            return TurnDirection.STRAIGHT;
        }

        double vectorAX = currentX - prevX;
        double vectorAY = currentY - prevY;
        double vectorBX = nextX - currentX;
        double vectorBY = nextY - currentY;

        double magnitudeA = Math.hypot(vectorAX, vectorAY);
        double magnitudeB = Math.hypot(vectorBX, vectorBY);
        if (magnitudeA == 0.0 || magnitudeB == 0.0) {
            return TurnDirection.STRAIGHT;
        }

        double dot = vectorAX * vectorBX + vectorAY * vectorBY;
        double cosine = Math.max(-1.0, Math.min(1.0, dot / (magnitudeA * magnitudeB)));
        double angle = Math.toDegrees(Math.acos(cosine));
        if (angle < TURN_THRESHOLD_DEGREES) {
            return TurnDirection.STRAIGHT;
        }
        if (angle > 150.0) {
            return TurnDirection.U_TURN;
        }

        double cross = vectorAX * vectorBY - vectorAY * vectorBX;
        return cross > 0 ? TurnDirection.LEFT : TurnDirection.RIGHT;
    }

    private RouteNodeOptionResponse toRouteNodeOption(Node node) {
        return new RouteNodeOptionResponse(
                node.getNodeId(),
                node.getNodeName(),
                node.getDualName(),
                node.getFloorplan().getBuilding().getBuildingName(),
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

    private int compareSearchPriority(Node left, Node right, String query) {
        String normalizedQuery = query.toLowerCase();
        int leftScore = getSearchScore(left, normalizedQuery);
        int rightScore = getSearchScore(right, normalizedQuery);
        if (leftScore != rightScore) {
            return Integer.compare(leftScore, rightScore);
        }

        boolean leftIsRoom = left.getNodeType() == Node.NodeType.Room;
        boolean rightIsRoom = right.getNodeType() == Node.NodeType.Room;
        if (leftIsRoom != rightIsRoom) {
            return leftIsRoom ? -1 : 1;
        }

        return left.getNodeName().compareToIgnoreCase(right.getNodeName());
    }

    private int getSearchScore(Node node, String normalizedQuery) {
        List<String> candidates = new ArrayList<>();
        candidates.add(node.getNodeName());
        candidates.add(node.getDualName());
        for (NodeAlias alias : node.getAliases()) {
            candidates.add(alias.getNodeAlias());
        }

        int bestScore = 3;
        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }

            String normalizedCandidate = candidate.toLowerCase();
            if (normalizedCandidate.equals(normalizedQuery)) {
                bestScore = Math.min(bestScore, 0);
            } else if (normalizedCandidate.startsWith(normalizedQuery)) {
                bestScore = Math.min(bestScore, 1);
            } else if (normalizedCandidate.contains(normalizedQuery)) {
                bestScore = Math.min(bestScore, 2);
            }
        }
        return bestScore;
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

    private enum TurnDirection {
        LEFT,
        RIGHT,
        U_TURN,
        STRAIGHT
    }
}
