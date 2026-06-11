package com.orbital.nusmaps.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class AnnotatorImportRequest {

    private List<AnnotatorNodeImport> nodes;
    private List<AnnotatorEdgeImport> edges;

    public List<AnnotatorNodeImport> getNodes() {
        return nodes;
    }

    public void setNodes(List<AnnotatorNodeImport> nodes) {
        this.nodes = nodes;
    }

    public List<AnnotatorEdgeImport> getEdges() {
        return edges;
    }

    public void setEdges(List<AnnotatorEdgeImport> edges) {
        this.edges = edges;
    }

    public static class AnnotatorNodeImport {
        @JsonAlias({"temp_id", "id"})
        private Long tempId;
        @JsonAlias({"node_name", "name"})
        private String nodeName;
        @JsonAlias("dual_name")
        private String dualName;
        @JsonAlias({"node_type", "type"})
        private String nodeType;
        @JsonAlias("floorplan_id")
        private Long floorplanId;
        @JsonAlias("room_polygon")
        private String roomPolygon;
        @JsonProperty("xCoordinate")
        @JsonAlias({"x_coordinate", "x"})
        private Double xCoordinate;
        @JsonProperty("yCoordinate")
        @JsonAlias({"y_coordinate", "y"})
        private Double yCoordinate;
        private Double longitude;
        private Double latitude;

        public Long getTempId() {
            return tempId;
        }

        public void setTempId(Long tempId) {
            this.tempId = tempId;
        }

        public String getNodeName() {
            return nodeName;
        }

        public void setNodeName(String nodeName) {
            this.nodeName = nodeName;
        }

        public String getDualName() {
            return dualName;
        }

        public void setDualName(String dualName) {
            this.dualName = dualName;
        }

        public String getNodeType() {
            return nodeType;
        }

        public void setNodeType(String nodeType) {
            this.nodeType = nodeType;
        }

        public Long getFloorplanId() {
            return floorplanId;
        }

        public void setFloorplanId(Long floorplanId) {
            this.floorplanId = floorplanId;
        }

        public String getRoomPolygon() {
            return roomPolygon;
        }

        public void setRoomPolygon(String roomPolygon) {
            this.roomPolygon = roomPolygon;
        }

        public Double getXCoordinate() {
            return xCoordinate;
        }

        public void setXCoordinate(Double xCoordinate) {
            this.xCoordinate = xCoordinate;
        }

        public Double getYCoordinate() {
            return yCoordinate;
        }

        public void setYCoordinate(Double yCoordinate) {
            this.yCoordinate = yCoordinate;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }

        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }
    }

    public static class AnnotatorEdgeImport {
        @JsonAlias({"source_temp_id", "source"})
        private Long sourceTempId;
        @JsonAlias({"target_temp_id", "target"})
        private Long targetTempId;
        private Double weight;
        @JsonAlias("is_bus")
        private Boolean isBus;
        @JsonAlias("is_sheltered")
        private Boolean isSheltered;
        @JsonAlias("is_keycard")
        private Boolean isKeycard;
        @JsonAlias("is_stair")
        private Boolean isStair;
        @JsonAlias("is_ramp")
        private Boolean isRamp;
        @JsonAlias("is_elevator")
        private Boolean isElevator;

        public Long getSourceTempId() {
            return sourceTempId;
        }

        public void setSourceTempId(Long sourceTempId) {
            this.sourceTempId = sourceTempId;
        }

        public Long getTargetTempId() {
            return targetTempId;
        }

        public void setTargetTempId(Long targetTempId) {
            this.targetTempId = targetTempId;
        }

        public Double getWeight() {
            return weight;
        }

        public void setWeight(Double weight) {
            this.weight = weight;
        }

        public Boolean getIsBus() {
            return isBus;
        }

        public void setIsBus(Boolean isBus) {
            this.isBus = isBus;
        }

        public Boolean getIsSheltered() {
            return isSheltered;
        }

        public void setIsSheltered(Boolean isSheltered) {
            this.isSheltered = isSheltered;
        }

        public Boolean getIsKeycard() {
            return isKeycard;
        }

        public void setIsKeycard(Boolean isKeycard) {
            this.isKeycard = isKeycard;
        }

        public Boolean getIsStair() {
            return isStair;
        }

        public void setIsStair(Boolean isStair) {
            this.isStair = isStair;
        }

        public Boolean getIsRamp() {
            return isRamp;
        }

        public void setIsRamp(Boolean isRamp) {
            this.isRamp = isRamp;
        }

        public Boolean getIsElevator() {
            return isElevator;
        }

        public void setIsElevator(Boolean isElevator) {
            this.isElevator = isElevator;
        }
    }
}
