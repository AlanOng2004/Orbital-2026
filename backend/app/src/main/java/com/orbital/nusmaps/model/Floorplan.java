package com.orbital.nusmaps.model;

import jakarta.persistence.Column;
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
    private Integer floorplan_id;

    @Column(name = "area_name")
    private String area_name;

    @Column(name = "building_name")
    private String building_name;

    @Column(name = "level")
    private String level;

    @Column(name = "image_url")
    private String image_url;

    @OneToMany(mappedBy = "floorplan")
    private List<Node> nodes = new ArrayList<>();

    public Floorplan () {}

    public Floorplan(
            Integer floorplan_id,
            String area_name,
            String building_name,
            String level,
            String image_url
        ) {
        this.floorplan_id = floorplan_id;
        this.area_name = area_name;
        this.building_name = building_name;
        this.level = level;
        this.image_url = image_url;
    }

    // ================= Getters and Setters =================

    public Integer getFloorplanId() {
        return floorplan_id;
    }

    public void setFloorplanId(Integer floorplan_id) {
        this.floorplan_id = floorplan_id;
    }

    public String getAreaName() {
        return area_name;
    }

    public void setAreaName(String area_name) {
        this.area_name = area_name;
    }

    public String getBuildingName() {
        return building_name;
    }

    public void setBuildingName(String building_name) {
        this.building_name = building_name;
    }

    public String getLevel(){
        return level;
    }

    public void setLevel(String level){
        this.level = level;
    }

    public String getImageUrl() {
        return image_url;
    }

    public void setImageUrl(String image_url) {
        this.image_url = image_url;
    }

    public List<Node> getNodes() {
        return nodes;
    }

    public void setNodes(List<Node> nodes) {
        this.nodes = nodes;
    }
}
