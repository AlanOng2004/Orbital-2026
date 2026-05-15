package com.orbital.nusmaps.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    private Integer node_id;

    @Column(name = "node_name")
    private String node_name;

    @Column(name = "node_type")
    private String node_type;

    @ManyToOne
    @JoinColumn(name = "floorplan_id", nullable = false)
    private Floorplan floorplan;

    @Column(name = "x_coordinate")
    private Float x_coordinate;

    @Column(name = "y_coordinate")
    private Float y_coordinate;

    @OneToMany(mappedBy = "node")
    private List<Edge> edges = new ArrayList<>();

    public Node () {}

    public Node(
            Integer node_id,
            String node_name,
            String node_type,
            Floorplan floorplan,
            Float x_coordinate,
            Float y_coordinate
        ) {
        this.node_id = node_id;
        this.node_name = node_name;
        this.node_type = node_type;
        this.floorplan = floorplan;
        this.x_coordinate = x_coordinate;
        this.y_coordinate = y_coordinate;
    }

    // ================= Getters and Setters =================

    public Integer getNodeId() {
        return node_id;
    }

    public void setNodeId(Integer node_id) {
        this.node_id = node_id;
    }

    public String getNodeName() {
        return node_name;
    }

    public void setNodeName(String node_name) {
        this.node_name = node_name;
    }

    public String getNodeType() {
        return node_type;
    }

    public void setNodeType(String node_type) {
        this.node_type = node_type;
    }

    public Floorplan getFloorplan() {
        return floorplan;
    }

    public void setFloorplan(Floorplan floorplan) {
        this.floorplan = floorplan;
    }

    public Float getXCoordinate() {
        return x_coordinate;
    }

    public void setXCoordinate(Float x_coordinate) {
        this.x_coordinate = x_coordinate;
    }

    public Float getYCoordinate() {
        return y_coordinate;
    }

    public void setYCoordinate(Float y_coordinate) {
        this.y_coordinate = y_coordinate;
    }

    public List<Edge> getEdges() {
        return edges;
    }

    public void setEdges(List<Edge> edges) {
        this.edges = edges;
    }
}
