package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import jakarta.persistence.Index;
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
@Table(
        name = "edges",
        indexes = {
                @Index(name = "idx_edge_source", columnList = "source_node_id"),
                @Index(name = "idx_edge_target", columnList = "target_node_id")
        }
)
public class Edge {
    public enum EdgeTag {
        Bus,
        Sheltered,
        Keycard,
        Stair,
        Ramp,
        Elevator
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long edgeId;

    @ManyToOne
    @JoinColumn(name = "source_node_id", nullable = false)
    private Node source;

    @ManyToOne
    @JoinColumn(name = "target_node_id", nullable = false)
    private Node target;

    @Column(name = "weight", nullable = false)
    private Double weight;

    @Column(name = "is_bus", nullable = false)
    private Boolean isBus = false;
    @Column(name = "is_sheltered", nullable = false)
    private Boolean isSheltered = false;
    @Column(name = "is_keycard", nullable = false)
    private Boolean isKeycard = false;
    @Column(name = "is_stair", nullable = false)
    private Boolean isStair = false;
    @Column(name = "is_ramp", nullable = false)
    private Boolean isRamp = false;
    @Column(name = "is_elevator", nullable = false)
    private Boolean isElevator = false;

    @JsonIgnore
    @OneToMany(mappedBy = "edge")
    private List<InstantiatedEdge> edgeList = new ArrayList<>();

    public Edge () {}
    public Edge(
            Long edgeId,
            Node source,
            Node target,
            Double weight,
            Boolean isBus,
            Boolean isSheltered,
            Boolean isKeycard,
            Boolean isStair,
            Boolean isRamp,
            Boolean isElevator
        ) {
        this.edgeId = edgeId;
        this.source = source;
        this.target = target;
        this.weight = weight;
        this.isBus = isBus;
        this.isSheltered = isSheltered;
        this.isKeycard = isKeycard;
        this.isStair = isStair;
        this.isRamp = isRamp;
        this.isElevator = isElevator;
    }

    // ================= Getters and Setters =================

    public Long getEdgeId() { return edgeId; }

    public void setEdgeId(Long edgeId) { this.edgeId = edgeId; }

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

    public Double getWeight() { return weight; }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public Boolean isBus() { return isBus; }
    public void setBus(Boolean isBus) { this.isBus = isBus; }
    public Boolean isSheltered() { return isSheltered; }
    public void setSheltered(Boolean isSheltered) { this.isSheltered = isSheltered; }
    public Boolean isKeycard() { return isKeycard; }
    public void setKeycard(Boolean isKeycard) { this.isKeycard = isKeycard; }
    public Boolean isStair() { return isStair; }
    public void setStair(Boolean isStair) { this.isStair = isStair; }
    public Boolean isRamp() { return isRamp; }
    public void setRamp(Boolean isRamp) { this.isRamp = isRamp; }
    public Boolean isElevator() { return isElevator; }
    public void setElevator(Boolean isElevator) { this.isElevator = isElevator; }

    public List<EdgeTag> getEdgeTags() {
        List<EdgeTag> ls = new ArrayList<>();
        if (isBus) { ls.add(EdgeTag.Bus); }
        else if (isSheltered) { ls.add(EdgeTag.Sheltered); }
        if (isKeycard) { ls.add(EdgeTag.Keycard); }
        if (isStair) { ls.add(EdgeTag.Stair); }
        if (isRamp) { ls.add(EdgeTag.Ramp); }
        if (isElevator) { ls.add(EdgeTag.Elevator); }
        return ls;
    }

    public void setEdgeTags(List<EdgeTag> edgeTags) {
        isBus = false; isSheltered = false; isKeycard = false;
        isStair = false; isRamp = false; isElevator = false;

        if (edgeTags != null) {
            for (EdgeTag tag : edgeTags) {
                switch (tag) {
                    case Bus -> {
                        this.isBus = true;
                        this.isSheltered = true;
                    }
                    case Sheltered -> {
                        this.isSheltered = true;
                    }
                    case Keycard -> {
                        this.isKeycard = true;
                    }
                    case Stair -> {
                        this.isStair = true;
                    }
                    case Ramp -> {
                        this.isRamp = true;
                    }
                    case Elevator -> {
                        this.isElevator = true;
                    }
                }
            }
        }
    }

    public List<InstantiatedEdge> getEdgeList() { return edgeList; }

    public void setEdgeList(List<InstantiatedEdge> edgeList) {
        this.edgeList.clear();
        if (edgeList == null) {
            return;
        }
        for (InstantiatedEdge edgeInstance : edgeList) {
            addEdgeInstance(edgeInstance);
        }
    }

    public void addEdgeInstance(EdgeList edgeInstance) {
        if (edgeInstance == null) {
            return;
        }
        edgeList.add(edgeInstance);
        edgeInstance.setEdge(this);
    }

    public void removeEdgeInstance(EdgeList edgeInstance) {
        if (edgeInstance == null) {
            return;
        }
        edgeList.remove(edgeInstance);
        edgeInstance.setEdge(null);
    }
}