package com.orbital.nusmaps.model;

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
        name = "faculties",
        indexes = {
                @Index(name = "idx_faculty_faculty_name", columnList = "faculty_name")
        }
)
public class Faculty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long facultyId;

    @Column(name = "faculty_name", nullable = false)
    private String facultyName;

    @Column(name = "faculty_polygon", columnDefinition = "TEXT", nullable = false)
    private String facultyPolygon;

    @JsonManagedReference("node-fac")
    @OneToMany(mappedBy = "faculty")
    private List<Node> nodes = new ArrayList<>();

    @JsonManagedReference("building-fac")
    @OneToMany(mappedBy = "faculty", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Building> buildings = new ArrayList<>();

    @JsonManagedReference("faculty-alias")
    @OneToMany(mappedBy = "faculty", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FacultyAlias> aliases = new ArrayList<>();

    public Faculty () {}

    public Faculty(
            Long facultyId,
            String facultyName,
            String facultyPolygon
        ) {
        this.facultyId = facultyId;
        this.facultyName = facultyName;
        this.facultyPolygon = facultyPolygon;
    }

    // ================= Getters and Setters =================

    public Long getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(Long facultyId) {
        this.facultyId = facultyId;
    }

    public String getFacultyName() {
        return facultyName;
    }

    public void setFacultyName(String facultyName) {
        this.facultyName = facultyName;
    }

    public String getFacultyPolygon(){
        return facultyPolygon;
    }

    public void setFacultyPolygon(String facultyPolygon){
        this.facultyPolygon = facultyPolygon;
    }

    public List<Building> getBuildings() {
        return buildings;
    }

    public void setBuildings(List<Building> buildings) {
        this.buildings.clear();
        if (buildings == null) {
            return;
        }
        for (Building building : buildings) {
            addBuilding(building);
        }
    }

    public void addBuilding(Building building) {
        if (building == null) {
            return;
        }
        buildings.add(building);
        building.setFaculty(this);
    }

    public void removeBuilding(Building building) {
        if (building == null) {
            return;
        }
        buildings.remove(building);
        building.setFaculty(null);
    }

    public void setFacultyPolygon(List<double[]> facultyPolygon) {
        if (facultyPolygon == null) {
            this.facultyPolygon = null;
        } else {
            ArrayList<String> tmp = new ArrayList<>();
            for (double[] vertice : facultyPolygon) {
                tmp.add(Arrays.toString(vertice));
            }
            this.facultyPolygon = tmp.toString();
        }
    }

    public List<Node> getNodes() { return this.nodes; }

    public List<FacultyAlias> getAliases() { return aliases; }

    public void setAliases(List<FacultyAlias> aliases) {
        this.aliases.clear();
        if (aliases == null) {
            return;
        }
        for (FacultyAlias alias : aliases) {
            addAlias(alias);
        }
    }

    public void addAlias(FacultyAlias alias) {
        if (alias == null) {
            return;
        }
        aliases.add(alias);
        alias.setFaculty(this);
    }

    public void removeAlias(FacultyAlias alias) {
        if (alias == null) {
            return;
        }
        aliases.remove(alias);
        alias.setFaculty(null);
    }
}
