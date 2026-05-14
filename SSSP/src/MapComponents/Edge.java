package MapComponents;

import java.util.List;

// Immutable
public final class Edge {
    // MASTER LIST OF EDGE_TYPES; TO NOTE WHEN DESIGNING FRONT END UI QUERIES
    private static final List<String> edge_types = List.of(
            "walkway",  // 0
            "staircase" // 1
    );

    private final long edge_id;
    private final long source;
    private final long target;
    private final double weight;
    private final boolean is_accessible;
    // DESIGN DECISION: store edge_type as int rather than String
    // efficiency in computation of Dijkstra
    private final int edge_type;

    public Edge(long id, long source, long target, double weight, boolean access, String type) {
        this.edge_id = id;
        this.source = source;
        this.target = target;
        this.weight = weight;
        this.is_accessible = access;
        this.edge_type = edge_types.indexOf(type);
    }

    // Getters
    public long id() { return this.edge_id; }
    public long source()  { return this.source; }
    public long target() { return this.target; }
    public double weight() { return this.weight; }
    public boolean access() { return this.is_accessible; }
    public int typeNum() { return this.edge_type; }
    public String type() { return edge_types.get(this.edge_type); }

    @Override
    public String toString() {
        return """
            {
              "edge_id": %d,
              "source": %d,
              "target": %d,
              "weight": %.2f,
              "is_accessible": %b
              "edge_type": "%s"
            }
        """.formatted(edge_id, source, target, weight, is_accessible, edge_types.get(this.edge_type));
    }
}