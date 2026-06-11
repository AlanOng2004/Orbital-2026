package com.orbital.nusmaps.repository;

import org.springframework.data.jpa.repository.Query;
import java.util.stream.Stream;

import org.springframework.data.jpa.repository.JpaRepository;

import com.orbital.nusmaps.model.Node;

public interface NodeRepository extends JpaRepository<Node, Long> {
}
