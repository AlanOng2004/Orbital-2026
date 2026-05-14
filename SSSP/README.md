# Custom Single-Source Shortest Path (SSSP) Engine

This documentation focuses on the implementation details and design decisions behind the custom SSSP engine developed for the campus navigation system.

---

## 1. Core Pathfinding Implementation
The engine utilizes a specialized version of **Dijkstra’s Algorithm** to calculate optimal routes across the NUS campus. Unlike standard library implementations, this engine is built from the ground up to allow for granular control over the search frontier and weight dynamics.

### Optimized Priority Queue (Custom Min-Heap)
To achieve the theoretical efficiency of Dijkstra’s, a custom Min-Heap was implemented.
*   **StoIdx Mapping**: The heap maintains a mapping of node IDs to their current indices within the heap array.
*   **O(log n) DecrementKey**: This mapping allows for native `decrementKey` operations. When a shorter path to a node is found, the engine updates it in-place rather than using "lazy deletion" (inserting duplicates), which keeps the heap size minimal and ensures consistent $O(\log n)$ performance.
*   **Memory Efficiency**: By avoiding duplicate entries for the same node, the engine reduces memory overhead and prevents unnecessary processing of stale data during the extraction phase.

---

## 2. Multi-Modal Weighting Logic
The engine does not treat all edges equally. It applies a dynamic weighting model to simulate realistic travel times across different modes of transport.

| Edge Type | Weighting Formula | Design Rationale |
| :--- | :--- | :--- |
| **Walkway** | $dist$ | Uses physical distance as the baseline for travel time. |
| **Staircase** | $dist \times stair\_factor + stair\_offset$ | Applies a penalty to account for the physical exertion and slower pace of vertical movement. |
| **Bus** | $dist \times bus\_factor + bus\_offset$ | Incorporates real-time data to model wait times and vehicle congestion. |

---

## 3. Performance & Scalability Decisions

### Bulk Fetching & SQL Minimization
One of the primary bottlenecks identified was database access latency. To mitigate this, the engine employs a **Floor-Cluster Fetching** strategy. Instead of querying for adjacent nodes individually as the algorithm expands, the system fetches all edges for an entire building floor (or cluster) into a local `HashMap` cache. This reduces the number of SQL round-trips—the most expensive part of the process—to a near-constant factor relative to the number of buildings traversed.

### Spatial Pruning (Vertical Bounding)
To optimize vertical navigation (elevators and stairs), the engine implements a search boundary based on the source and destination floors.
*   **Concept**: If a user is traveling from Level 1 to Level 2, the algorithm is discouraged or strictly prohibited from exploring Level 3 and above. 
*   **Impact**: This effectively "prunes" the search tree, preventing the algorithm from wasting cycles calculating paths through the top floors of a building when the target is on the ground floor.

### Global Cache & State Management
The engine utilizes a global `HashMap` for the `adjList` and `edgeList`.
*   **O(1) Access**: Once a floor cluster is loaded into memory, subsequent pathfinding requests for the same area require zero database hits.
*   **Safe Resource Management**: All database interactions within the engine use **Try-with-Resources** to ensure that connections and result sets are closed immediately after the bulk fetch, preventing resource leaks during heavy concurrent use.

---

## 4. Current Roadmap

### Engine Refinement
- [ ] **NextBus API Dynamic Updates**: Finalize the service that pushes live bus frequency data into the `bus_factor` of the active cache.
- [ ] **Bridge-Node Logic**: Refine the vertical pruning logic to ensure the algorithm still detects inter-building bridges that may only exist on specific higher floors.
- [ ] **Cache Invalidation**: Implement a TTL (Time-to-Live) or event-based flush for the edge cache to ensure real-time changes in campus accessibility (e.g., closed walkways) are reflected.

### Integration
- [ ] **Nearest Node Resolution**: Develop the client-side logic to snap arbitrary user coordinates to the closest valid node in the graph.
- [ ] **EdgeList Schema**: Standardize the output JSON to ensure the frontend can reconstruct the visual path using only edge IDs and weight data.