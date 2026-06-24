package com.orbital.nusmaps.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.dto.AnnotatorImportRequest;
import com.orbital.nusmaps.dto.AnnotatorImportResponse;
import com.orbital.nusmaps.model.Edge;
import com.orbital.nusmaps.model.Floorplan;
import com.orbital.nusmaps.model.Node;
import com.orbital.nusmaps.repository.EdgeRepository;
import com.orbital.nusmaps.repository.FloorplanRepository;
import com.orbital.nusmaps.repository.NodeRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminAnnotatorImportControllerTest {

    @Mock
    private NodeRepository nodeRepository;

    @Mock
    private EdgeRepository edgeRepository;

    @Mock
    private FloorplanRepository floorplanRepository;

    private AdminAnnotatorImportController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminAnnotatorImportController(nodeRepository, edgeRepository, floorplanRepository);
    }

    @Test
    void importAnnotatorGraphPersistsNodesAndEdges() {
        Floorplan floorplan = TestDataFactory.floorplan(10L, TestDataFactory.building(5L, "COM1"), 1, "L1.png");
        when(floorplanRepository.findById(10L)).thenReturn(Optional.of(floorplan));
        when(nodeRepository.save(any(Node.class))).thenAnswer(invocation -> {
            Node node = invocation.getArgument(0);
            node.setNodeId(node.getNodeName().equals("Node A") ? 101L : 102L);
            return node;
        });

        AnnotatorImportRequest request = new AnnotatorImportRequest();
        AnnotatorImportRequest.AnnotatorNodeImport nodeA = new AnnotatorImportRequest.AnnotatorNodeImport();
        nodeA.setTempId(1L);
        nodeA.setNodeName("Node A");
        nodeA.setDualName("  ");
        nodeA.setNodeType("Room");
        nodeA.setFloorplanId(10L);
        nodeA.setXCoordinate(10.0);
        nodeA.setYCoordinate(20.0);
        nodeA.setLongitude(1.30);
        nodeA.setLatitude(103.77);

        AnnotatorImportRequest.AnnotatorNodeImport nodeB = new AnnotatorImportRequest.AnnotatorNodeImport();
        nodeB.setTempId(2L);
        nodeB.setNodeName("Node B");
        nodeB.setNodeType("Toilet");
        nodeB.setFloorplanId(10L);
        nodeB.setXCoordinate(30.0);
        nodeB.setYCoordinate(40.0);
        nodeB.setLongitude(103.78);
        nodeB.setLatitude(1.31);

        AnnotatorImportRequest.AnnotatorEdgeImport edge = new AnnotatorImportRequest.AnnotatorEdgeImport();
        edge.setSourceTempId(1L);
        edge.setTargetTempId(2L);
        edge.setWeight(12.5);
        edge.setIsElevator(true);

        request.setNodes(List.of(nodeA, nodeB));
        request.setEdges(List.of(edge));

        AnnotatorImportResponse response = controller.importAnnotatorGraph(request);

        ArgumentCaptor<Node> nodeCaptor = ArgumentCaptor.forClass(Node.class);
        verify(nodeRepository, org.mockito.Mockito.times(2)).save(nodeCaptor.capture());
        Node savedFirstNode = nodeCaptor.getAllValues().get(0);
        assertEquals(103.77, savedFirstNode.getLongitude());
        assertEquals(1.30, savedFirstNode.getLatitude());
        assertNull(savedFirstNode.getDualName());

        ArgumentCaptor<Edge> edgeCaptor = ArgumentCaptor.forClass(Edge.class);
        verify(edgeRepository).save(edgeCaptor.capture());
        assertEquals(101L, edgeCaptor.getValue().getSource().getNodeId());
        assertEquals(102L, edgeCaptor.getValue().getTarget().getNodeId());
        assertEquals(true, edgeCaptor.getValue().isElevator());

        assertEquals(2, response.getImportedNodes());
        assertEquals(1, response.getImportedEdges());
        assertEquals(101L, response.getNodeIdMap().get(1L));
    }

    @Test
    void importAnnotatorGraphRejectsDuplicateTempIds() {
        Floorplan floorplan = TestDataFactory.floorplan(10L, TestDataFactory.building(5L, "COM1"), 1, "L1.png");
        when(floorplanRepository.findById(10L)).thenReturn(Optional.of(floorplan));
        when(nodeRepository.save(any(Node.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AnnotatorImportRequest.AnnotatorNodeImport first = new AnnotatorImportRequest.AnnotatorNodeImport();
        first.setTempId(1L);
        first.setNodeName("Node A");
        first.setNodeType("Room");
        first.setFloorplanId(10L);
        first.setXCoordinate(10.0);
        first.setYCoordinate(10.0);
        first.setLongitude(103.7);
        first.setLatitude(1.3);

        AnnotatorImportRequest.AnnotatorNodeImport second = new AnnotatorImportRequest.AnnotatorNodeImport();
        second.setTempId(1L);
        second.setNodeName("Node B");
        second.setNodeType("Room");
        second.setFloorplanId(10L);
        second.setXCoordinate(20.0);
        second.setYCoordinate(20.0);
        second.setLongitude(103.8);
        second.setLatitude(1.4);

        AnnotatorImportRequest request = new AnnotatorImportRequest();
        request.setNodes(List.of(first, second));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> controller.importAnnotatorGraph(request)
        );

        assertEquals("Duplicate node tempId: 1", ex.getMessage());
        verify(nodeRepository, org.mockito.Mockito.times(1)).save(any(Node.class));
        verify(edgeRepository, never()).save(any(Edge.class));
    }
}
