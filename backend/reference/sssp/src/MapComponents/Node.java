package MapComponents;

import java.util.Collection;
// import java.util.HashMap;

// AUTHOR'S NOTE: THIS CLASS MAY BE REDUNDANT
// Immutable
public final class Node {
    private final long node_id;
    private final String node_name;
    private final String node_type;
    private final long floorplan_id;
    private final double x_coord;
    private final double y_coord;

    // DESIGN DECISION: OMIT
    // private final HashMap<Integer, Edge> edges;

    public Node(long id, String name, String type, long fpid, float x, float y, Collection<Edge> edges) {
        this.node_id = id;
        this.node_name = name;
        this.node_type = type;
        this.floorplan_id = fpid;
        this.x_coord = x;
        this.y_coord = y;

        // this.edges = new HashMap<>();
        // for (Edge e : edges) {
        //    this.edges.put(e.id(), e);
        //}
    }

    // Getters
    public long id() { return this.node_id; }
    public String name() { return this.node_name; }
    public String type() { return this.node_type; }
    public long fp_id() { return this.floorplan_id; }
    public double x() { return this.x_coord; }
    public double y() { return this.y_coord; }
    // public HashMap<Integer, Edge> nodes() { return this.edges; }

    @Override
    public String toString() {
        return """
            {
              "node_id": %d,
              "node_name": "%s",
              "node_type": "%s",
              "floorplan_id": %d,
              "x_coord": %.2f,
              "y_coord": %.2f
            }
        """.formatted(node_id, node_name, node_type, floorplan_id, x_coord, y_coord);
        /*
         * return """
         *     {
         *       "node_id": %d,
         *       "node_name": "%s",
         *       "node_type": "%s",
         *       "floorplan_id": %d,
         *       "x_coord": %.2f,
         *       "y_coord": %.2f
         *       "edges": %s
         *     }
         * """.formatted(node_id, node_name, node_type, floorplan_id, x_coord, y_coord, edges.values());
         */
    }
}