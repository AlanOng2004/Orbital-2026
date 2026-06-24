package com.orbital.nusmaps;

import com.orbital.nusmaps.model.Building;
import com.orbital.nusmaps.model.Edge;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.NodeAlias;
import com.orbital.nusmaps.model.User;
import java.time.LocalDateTime;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static User user(Long id, String username, String password, Boolean isAdmin) {
        User user = new User();
        user.setUserId(id);
        user.setUsername(username);
        user.setPassword(password);
        user.setGender(User.Gender.Other);
        user.setIsAdmin(isAdmin);
        user.setCreatedAt(LocalDateTime.of(2024, 1, 2, 3, 4));
        return user;
    }

    public static Building building(Long id, String name) {
        Building building = new Building();
        building.setBuildingId(id);
        building.setBuildingName(name);
        building.setBuildingPolygon("[]");
        building.setRotation(0.0);
        return building;
    }

    public static Floorplan floorplan(Long id, Building building, Integer level, String imageUrl) {
        Floorplan floorplan = new Floorplan();
        floorplan.setFloorplanId(id);
        floorplan.setBuilding(building);
        floorplan.setLevel(level);
        floorplan.setImageUrl(imageUrl);
        return floorplan;
    }

    public static Node node(
            Long id,
            String name,
            String dualName,
            Node.NodeType type,
            Floorplan floorplan,
            double x,
            double y
    ) {
        Node node = new Node();
        node.setNodeId(id);
        node.setNodeName(name);
        node.setDualName(dualName);
        node.setNodeType(type);
        node.setFloorplan(floorplan);
        node.setXCoordinate(x);
        node.setYCoordinate(y);
        node.setLongitude(103.77);
        node.setLatitude(1.30);
        return node;
    }

    public static NodeAlias alias(String value) {
        NodeAlias alias = new NodeAlias();
        alias.setNodeAlias(value);
        return alias;
    }

    public static Edge edge(Long id, Node source, Node target, double weight) {
        Edge edge = new Edge();
        edge.setEdgeId(id);
        edge.setSource(source);
        edge.setTarget(target);
        edge.setWeight(weight);
        edge.setBus(false);
        edge.setSheltered(false);
        edge.setKeycard(false);
        edge.setStair(false);
        edge.setRamp(false);
        edge.setElevator(false);
        return edge;
    }
}
