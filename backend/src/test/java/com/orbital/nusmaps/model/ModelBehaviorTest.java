package com.orbital.nusmaps.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbital.nusmaps.TestDataFactory;
import java.util.List;
import org.junit.jupiter.api.Test;

class ModelBehaviorTest {

    @Test
    void edgeTagsRoundTripBusAsShelteredBus() {
        Edge edge = new Edge();

        edge.setEdgeTags(List.of(Edge.EdgeTag.Bus, Edge.EdgeTag.Elevator));

        assertEquals(true, edge.isBus());
        assertEquals(true, edge.isSheltered());
        assertEquals(true, edge.isElevator());
        assertEquals(List.of(Edge.EdgeTag.Bus, Edge.EdgeTag.Elevator), edge.getEdgeTags());
    }

    @Test
    void nodeAliasesMaintainBackReference() {
        Node node = TestDataFactory.node(
                1L,
                "Room",
                null,
                Node.NodeType.Room,
                TestDataFactory.floorplan(1L, TestDataFactory.building(1L, "COM1"), 1, "L1.png"),
                1,
                1
        );
        NodeAlias alias = TestDataFactory.alias("Discussion Room");

        node.addAlias(alias);

        assertEquals(1, node.getAliases().size());
        assertSame(node, alias.getNode());
    }

    @Test
    void buildingAddFloorplanMaintainsRelationship() {
        Building building = TestDataFactory.building(1L, "COM1");
        Floorplan floorplan = new Floorplan();

        building.addFloorplan(floorplan);

        assertTrue(building.getFloorplans().contains(floorplan));
        assertSame(building, floorplan.getBuilding());
    }
}
