package com.orbital.nusmaps.implement;

import org.springframework.stereotype.Service;

import it.unimi.dsi.fastutil.objects.ObjectBigArrayBigList;
import it.unimi.dsi.fastutil.objects.ObjectBigList;
import jakarta.annotation.PostConstruct;

import com.orbital.nusmaps.service.SSSPService;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.Edge;

import com.orbital.nusmaps.repository.EdgeRepository;
import com.orbital.nusmaps.repository.NodeRepository;

import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Stream;
import java.util.List;
import java.util.Collection;

import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.Comparator;
import java.util.function.DoubleUnaryOperator;

@Service
public class SSSPServiceImpl implements SSSPService {
    private final ObjectBigList<Edge> bigListofAllEdges = new ObjectBigArrayBigList<>();
    private final ObjectBigList<Node> bigListofAllNodes = new ObjectBigArrayBigList<>();
    private final HashMap<Node, List<Edge>> adjList = new HashMap<>();
    private final EdgeRepository edgeRepository;
    private final NodeRepository nodeRepository;
    private static final Map<Edge.EdgeTag, DoubleUnaryOperator> edgefns = Map.of(
            Edge.EdgeTag.Bus, dist -> (dist / 4) + 0.001,
            Edge.EdgeTag.Sheltered, dist -> dist,
            Edge.EdgeTag.Keycard, dist -> dist,
            Edge.EdgeTag.Stair, dist -> (dist + 0.00004) * 3,
            Edge.EdgeTag.Ramp, dist -> (dist + 0.00004) * 3,
            Edge.EdgeTag.Elevator, dist -> (dist + 0.00004) * 3
    );

    public SSSPServiceImpl(EdgeRepository edgeRepository, NodeRepository nodeRepository) {
        this.edgeRepository = edgeRepository;
        this.nodeRepository = nodeRepository;
    }
    public SSSPServiceImpl(Collection<Edge> edgeList, Collection<Node> nodeList) {
        for (Edge e : edgeList) { bigListofAllEdges.add(e); }
        for (Node n : nodeList) { bigListofAllNodes.add(n); }
        edgeRepository = null; nodeRepository = null;
    }

    @PostConstruct
    @Transactional(readOnly = true)
    public void initGraphData() {
        if (edgeRepository == null || nodeRepository == null) {
            System.out.println("Warning: No database repositories found. Operating under: Unit Test Mode.");
            return;
        }
/*
        try (Stream<Node> nodeStream = nodeRepository.streamAllNodesOptimized()) {
            nodeStream.forEach(node -> {
                bigListofAllNodes.add(node);
                adjList.put(node, node.getOutgoingEdges());
                for (Edge e : node.getOutgoingEdges()) {
                    bigListofAllEdges.set(e.getEdgeId(), e);
                }
            });
        }
 */
        System.out.println("Initialisation for SSSP Service... Completed!");
    }

    @Override
    public List<Edge> SSSP(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms) {
        DoubleUnaryOperator busFunc = perms.getOrDefault(Edge.EdgeTag.Bus, edgefns.get(Edge.EdgeTag.Bus));
        DoubleUnaryOperator shelFunc = perms.getOrDefault(Edge.EdgeTag.Sheltered, edgefns.get(Edge.EdgeTag.Sheltered));
        DoubleUnaryOperator keyFunc = perms.getOrDefault(Edge.EdgeTag.Keycard, edgefns.get(Edge.EdgeTag.Keycard));
        DoubleUnaryOperator stairFunc = perms.getOrDefault(Edge.EdgeTag.Stair, edgefns.get(Edge.EdgeTag.Stair));
        DoubleUnaryOperator rampFunc = perms.getOrDefault(Edge.EdgeTag.Ramp, edgefns.get(Edge.EdgeTag.Ramp));
        DoubleUnaryOperator eleFunc = perms.getOrDefault(Edge.EdgeTag.Elevator, edgefns.get(Edge.EdgeTag.Elevator));

        Node start = source;
        Node end = target;
        HashMap<Long, Long> parent;
    }

    @Override
    public List<Edge> ASTAR(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms) {
        return null;
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
        public int compareTo(Pair<T, S> p) { return key.compareTo(p.key); }

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
        public Heap(Comparator<E> c) { this.comparator = c; }

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

        public boolean contains(S val) { return stoIdx.containsKey(val);
        }

        public boolean isEmpty() { return lsIdx == 0;
        }

        public Pair<E, S> peek() {
            return isEmpty() ? null : pq.get(1);
        }
    }
}
