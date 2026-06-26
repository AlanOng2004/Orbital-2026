package com.orbital.nusmaps.service;

import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.Edge;
import java.util.List;
import java.util.Map;
import java.util.function.DoubleUnaryOperator;

public interface SSSPService {

    // TODO:
    // Clear, Set, Overload (w/o Map) operations
    List<Edge> SSSP(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms);
    List<Edge> ASTAR(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms);
    double calculatePathWeight(List<Edge> path, Map<Edge.EdgeTag, DoubleUnaryOperator> perms);
}
