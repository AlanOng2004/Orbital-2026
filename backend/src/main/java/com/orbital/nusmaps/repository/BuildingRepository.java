package com.orbital.nusmaps.repository;

import com.orbital.nusmaps.model.Building;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BuildingRepository extends JpaRepository<Building, Long> {
    @Query("""
        select distinct b
        from Building b
        left join fetch b.aliases ba
        left join fetch b.faculty f
        order by b.buildingName asc
        """)
    List<Building> findAllSearchBuildings();
}
