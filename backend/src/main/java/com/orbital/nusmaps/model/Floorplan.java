package com.orbital.nusmaps.model;

import jakarta.persistence.CascadeType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.util.ArrayList;
import java.util.List;

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
        name = "floorplans",
        indexes = {
                @Index(name = "idx_floorplan_building_id", columnList = "building_id")
        }
)
public class Floorplan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long floorplanId;

    @JsonBackReference("fp-building")
    @ManyToOne
    @JoinColumn(name = "building_id")
    private Building building;

    @Column(name = "level")
    private Integer level;

    @Column(name = "image_url", columnDefinition = "TEXT", nullable = false)
    private String imageUrl;

    @JsonManagedReference("node-fp")
    @OneToMany(mappedBy = "floorplan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Node> nodes = new ArrayList<>();

    public Floorplan () {}

    public Floorplan(
            Long floorplanId,
            Building building,
            Integer level,
            String imageUrl
        ) {
        this.floorplanId = floorplanId;
        this.building = building;
        this.level = level;
        this.imageUrl = imageUrl;
    }

    // ================= Getters and Setters =================

    public Long getFloorplanId() {
        return floorplanId;
    }

    public void setFloorplanId(Long floorplanId) {
        this.floorplanId = floorplanId;
    }

    public Building getBuilding() {
        return building;
    }

    public void setBuilding(Building building) { this.building = building; }

    public void updateBuildingWNodes(Building building) {
        if (this.building == building) { return; }

        Faculty f1 = this.building == null
                ? null
                : this.building.getFaculty();
        Faculty f2 = building == null
                ? null
                : building.getFaculty();

        if (f1 != f2) {
            updateNodesFaculty(f2);
        }
        this.building = building;
    }

    public void updateNodesFaculty(Faculty faculty) {
        for (Node n : nodes) {
            n.setFaculty(faculty);
        }
    }

    public Integer getLevel(){
        return level;
    }

    public void setLevel(Integer level){
        this.level = level;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public List<Node> getNodes() {
        return nodes;
    }

    public void setNodes(List<Node> nodes) {
        this.nodes.clear();
        if (nodes == null) {
            return;
        }
        for (Node node : nodes) {
            addNode(node);
        }
    }

    public void addNode(Node node) {
        if (node == null) {
            return;
        }
        nodes.add(node);
        node.setFloorplan(this);
    }

    public void removeNode(Node node) {
        if (node == null) {
            return;
        }
        nodes.remove(node);
        node.setFloorplan(null);
    }
}
