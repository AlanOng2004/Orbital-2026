package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Index;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
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
        name = "instantiated_edges",
        indexes = {
                @Index(name = "idx_instantiated_edge", columnList = "route_id, edge_order")
        }
)
public class InstantiatedEdge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long instantiatedEdgeId;

    @JsonBackReference("edge-list")
    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    private SavedRoute route;

    @Column(name = "edge_order")
    private Long edgeOrder;

    @ManyToOne
    @JoinColumn(name = "edge_id", nullable = false)
    private Edge edge;

    public InstantiatedEdge () {}
    public InstantiatedEdge(
            Long instantiatedEdgeId,
            SavedRoute route,
            Long edgeOrder,
            Edge edge
        ) {
        this.instantiatedEdgeId = instantiatedEdgeId;
        this.route = route;
        this.edgeOrder = edgeOrder;
        this.edge = edge;
    }

    // ================= Getters and Setters =================

    public Long getInstantiatedEdgeId() { return instantiatedEdgeId; }

    public void setInstantiatedEdgeId(Long instantiatedEdgeId) { this.instantiatedEdgeId = instantiatedEdgeId; }

    public SavedRoute getRoute() {
        return route;
    }

    public void setRoute(SavedRoute route) {
        this.route = route;
    }

    public Long getEdgeOrder() { return edgeOrder; }

    public void setEdgeOrder(Long edgeOrder) {
        this.edgeOrder = edgeOrder;
    }

    public Edge getEdge() { return edge; }

    public void setEdge(Edge edge) { this.edge = edge; }
}