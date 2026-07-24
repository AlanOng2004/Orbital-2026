package com.orbital.nusmaps.repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.orbital.nusmaps.model.Floorplan;

public interface FloorplanRepository extends JpaRepository<Floorplan, Long> {
    @EntityGraph(attributePaths = "building")
    List<Floorplan> findAllByOrderByBuildingBuildingNameAscLevelAsc();
}
