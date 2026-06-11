import MapComponents.*;

import javax.sql.DataSource;
import java.sql.PreparedStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Comparator;
import java.util.HashSet;
import java.util.function.Function;

// DESIGN DECISION:
// return EdgeList only. nodes will be stored locally on frontend UI,
// since location search queries will span entire map

public class SSSP {

    /* --- STATIC FIELDS --- */
    // DESIGN DECISION: not immutable; customizable to user preferences
    // MASTER FIELDS: DEFAULT VALUES, OFFSETS AND FACTORS
    private static double stair_factor = 0.0, stair_offset = 1.0;
    private static double bus_factor = 0.01, bus_offset = 0.0;

    // MASTER LIST OF PERMISSIONS; TO NOTE WHEN DESIGNING FRONT END UI QUERIES
    private static final List<Function<Edge, Boolean>> permsfns = List.of(
            Edge::access // 0
    );

    // MASTER LIST OF EDGE_TYPES; TO NOTE WHEN DESIGNING FRONT END UI QUERIES
    // CORRESPONDING LIST IN EDGE CLASS
    private static final List<Function<Double, Double>> edgefns = List.of(
            walkway_dist -> walkway_dist,   // 0
            staircase_dist -> staircase_dist * stair_factor + stair_offset, // 1
            bus_dist -> bus_dist * bus_factor + bus_offset  // 2
    );

    /* --- SSSP CONSTRUCTOR --- */
    // instance of SSSP, NOT query method
    public SSSP(DataSource database) {
        this.database = database;
    }

    /* --- SQL FIELDS AND HELPER FUNCTIONS --- */
    private final DataSource database;

    // Local Cache Query
    // DESIGN DECISION: if node is not in cache, query node's entire floor
    private ArrayList<Edge> getEdges(long i) throws SQLException {
        if (!adjList.containsKey(i)) {
            ResultSet rs = getResultSet(i);

            while (rs.next()) {
                Edge e = new Edge(
                        rs.getLong("edge_id"),
                        rs.getLong("source"),
                        rs.getLong("target"),
                        rs.getDouble("weight"),
                        rs.getBoolean("is_accessible"),
                        rs.getString("edge_type"));

                if (!adjList.containsKey(e.source())) {
                    adjList.put(e.source(), new ArrayList<>());
                }
                adjList.get(e.source()).add(e);
                edgeList.put(e.source(), e);
            }
        }
        return adjList.get(i);
    }

    private ResultSet getResultSet(long node_id) throws SQLException {
        String sql = """
            WITH TargetFloor AS (SELECT floorplan_id FROM nodes WHERE node_id = ?)
            SELECT e.edge_id, e.source, e.target, e.weight, e.is_accessible, e.edge_type
            FROM nodes n
            JOIN TargetFloor tf ON n.floorplan_id = tf.floorplan_id
            LEFT JOIN edges e ON n.node_id = e.source
        """;

        // try-with-resources to close AutoCloseable implementations
        // in case of exceptions
        try (Connection conn = database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            // Passing node_id as argument node_id
            stmt.setObject(1, node_id);
            return stmt.executeQuery();
        }
    }

    /* --- DIJKSTRA FIELDS, METHODS AND HELPER FUNCTIONS --- */
    // Only refreshed if .clear()
    private final HashMap<Long, ArrayList<Edge>> adjList = new HashMap<>();
    private final HashMap<Long, Edge> edgeList = new HashMap<>();

    // Refreshed every call to findPath()
    private Long source;
    private HashSet<Long> endpt;
    private HashMap<Long, Long> parent;
    // DESIGN DECISION: for efficiency,
    // only maintain indices of permissions you DO NOT have
    private ArrayList<Integer> permissions;
    private ArrayList<Edge> path;

    public void clear() { adjList.clear(); }
    public ArrayList<Edge> findPath(Long s, HashSet<Long> target, boolean... perms) throws SQLException {
        source = s; endpt = target;
        permissions = new ArrayList<>();
        for (int i = 0; i < perms.length; i++) {
            if (!perms[i]) { permissions.add(i); }
        }
        parent = new HashMap<>(); path = new ArrayList<>();

        Heap<Double, Long> heap = new Heap<>();
        heap.insert(0.0, s); parent.put(s, null);
        while (!heap.isEmpty()) {
            Pair<Double, Long> curr = heap.pop();
            if (target.contains(curr.value)) { return pathRecovery(curr.value); }
            else {
                for (Edge e : getEdges(curr.value)) {
                    Long next = e.target();
                    // if not visited and permissions align
                    if (!parent.containsKey(next) && isLegal(e)) {
                        // calculate weight of next
                        Double nxtW = curr.key +
                            edgefns.get(e.typeNum()).apply(e.weight());

                        if (!heap.contains(next)) {
                            heap.insert(nxtW, next);
                            parent.put(next, e.id());
                        } else if (heap.decrementKey(next, nxtW)) {
                            parent.put(next, e.id());
                        }
                    }
                }
            }
        }
        return null;
    }

    private ArrayList<Edge> pathRecovery(long target) {
        Long curr_edgeid = parent.get(target);
        ArrayList<Edge> res = new ArrayList<>();
        while (curr_edgeid != null) {
            Edge e = edgeList.get(curr_edgeid);
            res.add(e);
            curr_edgeid = parent.get(e.source());
        }
        int size = res.size();
        for (int i = 0; i < size / 2; i++) {
            Edge temp = res.get(i);
            res.set(i, res.get(size - 1 - i));
            res.set(size - 1 - i, temp);
        }
        return res;
    }

