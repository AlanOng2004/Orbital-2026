package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "floorplans")
public class Floorplan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer floorplanId;

    @Column(name = "area_name")
    private String areaName;

    @Column(name = "building_name")
    private String buildingName;

    @Column(name = "level")
    private String level;

    @Column(name = "image_url")
    private String imageUrl;

    @JsonManagedReference
    @OneToMany(mappedBy = "floorplan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Node> nodes = new ArrayList<>();

    public Floorplan () {}

    public Floorplan(
            Integer floorplanId,
            String areaName,
            String buildingName,
            String level,
            String imageUrl
        ) {
        this.floorplanId = floorplanId;
        this.areaName = areaName;
        this.buildingName = buildingName;
        this.level = level;
        this.imageUrl = imageUrl;
    }

    // ================= Getters and Setters =================

    public Integer getFloorplanId() {
        return floorplanId;
    }

    public void setFloorplanId(Integer floorplanId) {
        this.floorplanId = floorplanId;
    }

    public String getAreaName() {
        return areaName;
    }

    public void setAreaName(String areaName) {
        this.areaName = areaName;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public String getLevel(){
        return level;
    }

    public void setLevel(String level){
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
