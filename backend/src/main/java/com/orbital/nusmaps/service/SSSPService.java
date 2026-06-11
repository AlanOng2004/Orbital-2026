package com.orbital.nusmaps.service;

import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.model.Edge;
import java.util.List;

public interface SSSPService {

    // TODO:
    // Clear, Set, Overload (w/o Map) operations
    List<Edge> SSSP(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms);
    List<Edge> ASTAR(Node source, Node target, Map<Edge.EdgeTag, DoubleUnaryOperator> perms);
}
