package com.orbital.nusmaps.repository;

import org.springframework.data.jpa.repository.Query;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.orbital.nusmaps.model.Edge;

public interface EdgeRepository extends JpaRepository<Edge, Long> {
    @EntityGraph(attributePaths = {"source", "target"})
    @Query("select e from Edge e")
    List<Edge> findAllWithNodes();

    default ArrayList<Edge> findAllEdges() { return new ArrayList<>(findAllWithNodes()); }
}