    private boolean isLegal(Edge e) {
        for (int i : permissions) { // permissions you DO NOT have
            if (!permsfns.get(i).apply(e)) {
                return false;
            }
        }
        return true;
    }

    /* --- HELPER CLASSES: PAIR, HEAP --- */
    private static class Pair<T extends Comparable<T>, S> implements Comparable<Pair<T, S>> {
        private T key;
        private S value;

        public Pair(T t, S s) {
            key = t;
            value = s;
        }

        public T getKey() { return this.key; }
        public S getVal() { return this.value; }
        public Pair<T, S> setKey(T t) {
            key = t;
            return this;
        }
        public Pair<T, S> setVal(S s) {
            value = s;
            return this;
        }

        @Override
        public int compareTo(Pair<T, S> p) {
            return key.compareTo(p.key);
        }

        @Override
        public boolean equals(Object o) {
            if (o instanceof Pair<?, ?> p) {
                return this.key.equals(p.key) && this.value.equals(p.value);
            }
            return false;
        }
    }

    private static class Heap<E extends Comparable<E>, S> {
        private int lsIdx = 0;
        private Comparator<E> comparator = E::compareTo;

        // DESIGN DECISION:
        // using HashMap since indices may not be contiguous
        private ArrayList<Pair<E, S>> pq = new ArrayList<>();
        private HashMap<S, Integer> stoIdx = new HashMap<>();
        private HashMap<Integer, S> idxtoS = new HashMap<>();

        public Heap() {}
        public Heap(Comparator<E> c) {
            this.comparator = c;
        }

        private void bubbleUp(int idx) {
            while (idx / 2 >= 1 && comparator.compare(pq.get(idx).key, (pq.get(idx / 2)).key) < 0) {
                Pair<E, S> temp = pq.get(idx); // original pair at idx
                pq.set(idx, pq.get(idx / 2));
                pq.set(idx / 2, temp);

                // since pq is already updated correctly,
                // use it to update the helper hashes
                stoIdx.put(pq.get(idx).value, idx);
                stoIdx.put(temp.value, idx/2);
                idxtoS.put(idx, pq.get(idx).value);
                idxtoS.put(idx/2, temp.value);

                idx /= 2;
            }
        }

        private void bubbleDown(int idx) {
            while (true) {
                int swapIdx = idx * 2 > lsIdx // has no children
                        ? -1
                        : idx * 2 + 1 > lsIdx // only has one child
                        ? comparator.compare(pq.get(idx).key, pq.get(idx * 2).key) < 0
                        ? -1 : idx * 2
                        // has two children, compare with left child
                        : comparator.compare(pq.get(idx).key, pq.get(idx * 2).key) < 0
                        // correct wrt left child, compare with right child
                        ? comparator.compare(pq.get(idx).key, pq.get(idx * 2 + 1).key) < 0
                        ? -1 : idx * 2 + 1
                        // wrong wrt left child, compare with right child
                        : comparator.compare(pq.get(idx).key, pq.get(idx * 2 + 1).key) < 0
                        ? idx * 2
                        // wrong wrt to both children, compare children
                        : comparator.compare(pq.get(idx * 2).key, pq.get(idx * 2 + 1).key) < 0
                        ? idx * 2 : idx * 2 + 1;

                if (swapIdx == -1) {
                    break;
                }

                Pair<E, S> temp = pq.get(idx); // original pair at idx
                pq.set(idx, pq.get(swapIdx));
                pq.set(swapIdx, temp);

                // since pq is already updated correctly,
                // use it to update the helper hashes
                stoIdx.put(pq.get(idx).value, idx);
                stoIdx.put(temp.value, swapIdx);
                idxtoS.put(idx, pq.get(idx).value);
                idxtoS.put(swapIdx, temp.value);

                idx = swapIdx;
            }
        }

        public void insert(E priority, S val) {
            Pair<E, S> e = new Pair<>(priority, val);
            lsIdx++;
            stoIdx.put(val, lsIdx);
            idxtoS.put(lsIdx, val);
            pq.add(e);
            bubbleUp(lsIdx);
        }

        public Pair<E, S> pop() {
            Pair<E, S> top = pq.get(1);

            // use old pq to update helper hashes
            stoIdx.remove(top.value);
            stoIdx.put(pq.get(lsIdx).value, 1);
            idxtoS.put(1, pq.get(lsIdx).value);
            idxtoS.remove(lsIdx);

            // update pq
            pq.set(1, pq.get(lsIdx));
            pq.remove(lsIdx);
            lsIdx--;

            bubbleDown(1);

            return top;
        }

        public boolean decrementKey(S val, E newE) {
            Pair<E, S> curr = pq.get(stoIdx.get(val));
            E oldE = curr.key;

            if (comparator.compare(oldE, newE) > 0) {
                curr.key = newE;
                bubbleUp(stoIdx.get(curr.value));
                return true;
            }

            return false;
        }

        public boolean contains(S val) {
            return stoIdx.containsKey(val);
        }

        public boolean isEmpty() {
            return lsIdx == 0;
        }

        public Pair<E, S> peek() {
            return isEmpty() ? null : pq.get(1);
        }
    }
}