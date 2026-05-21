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
    private Integer edgeId;

    @ManyToOne
    @JoinColumn(name = "source_node_id", nullable = false)
    private Node source;

    @ManyToOne
    @JoinColumn(name = "target_node_id", nullable = false)
    private Node target;

    @Column(name = "weight")
    private Float weight;

    @Column(name = "is_accessible")
    private Boolean accessible;

    @Enumerated(EnumType.STRING)
    @Column(name = "edge_type")
    private EdgeType edgeType;

    public enum EdgeType {
        Walkway,
        Staircase
    }

    public Edge () {}

    public Edge(
            Integer edgeId,
            Node source,
            Node target,
            Float weight,
            Boolean accessible,
            EdgeType edgeType
        ) {
        this.edgeId = edgeId;
        this.source = source;
        this.target = target;
        this.weight = weight;
        this.accessible = accessible;
        this.edgeType = edgeType;
    }

    // ================= Getters and Setters =================

    public Integer getEdgeId() {
        return edgeId;
    }

    public void setEdgeId(Integer edgeId) {
        this.edgeId = edgeId;
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

    public Boolean getAccessible() {
        return accessible;
    }

    public void setAccessible(Boolean accessible) {
        this.accessible = accessible;
    }

    public EdgeType getEdgeType() {
        return edgeType;
    }

    public void setEdgeType(EdgeType edgeType) {
        this.edgeType = edgeType;
    }
}
