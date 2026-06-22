package com.orbital.nusmaps.implement;

import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.List;
import java.util.Collection;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;
import java.util.HashMap;
import java.util.Comparator;
import java.util.PriorityQueue;
import java.util.function.DoubleUnaryOperator;

@Service
public class SSSPServiceImpl implements SSSPService {
    private final ObjectBigList<Edge> bigListofAllEdges = new ObjectBigArrayBigList<>();
    private final ObjectBigList<Node> bigListofAllNodes = new ObjectBigArrayBigList<>();
    private final HashMap<Long, Node> nodesById = new HashMap<>();
    private final HashMap<Long, List<Edge>> adjList = new HashMap<>();
    private final EdgeRepository edgeRepository;
    private final NodeRepository nodeRepository;
    private static final Map<Edge.EdgeTag, DoubleUnaryOperator> edgefns = Map.of(
            Edge.EdgeTag.Bus, dist -> Math.max(0.1, dist * 0.35),
            Edge.EdgeTag.Sheltered, dist -> dist * 0.98,
            Edge.EdgeTag.Keycard, dist -> dist * 1.05,
            Edge.EdgeTag.Stair, dist -> dist * 1.15,
            Edge.EdgeTag.Ramp, dist -> dist * 1.2,
            Edge.EdgeTag.Elevator, dist -> dist * 1.25
    );

    @Autowired
    public SSSPServiceImpl(EdgeRepository edgeRepository, NodeRepository nodeRepository) {
        this.edgeRepository = edgeRepository;
        this.nodeRepository = nodeRepository;
    }
    public SSSPServiceImpl(Collection<Edge> edgeList, Collection<Node> nodeList) {
        initialiseGraph(new ArrayList<>(nodeList), new ArrayList<>(edgeList));
        edgeRepository = null; nodeRepository = null;
    }

    @PostConstruct
    @Transactional(readOnly = true)
    public void initGraphData() {
        if (edgeRepository == null || nodeRepository == null) {
            System.out.println("Warning: No database repositories found. Operating under: Unit Test Mode.");
            return;
        }

        ArrayList<Node> nodes = nodeRepository.findAllNodes();
        ArrayList<Edge> edges = edgeRepository.findAllEdges();
        initialiseGraph(nodes, edges);
        System.out.println("Initialisation for SSSP Service... Completed!");
    }

    private void initialiseGraph(ArrayList<Node> nodes, ArrayList<Edge> edges) {
        bigListofAllNodes.clear();
        bigListofAllEdges.clear();
        nodesById.clear();
        adjList.clear();

        for (Node node : nodes) {
            if (node == null || node.getNodeId() == null) {
                continue;
            }
            bigListofAllNodes.add(node);
            nodesById.put(node.getNodeId(), node);
            adjList.put(node.getNodeId(), new ArrayList<>());
        }

        for (Edge edge : edges) {
            if (edge == null || edge.getSource() == null || edge.getTarget() == null) {
                continue;
            }

            Long sourceId = edge.getSource().getNodeId();
            Long targetId = edge.getTarget().getNodeId();
            Node canonicalSource = nodesById.get(sourceId);
            Node canonicalTarget = nodesById.get(targetId);
            if (canonicalSource == null || canonicalTarget == null) {
                continue;
            }

            edge.setSource(canonicalSource);
            edge.setTarget(canonicalTarget);
            bigListofAllEdges.add(edge);
            adjList.computeIfAbsent(sourceId, ignored -> new ArrayList<>()).add(edge);
        }
    }

    @Override
    public List<Edge> SSSP(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms) {
        if (source == null || target == null || source.getNodeId() == null || target.getNodeId() == null) {
            return List.of();
        }

        Map<Edge.EdgeTag, DoubleUnaryOperator> activePerms = perms == null ? Map.of() : perms;
        Long sourceId = source.getNodeId();
        Long targetId = target.getNodeId();
        if (!nodesById.containsKey(sourceId) || !nodesById.containsKey(targetId)) {
            return List.of();
        }

        HashMap<Long, Double> dist = new HashMap<>();
        HashMap<Long, Edge> parentEdge = new HashMap<>();
        PriorityQueue<Pair<Double, Long>> pq = new PriorityQueue<>();

        dist.put(sourceId, 0.0);
        pq.add(new Pair<>(0.0, sourceId));

        while (!pq.isEmpty()) {
            Pair<Double, Long> current = pq.poll();
            Long currentId = current.getVal();
            double currentDist = current.getKey();

            if (currentDist > dist.getOrDefault(currentId, Double.POSITIVE_INFINITY)) {
                continue;
            }
            if (currentId.equals(targetId)) {
                break;
            }

            for (Edge edge : adjList.getOrDefault(currentId, List.of())) {
                Long nextId = edge.getTarget().getNodeId();
                double nextDist = currentDist + getEffectiveWeight(edge, activePerms);
                if (nextDist < dist.getOrDefault(nextId, Double.POSITIVE_INFINITY)) {
                    dist.put(nextId, nextDist);
                    parentEdge.put(nextId, edge);
                    pq.add(new Pair<>(nextDist, nextId));
                }
            }
        }

        if (!sourceId.equals(targetId) && !parentEdge.containsKey(targetId)) {
            return List.of();
        }

        ArrayList<Edge> path = new ArrayList<>();
        Long currentId = targetId;
        while (!currentId.equals(sourceId)) {
            Edge edge = parentEdge.get(currentId);
            if (edge == null) {
                return List.of();
            }
            path.add(edge);
            currentId = edge.getSource().getNodeId();
        }
        Collections.reverse(path);
        return path;
    }

    @Override
    public List<Edge> ASTAR(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms) {
        return null;
    }

    private double getEffectiveWeight(Edge edge, Map<Edge.EdgeTag, DoubleUnaryOperator> perms) {
        double weight = edge.getWeight();

        if (Boolean.TRUE.equals(edge.isBus())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Bus).applyAsDouble(weight);
        } else if (Boolean.TRUE.equals(edge.isSheltered())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Sheltered).applyAsDouble(weight);
        }

        if (Boolean.TRUE.equals(edge.isKeycard())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Keycard).applyAsDouble(weight);
        }
        if (Boolean.TRUE.equals(edge.isStair())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Stair).applyAsDouble(weight);
        }
        if (Boolean.TRUE.equals(edge.isRamp())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Ramp).applyAsDouble(weight);
        }
        if (Boolean.TRUE.equals(edge.isElevator())) {
            weight = getWeightFunction(perms, Edge.EdgeTag.Elevator).applyAsDouble(weight);
        }

        return weight;
    }

    private DoubleUnaryOperator getWeightFunction(
            Map<Edge.EdgeTag, DoubleUnaryOperator> perms,
            Edge.EdgeTag tag
    ) {
        DoubleUnaryOperator weightFunction = perms.get(tag);
        return weightFunction == null ? edgefns.get(tag) : weightFunction;
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

        public Heap() { pq.add(null); }
        public Heap(Comparator<E> c) {
            this.comparator = c;
            pq.add(null);
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

        public boolean contains(S val) { return stoIdx.containsKey(val);
        }

        public boolean isEmpty() { return lsIdx == 0;
        }

        public Pair<E, S> peek() {
            return isEmpty() ? null : pq.get(1);
        }
    }
}
