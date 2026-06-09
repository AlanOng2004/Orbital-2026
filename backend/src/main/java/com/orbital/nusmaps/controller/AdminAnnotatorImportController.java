package com.orbital.nusmaps.controller;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.orbital.nusmaps.dto.AnnotatorImportRequest;
import com.orbital.nusmaps.dto.AnnotatorImportResponse;
import com.orbital.nusmaps.model.Edge;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.repository.EdgeRepository;
import com.orbital.nusmaps.repository.FloorplanRepository;
import com.orbital.nusmaps.repository.NodeRepository;

@RestController
@RequestMapping("/api/admin/annotator")
public class AdminAnnotatorImportController {

    private final NodeRepository nodeRepository;
    private final EdgeRepository edgeRepository;
    private final FloorplanRepository floorplanRepository;

    public AdminAnnotatorImportController(
        NodeRepository nodeRepository,
        EdgeRepository edgeRepository,
        FloorplanRepository floorplanRepository
    ) {
        this.nodeRepository = nodeRepository;
        this.edgeRepository = edgeRepository;
        this.floorplanRepository = floorplanRepository;
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AnnotatorImportResponse importAnnotatorGraph(@RequestBody AnnotatorImportRequest request) {
        /*
         * Import flow, intentionally kept readable:
         * 1. Receive already-calculated non-coordinate nodes and directed edges.
         * 2. Validate every floorplan ID and enum-like value before writing anything.
         * 3. Save nodes first because generated database IDs are needed by edges.
         * 4. Build temp annotator node ID -> saved database node ID/entity mappings.
         * 5. Save edges using the saved node entities.
         *
         * Coordinate nodes should not be sent here. The annotator uses them only to
         * calculate longitude/latitude before import.
         */
        if (request == null || request.getNodes() == null || request.getNodes().isEmpty()) {
            throw new IllegalArgumentException("At least one node is required for annotator import.");
        }

        List<AnnotatorImportRequest.AnnotatorEdgeImport> requestedEdges =
            request.getEdges() == null ? List.of() : request.getEdges();
        Map<Long, Floorplan> floorplanCache = new HashMap<>();
        Map<Long, Node> savedNodesByTempId = new HashMap<>();
        Map<Long, Long> savedIdsByTempId = new LinkedHashMap<>();

        for (AnnotatorImportRequest.AnnotatorNodeImport nodeRequest : request.getNodes()) {
            validateNodeRequest(nodeRequest, savedNodesByTempId);

            Floorplan floorplan = floorplanCache.computeIfAbsent(
                nodeRequest.getFloorplanId(),
                floorplanId -> floorplanRepository.findById(floorplanId)
                    .orElseThrow(() -> new IllegalArgumentException("Floorplan not found: " + floorplanId))
            );

            Node node = new Node();
            node.setNodeName(nodeRequest.getNodeName().trim());
            node.setDualName(blankToNull(nodeRequest.getDualName()));
            node.setNodeType(parseNodeType(nodeRequest.getNodeType()));
            node.setFloorplan(floorplan);
            node.setRoomPolygon(blankToNull(nodeRequest.getRoomPolygon()));
            node.setXCoordinate(nodeRequest.getXCoordinate());
            node.setYCoordinate(nodeRequest.getYCoordinate());
            node.setLongitude(nodeRequest.getLongitude());
            node.setLatitude(nodeRequest.getLatitude());

            Node savedNode = nodeRepository.save(node);
            savedNodesByTempId.put(nodeRequest.getTempId(), savedNode);
            savedIdsByTempId.put(nodeRequest.getTempId(), savedNode.getNodeId());
        }

        int importedEdges = 0;
        for (AnnotatorImportRequest.AnnotatorEdgeImport edgeRequest : requestedEdges) {
            Edge edge = buildEdge(edgeRequest, savedNodesByTempId);
            edgeRepository.save(edge);
            importedEdges++;
        }

        return new AnnotatorImportResponse(savedNodesByTempId.size(), importedEdges, savedIdsByTempId);
    }

    private void validateNodeRequest(
        AnnotatorImportRequest.AnnotatorNodeImport nodeRequest,
        Map<Long, Node> savedNodesByTempId
    ) {
        if (nodeRequest == null) {
            throw new IllegalArgumentException("Node entry cannot be null.");
        }
        if (nodeRequest.getTempId() == null) {
            throw new IllegalArgumentException("Node tempId is required.");
        }
        if (savedNodesByTempId.containsKey(nodeRequest.getTempId())) {
            throw new IllegalArgumentException("Duplicate node tempId: " + nodeRequest.getTempId());
        }
        if (nodeRequest.getNodeName() == null || nodeRequest.getNodeName().isBlank()) {
            throw new IllegalArgumentException("Node name is required for tempId: " + nodeRequest.getTempId());
        }
        if (nodeRequest.getFloorplanId() == null) {
            throw new IllegalArgumentException("Floorplan ID is required for tempId: " + nodeRequest.getTempId());
        }
        if (nodeRequest.getLongitude() == null || nodeRequest.getLatitude() == null) {
            throw new IllegalArgumentException("Longitude and latitude are required for tempId: " + nodeRequest.getTempId());
        }

        parseNodeType(nodeRequest.getNodeType());
    }

    private Edge buildEdge(
        AnnotatorImportRequest.AnnotatorEdgeImport edgeRequest,
        Map<Long, Node> savedNodesByTempId
    ) {
        if (edgeRequest == null) {
            throw new IllegalArgumentException("Edge entry cannot be null.");
        }

        Node source = savedNodesByTempId.get(edgeRequest.getSourceTempId());
        Node target = savedNodesByTempId.get(edgeRequest.getTargetTempId());
        if (source == null || target == null) {
            throw new IllegalArgumentException(
                "Edge references unknown temp node IDs: " +
                    edgeRequest.getSourceTempId() + " -> " + edgeRequest.getTargetTempId()
            );
        }
        if (edgeRequest.getWeight() == null || edgeRequest.getWeight() < 0) {
            throw new IllegalArgumentException("Edge weight must be zero or greater.");
        }

        Edge edge = new Edge();
        edge.setSource(source);
        edge.setTarget(target);
        edge.setWeight(edgeRequest.getWeight());
        edge.setBus(Boolean.TRUE.equals(edgeRequest.getIsBus()));
        edge.setSheltered(Boolean.TRUE.equals(edgeRequest.getIsSheltered()));
        edge.setKeycard(Boolean.TRUE.equals(edgeRequest.getIsKeycard()));
        edge.setStair(Boolean.TRUE.equals(edgeRequest.getIsStair()));
        edge.setRamp(Boolean.TRUE.equals(edgeRequest.getIsRamp()));
        edge.setElevator(Boolean.TRUE.equals(edgeRequest.getIsElevator()));
        return edge;
    }

    private Node.NodeType parseNodeType(String nodeType) {
        if (nodeType == null || nodeType.isBlank()) {
            throw new IllegalArgumentException("Node type is required.");
        }

        try {
            return Node.NodeType.valueOf(nodeType.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid node type: " + nodeType);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
