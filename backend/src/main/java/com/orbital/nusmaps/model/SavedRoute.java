package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.util.ArrayList;
import java.util.List;

import java.time.LocalDateTime;

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
        name = "saved_routes",
        indexes = {
                @Index(name = "idx_saved_routes_user", columnList = "user_id")
        }
)
public class SavedRoute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long savedRouteId;

    @JsonBackReference("sr-user")
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;

    @Column(name = "route_name")
    private String routeName;

    @ManyToOne
    @JoinColumn(name = "source", nullable = false)
    private Node source;

    @ManyToOne
    @JoinColumn(name = "target", nullable = false)
    private Node target;

    @JsonManagedReference("edge-list")
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InstantiatedEdge> edgeList = new ArrayList<>();

    public SavedRoute () {}
    public SavedRoute(
            Long savedRouteId,
            User user,
            LocalDateTime savedAt,
            String routeName,
            Node source,
            Node target
        ) {
        this.savedRouteId = savedRouteId;
        this.user = user;
        this.savedAt = savedAt;
        this.routeName = routeName;
        this.source = source;
        this.target = target;
    }

    // ================= Getters and Setters =================

    public Long getSavedRouteId() { return savedRouteId; }

    public void setSavedRouteId(Long savedRouteId) { this.savedRouteId = savedRouteId; }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getSavedAt() { return savedAt; }

    public void setSavedAt(LocalDateTime savedAt) {
        this.savedAt = savedAt;
    }

    public String getRouteName() { return this.routeName; }

    public void setRouteName(String routeName) { this.routeName = routeName; }

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

    public List<InstantiatedEdge> getEdgeList() { return edgeList; }

    public void setEdgeList(List<InstantiatedEdge> edgeList) {
        this.edgeList.clear();
        if (edgeList == null) {
            return;
        }
        for (InstantiatedEdge edge : edgeList) {
            addInstantiatedEdge(edge);
        }
    }

    public void addInstantiatedEdge(InstantiatedEdge edge) {
        if (edge == null) {
            return;
        }
        edgeList.add(edge);
        edge.setRoute(this);
    }

    public void removeInstantiatedEdge(InstantiatedEdge edge) {
        if (edge == null) {
            return;
        }
        edgeList.remove(edge);
        edge.setRoute(null);
    }
}