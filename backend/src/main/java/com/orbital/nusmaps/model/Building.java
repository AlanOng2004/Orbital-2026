package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

@Entity
@Table(
        name = "buildings",
        indexes = {
                @Index(name = "idx_building_building_name", columnList = "building_name"),
                @Index(name = "idx_building_faculty_id", columnList = "faculty_id")
        }
)
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long buildingId;

    @Column(name = "building_name", nullable = false)
    private String buildingName;

    @JsonBackReference("building-fac")
    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    @Column(name = "building_polygon", columnDefinition = "TEXT", nullable = false)
    private String buildingPolygon;

    @Column(name = "rotation", nullable = false)
    private Double rotation;

    @JsonManagedReference("fp-building")
    @OneToMany(mappedBy = "building", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Floorplan> floorplans = new ArrayList<>();

    public Building () {}

    public Building(
            Long buildingId,
            String buildingName,
            Faculty faculty,
            String buildingPolygon,
            Double rotation
        ) {
        this.buildingId = buildingId;
        this.buildingName = buildingName;
        this.faculty = faculty;
        this.buildingPolygon = buildingPolygon;
        this.rotation = rotation;
    }

    // ================= Getters and Setters =================

    public Long getBuildingId() {
        return buildingId;
    }

    public void setBuildingId(Long buildingId) {
        this.buildingId = buildingId;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public Faculty getFaculty(){
        return faculty;
    }

    public void setFaculty(Faculty faculty) {
        this.faculty = faculty;

        for (Floorplan fp : getFloorplans()) {
            fp.setBuilding(this);
        }
    }

    public String getBuildingPolygon() {
        return buildingPolygon;
    }

    public void setBuildingPolygon(String buildingPolygon) {
        this.buildingPolygon = buildingPolygon;
    }

    public Double getRotation() {
        return rotation;
    }

    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    public List<Floorplan> getFloorplans() {
        return floorplans;
    }

    public void setFloorplans(List<Floorplan> floorplans) {
        this.floorplans.clear();
        if (floorplans == null) {
            return;
        }
        for (Floorplan floorplan : floorplans) {
            addFloorplan(floorplan);
        }
    }

    public void addFloorplan(Floorplan floorplan) {
        if (floorplan == null) {
            return;
        }
        floorplans.add(floorplan);
        floorplan.setBuilding(this);
    }

    public void removeFloorplan(Floorplan floorplan) {
        if (floorplan == null) {
            return;
        }
        floorplans.remove(floorplan);
        floorplan.setBuilding(null);
    }

    public void setBuildingPolygon(List<double[]> buildingPolygon) {
        if (buildingPolygon == null) {
            this.buildingPolygon = null;
        } else {
            ArrayList<String> tmp = new ArrayList<>();
            for (double[] vertice : buildingPolygon) {
                tmp.add(Arrays.toString(vertice));
            }
            this.buildingPolygon = tmp.toString();
        }
    }
}
