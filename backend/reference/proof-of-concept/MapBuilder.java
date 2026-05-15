import MapComponents.*;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;

public class MapBuilder {
    private static int nodeID = 0; private static int global = 0;
    private static int faculty = 1; private static int building = 2;
    private static int floor = 3; private static int corridor = 4;
    private static int node = 5; private static int edge = 6;
    private static int environment = faculty;
    private static ArrayDeque<Object> envStack = new ArrayDeque<>();
    private static ArrayDeque<Object> undoStack = new ArrayDeque<>();
    private static ArrayDeque<Object> redoStack = new ArrayDeque<>();
    private static ArrayList<Node> nodeList = new ArrayList<>();
    private static HashMap<String, Node> nodeHash = new HashMap<>();
    private static Scanner sc = new Scanner(System.in);
    private static HashMap<String, Faculty> faculties = new HashMap<>();
    private static ArrayList<Edge> edges = new ArrayList<>();
    private static boolean inListMode = false;

    public static void main(String[] args) {
        while (true) {
            String s = sc.nextLine().trim();

            if (s.isEmpty()) {
                if (environment == global) {
                    continue;
                } else if (environment == edge) {
                    environment = faculty;
                    envStack.clear();
                }
                environment--;
                envStack.removeLast();
                redoStack.clear();
            } else if (s.equals("<")) {
                if (undoStack.isEmpty()) {
                    System.out.println("Error: undo stack is empty!");
                    continue;
                }
                Object o = undoStack.peekLast();
                if (o instanceof Node) {
                    Node n = (Node) o;
                } else if (o instanceof Corridor) {
                    Corridor c = (Corridor) o;
                } else if (o instanceof Floor) {
                    Floor f = (Floor) o;
                } else if (o instanceof Building) {
                    Building b = (Building) o;
                } else if (o instanceof Faculty) {
                    Faculty f = (Faculty) o;
                } else if (o instanceof Edge) {
                    Edge e = (Edge) o;
                }
                redoStack.addLast(undoStack.removeLast());
            } else if (s.equals(">")) {
                if (redoStack.isEmpty()) {
                    System.out.println("Error: redo stack is empty!");
                    continue;
                }
                Object o = redoStack.peekLast();
                if (o instanceof Node) {
                    Node n = (Node) o;
                } else if (o instanceof Corridor) {
                    Corridor c = (Corridor) o;
                } else if (o instanceof Floor) {
                    Floor f = (Floor) o;
                } else if (o instanceof Building) {
                    Building b = (Building) o;
                } else if (o instanceof Faculty) {
                    Faculty f = (Faculty) o;
                } else if (o instanceof Edge) {
                    Edge e = (Edge) o;
                }
                undoStack.addLast(redoStack.removeLast());
            } else if (s.equals("ls")) {
                // TODO: handle list mode
            } else if (s.equals("edge")) {
                // TODO: toggle edge mode
            } else if (s.equals("node")) {
                // TODO: toggle node mode
            } else if (s.equals("exit")) {
                System.exit(0);
            } else {
                // TODO: call helper function
            }
        }
    }
}
