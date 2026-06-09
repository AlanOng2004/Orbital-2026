package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

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
        name = "building_aliases",
        indexes = {
                @Index(name = "idx_building_alias", columnList = "building_alias")
        },
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"building_id", "building_alias"})
        }
)
public class BuildingAlias {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long buildingAliasId;

    @Column(name = "building_alias", nullable = false)
    private String buildingAlias;

    @JsonBackReference("building-alias")
    @ManyToOne
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    public BuildingAlias () {}

    public BuildingAlias(
            Long buildingAliasId,
            String buildingAlias,
            Building building
        ) {
        this.buildingAliasId = buildingAliasId;
        this.buildingAlias = buildingAlias;
        this.building = building;
    }

    // ================= Getters and Setters =================

    public Long getBuildingAliasId() { return buildingAliasId; }

    public void setBuildingAliasId(Long buildingAliasId) { this.buildingAliasId = buildingAliasId; }

    public String getBuildingAlias() { return buildingAlias; }

    public void setBuildingAlias(String buildingAlias) { this.buildingAlias = buildingAlias; }

    public Building getBuilding() { return building; }

    public void setBuilding(Building building) { this.building = building;
    }
}
