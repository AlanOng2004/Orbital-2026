package com.orbital.nusmaps.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.orbital.nusmaps.model.Floorplan;

public interface FloorplanRepository extends JpaRepository<Floorplan, Integer> {
}
