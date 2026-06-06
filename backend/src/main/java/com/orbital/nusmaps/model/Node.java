package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

import jakarta.persistence.Index;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "nodes",
        indexes = {
                @Index(name = "idx_node_node_name", columnList = "node_name"),
                @Index(name = "idx_node_dual_name", columnList = "dual_name"),
                @Index(name = "idx_node_node_type", columnList = "node_type"),
                @Index(name = "idx_node_floorplan_id", columnList = "floorplan_id"),
                @Index(name = "idx_node_faculty_id", columnList = "faculty_id")
        }
)
public class Node {
    public enum NodeType {
        Food,
        Room,
        Bus_stop,
        Toilet,
        Junction,
        Stair,
        Corridor
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long nodeId;

    @Column(name = "node_name", nullable = false)
    private String nodeName;

    @Column(name = "dual_name")
    private String dualName;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false)
    private NodeType nodeType;

    @JsonBackReference("node-fp")
    @ManyToOne
    @JoinColumn(name = "floorplan_id", nullable = false)
    private Floorplan floorplan;

    @JsonBackReference("node-fac")
    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @Column(name = "room_polygon", columnDefinition = "TEXT")
    private String roomPolygon;

    @Column(name = "x_coordinate")
    private Double xCoordinate;

    @Column(name = "y_coordinate")
    private Double yCoordinate;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @JsonIgnore
    @OneToMany(mappedBy = "source")
    private List<Edge> outgoingEdges = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "target")
    private List<Edge> incomingEdges = new ArrayList<>();

    public Node () {}

    public Node(
            Long nodeId,
            String nodeName,
            String dualName,
            NodeType nodeType,
            Floorplan floorplan,
            Faculty faculty,
            String roomPolygon,
            Double xCoordinate,
            Double yCoordinate,
            Double longitude,
            Double latitude
        ) {
        this.nodeId = nodeId;
        this.nodeName = nodeName;
        this.dualName = dualName;
        this.nodeType = nodeType;
        this.floorplan = floorplan;
        this.faculty = faculty;
        this.roomPolygon = roomPolygon;
        this.xCoordinate = xCoordinate;
        this.yCoordinate = yCoordinate;
        this.longitude = longitude;
        this.latitude = latitude;
    }

    // ================= Getters and Setters =================

    public Long getNodeId() { return nodeId; }

    public void setNodeId(Long nodeId) { this.nodeId = nodeId; }

    public String getNodeName() { return nodeName; }

    public void setNodeName(String nodeName) { this.nodeName = nodeName; }

    public String getDualName() {
        return dualName;
    }

    public void setDualName(String dualName) {
        this.dualName = dualName;
    }

    public NodeType getNodeType() { return nodeType; }

    public void setNodeType(NodeType nodeType) { this.nodeType = nodeType; }

    public Floorplan getFloorplan() { return floorplan; }

    public void setFloorplan(Floorplan floorplan) {
        this.floorplan = floorplan;
        if (floorplan != null && floorplan.getBuilding() != null) {
            this.faculty = floorplan.getBuilding().getFaculty();
        } else { this.faculty = null; }
    }

    public String getRoomPolygon() { return this.roomPolygon; }

    public void setRoomPolygon(String roomPolygon) { this.roomPolygon = roomPolygon; }

    public Double getXCoordinate() { return xCoordinate; }

    public void setXCoordinate(Double xCoordinate) { this.xCoordinate = xCoordinate; }

    public Double getYCoordinate() { return yCoordinate; }

    public void setYCoordinate(Double yCoordinate) { this.yCoordinate = yCoordinate; }

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

    public List<Edge> getOutgoingEdges() {
        return outgoingEdges;
    }

    public void setOutgoingEdges(List<Edge> outgoingEdges) {
        this.outgoingEdges = outgoingEdges;
    }

    public List<Edge> getIncomingEdges() {
        return incomingEdges;
    }

    public void setIncomingEdges(List<Edge> incomingEdges) {
        this.incomingEdges = incomingEdges;
    }

    public void setRoomPolygon(List<double[]> roomPolygon) {
        if (roomPolygon == null) {
            this.roomPolygon = null;
        } else {
            ArrayList<String> tmp = new ArrayList<>();
            for (double[] vertice : roomPolygon) {
                tmp.add(Arrays.toString(vertice));
            }
            this.roomPolygon = tmp.toString();
        }
    }

    public Faculty getFaculty() { return faculty; }
}
