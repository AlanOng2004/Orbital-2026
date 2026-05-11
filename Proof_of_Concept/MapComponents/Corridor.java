package MapComponents;

import java.util.HashSet;

public class Corridor {
    public String name;
    public HashSet<String> nodes = new HashSet<>();

    public Corridor(String name) {
        this.name = name;
    }

    @Override
    // Does not contain nodes info;
    // Functionality supported via Floor::showCorridor(int id)
    public String toString() {
        return this.name;
    }
}