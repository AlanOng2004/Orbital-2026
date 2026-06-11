package com.orbital.nusmaps.repository;

import java.util.ArrayList;
import org.springframework.data.jpa.repository.JpaRepository;

import com.orbital.nusmaps.model.Node;

public interface NodeRepository extends JpaRepository<Node, Long> {
    default ArrayList<Node> findAllNodes() { return new ArrayList<>(findAll()); }
}
