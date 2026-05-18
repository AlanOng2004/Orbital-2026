package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

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
@Table(name = "nodes")
public class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer nodeId;

    @Column(name = "node_name")
    private String nodeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type")
    private NodeType nodeType;

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "floorplan_id", nullable = false)
    private Floorplan floorplan;

    @Column(name = "x_coordinate")
    private Float xCoordinate;

    @Column(name = "y_coordinate")
    private Float yCoordinate;

    @JsonIgnore
    @OneToMany(mappedBy = "source")
    private List<Edge> outgoingEdges = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "target")
    private List<Edge> incomingEdges = new ArrayList<>();

    public enum NodeType {
        Door,
        Joints,
        Staircase
    }

    public Node () {}

    public Node(
            Integer nodeId,
            String nodeName,
            NodeType nodeType,
            Floorplan floorplan,
            Float xCoordinate,
            Float yCoordinate
        ) {
        this.nodeId = nodeId;
        this.nodeName = nodeName;
        this.nodeType = nodeType;
        this.floorplan = floorplan;
        this.xCoordinate = xCoordinate;
        this.yCoordinate = yCoordinate;
    }

    // ================= Getters and Setters =================

    public Integer getNodeId() {
        return nodeId;
    }

    public void setNodeId(Integer nodeId) {
        this.nodeId = nodeId;
    }

    public String getNodeName() {
        return nodeName;
    }

    public void setNodeName(String nodeName) {
        this.nodeName = nodeName;
    }

    public NodeType getNodeType() {
        return nodeType;
    }

    public void setNodeType(NodeType nodeType) {
        this.nodeType = nodeType;
    }

    public Floorplan getFloorplan() {
        return floorplan;
    }

    public void setFloorplan(Floorplan floorplan) {
        this.floorplan = floorplan;
    }

    public Float getXCoordinate() {
        return xCoordinate;
    }

    public void setXCoordinate(Float xCoordinate) {
        this.xCoordinate = xCoordinate;
    }

    public Float getYCoordinate() {
        return yCoordinate;
    }

    public void setYCoordinate(Float yCoordinate) {
        this.yCoordinate = yCoordinate;
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
}
