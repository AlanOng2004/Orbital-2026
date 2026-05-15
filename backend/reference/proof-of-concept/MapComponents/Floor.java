package MapComponents;

import java.util.ArrayList;
import java.util.HashMap;

public class Floor {
    public String name;
    public String img;
    public HashMap<String, Node> nodes = new HashMap<>();
    public ArrayList<Corridor> corridors = new ArrayList<>();

    public Floor(String name, String img) {
        this.name = name;
        this.img = img;
    }

    @Override
    public String toString() {
        return """
        {
          "floor": "%s",
          "image": "%s",
          "nodes": %s,
          "corridors": %s
        }
        """.formatted(name, img, nodes.values(), corridors);
    }

    // Nodes
    public void addNode(String name, int id, int corridor, boolean isExit, int x, int y) {
        Node n = new Node(name, id, img, corridor, isExit, x, y);
        nodes.put(name, n);
        corridors.get(corridor).nodes.add(name);
    }

    public void removeNode(String name) {
        Node n = nodes.remove(name);
        corridors.get(n.corridor).nodes.remove(name);
    }

    // Corridors
    public void showCorridors() {
        for (int i = 0; i < corridors.size(); i++) {
            System.out.printf("%d %s%n", i, corridors.get(i));
        }
    }

    public void showCorridors(int corridor) {
        if (corridor < 0 || corridor >= corridors.size()) {
            System.out.printf("Error: corridor %d is out of bounds!%n", corridor);
            return;
        }

        Corridor c = corridors.get(corridor);
        for (String s : c.nodes) {
            System.out.println(nodes.get(s).toString());
        }
    }

    public void addCorridor(String name) {
        corridors.add(new Corridor(name));
        showCorridors();
    }

    public void rmCorridor() {
        if (corridors.isEmpty()) { System.out.println("Error: no corridors to remove!");
        } else {
            Corridor last = corridors.getLast();
            if (!last.nodes.isEmpty()) { System.out.printf("Corridor %s not empty!%n", last);
            } else { System.out.println(corridors.removeLast()); }
        }
    }
}