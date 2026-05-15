package MapComponents;

import java.util.Collection;
// import java.util.HashMap;

// AUTHOR'S NOTE: THIS CLASS MAY BE REDUNDANT
// Immutable
public final class Floorplan {
    private final long floorplan_id;
    private final String area_name;
    private final String building_name;
    private final String level_name;

    // DESIGN DECISION: OMIT
    // private final HashMap<Integer, Node> nodes;

    public Floorplan(long fp_id, String area, String building, String level, Collection<Node> nodes) {
        this.floorplan_id = fp_id;
        this.area_name = area;
        this.building_name = building;
        this.level_name = level;

        // this.nodes = new HashMap<>();
        // for (Node n : nodes) {
        //     this.nodes.put(n.id(), n);
        // }
    }

    // Getters
    public long id() { return this.floorplan_id; }
    public String area() { return this.area_name; }
    public String building() { return this.building_name; }
    public String level() { return this.level_name; }
    // public HashMap<Integer, Node> nodes() { return this.nodes; }

    @Override
    public String toString() {
        return """
        {
          "floorplan_id": "%d",
          "area_name": "%s",
          "building_name": "%s",
          "level_name": "%s",
        }
        """.formatted(floorplan_id, area_name, building_name, level_name);
        /*
         * return """
         * {
         *   "floorplan_id": "%d",
         *   "area_name": "%s",
         *   "building_name": "%s",
         *   "level_name": "%s",
         *   "nodes": %s
         * }
         * """.formatted(floorplan_id, area_name, building_name, level_name, nodes.values());
         */
    }
}