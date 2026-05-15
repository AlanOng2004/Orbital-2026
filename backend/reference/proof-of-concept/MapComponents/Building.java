package MapComponents;

import java.util.ArrayList;

public class Building {
    public String name;
    public ArrayList<Floor> floors = new ArrayList<>();

    public Building(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return """
        {
          "building": "%s",
          "floors": %s
        }
        """.formatted(name, floors);
    }
}
