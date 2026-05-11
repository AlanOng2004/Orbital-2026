package MapComponents;

public class Node {
    public String name;
    public int id;
    public String img;
    public int corridor;
    public boolean isExit;
    public int x;
    public int y;

    public Node(String name, int id, String img, int corridor, boolean isExit, int x, int y) {
        this.name = name;
        this.id = id;
        this.img = img;
        this.corridor = corridor;
        this.isExit = isExit;
        this.x = x;
        this.y = y;
    }

    @Override
    public String toString() {
        return """
            {
              "id": %d,
              "img": "%s",
              "name": "%s",
              "isExit": %b,
              "x": %d,
              "y": %d
            }
        """.formatted(id, img, name, isExit, x, y);
    }
}