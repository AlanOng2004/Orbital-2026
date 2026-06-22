package com.orbital.nusmaps.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbital.nusmaps.model.Node;

public interface NodeRepository extends JpaRepository<Node, Long> {
    default ArrayList<Node> findAllNodes() { return new ArrayList<>(findAll()); }

    @Query("""
        select distinct n
        from Node n
        left join fetch n.aliases na
        join fetch n.floorplan fp
        join fetch fp.building b
        left join b.aliases ba
        where lower(b.buildingName) = lower(:buildingQuery)
           or lower(ba.buildingAlias) = lower(:buildingQuery)
        order by fp.level asc, n.nodeName asc
        """)
    List<Node> findAllByBuildingQuery(@Param("buildingQuery") String buildingQuery);

    @Query("""
        select n
        from Node n
        join fetch n.floorplan fp
        join fetch fp.building b
        where n.nodeId = :nodeId
        """)
    Optional<Node> findRouteNodeById(@Param("nodeId") Long nodeId);

    @Query("""
        select distinct n
        from Node n
        left join fetch n.aliases na
        join fetch n.floorplan fp
        join fetch fp.building b
        left join b.aliases ba
        where (
                lower(n.nodeName) like lower(concat('%', :query, '%'))
             or lower(coalesce(n.dualName, '')) like lower(concat('%', :query, '%'))
             or lower(coalesce(na.nodeAlias, '')) like lower(concat('%', :query, '%'))
            )
          and (
                :buildingQuery is null
             or lower(b.buildingName) = lower(:buildingQuery)
             or lower(coalesce(ba.buildingAlias, '')) = lower(:buildingQuery)
            )
        order by fp.level asc, n.nodeName asc
        """)
    List<Node> searchRouteNodes(
            @Param("query") String query,
            @Param("buildingQuery") String buildingQuery
    );
}
