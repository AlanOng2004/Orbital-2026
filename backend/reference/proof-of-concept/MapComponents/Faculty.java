package MapComponents;

import java.util.ArrayList;

public class Faculty {
    public String name;
    public ArrayList<Building> faculties = new ArrayList<>();

    public Faculty(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return """
        {
          "faculty": "%s",
          "buildings": %s,
        }
        """.formatted(name, faculties);
    }
}
