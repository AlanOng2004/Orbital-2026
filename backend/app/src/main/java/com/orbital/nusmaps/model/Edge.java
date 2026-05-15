package com.orbital.nusmaps.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "edges")
public class Edge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer edge_id;

    @ManyToOne
    @JoinColumn(name = "source_node_id", nullable = false)
    private Node source;

    @ManyToOne
    @JoinColumn(name = "target_node_id", nullable = false)
    private Node target;

    @Column(name = "weight")
    private Float weight;

    @Column(name = "is_accessible")
    private Boolean is_accessible;

    @Enumerated(EnumType.STRING)
    @Column(name = "edge_type")
    private EdgeType edge_type;

    public enum EdgeType {
        Walkway,
        Staircase
    }

    public Edge () {}

    public Edge(
            Integer edge_id,
            Node source,
            Node target,
            Float weight,
            Boolean is_accessible,
            EdgeType edge_type
        ) {
        this.edge_id = edge_id;
        this.source = source;
        this.target = target;
        this.weight = weight;
        this.is_accessible = is_accessible;
        this.edge_type = edge_type;
    }

    // ================= Getters and Setters =================

    public Integer getEdgeId() {
        return edge_id;
    }

    public void setEdgeId(Integer edge_id) {
        this.edge_id = edge_id;
    }

    public Node getSource() {
        return source;
    }

    public void setSource(Node source) {
        this.source = source;
    }

    public Node getTarget() {
        return target;
    }

    public void setTarget(Node target) {
        this.target = target;
    }

    public Float getWeight() {
        return weight;
    }

    public void setWeight(Float weight) {
        this.weight = weight;
    }

    public Boolean getIsAccessible() {
        return is_accessible;
    }

    public void setIsAccessible(Boolean is_accessible) {
        this.is_accessible = is_accessible;
    }

    public EdgeType getEdgeType() {
        return edge_type;
    }

    public void setEdgeType(EdgeType edge_type) {
        this.edge_type = edge_type;
    }
}
