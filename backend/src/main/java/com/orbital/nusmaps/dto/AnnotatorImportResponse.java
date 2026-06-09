package com.orbital.nusmaps.dto;

import java.util.Map;

public class AnnotatorImportResponse {

    private final int importedNodes;
    private final int importedEdges;
    private final Map<Long, Long> nodeIdMap;

    public AnnotatorImportResponse(int importedNodes, int importedEdges, Map<Long, Long> nodeIdMap) {
        this.importedNodes = importedNodes;
        this.importedEdges = importedEdges;
        this.nodeIdMap = nodeIdMap;
    }

    public int getImportedNodes() {
        return importedNodes;
    }

    public int getImportedEdges() {
        return importedEdges;
    }

    public Map<Long, Long> getNodeIdMap() {
        return nodeIdMap;
    }
}
