package MapComponents;

import java.lang.Math;

public class Edge {
    public Node node1;
    public Node node2;
    public double weight;
    public String type;

    public Edge(Node node1, Node node2, String type) {
        int x = node1.x - node2.x;
        int y = node1.y - node2.y;
        this.node1 = node1;
        this.node2 = node2;
        this.weight = Math.sqrt(x * x + y * y);
        this.type = type;
    }

    @Override
    public String toString() {
        return """
            {
              "node1": %d,
              "node2": %d,
              "weight": %.2f,
              "type": "%s"
            }
        """.formatted(node1.id, node2.id, weight, type);
    }
}