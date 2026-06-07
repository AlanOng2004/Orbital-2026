package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import java.time.LocalDateTime;

import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Index;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "saved_places",
        indexes = {
                @Index(name = "idx_saved_places_user", columnList = "user_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"user_id", "node_id"})
        }
)
public class SavedPlace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long savedPlaceId;

    @JsonBackReference("sp-user")
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "node_id", nullable = false)
    private Node node;

    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;

    @Column(name = "place_name")
    private String placeName;

    public SavedPlace () {}
    public SavedPlace(
            Long savedPlaceId,
            User user,
            Node node,
            LocalDateTime savedAt,
            String placeName
        ) {
        this.savedPlaceId = savedPlaceId;
        this.user = user;
        this.node = node;
        this.savedAt = savedAt;
        this.placeName = placeName;
    }

    // ================= Getters and Setters =================

    public Long getSavedPlaceId() { return savedPlaceId; }

    public void setSavedPlaceId(Long savedPlaceId) { this.savedPlaceId = savedPlaceId; }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Node getNode() {
        return node;
    }

    public void setNode(Node node) {
        this.node = node;
    }

    public LocalDateTime getSavedAt() { return savedAt; }

    public void setSavedAt(LocalDateTime savedAt) {
        this.savedAt = savedAt;
    }

    public String getPlaceName() { return this.placeName; }

    public void setPlaceName(String placeName) { this.placeName = placeName; }
}