package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Index;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "node_aliases",
        indexes = {
                @Index(name = "idx_node_alias", columnList = "node_alias")
        },
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"node_id", "node_alias"})
        }
)
public class NodeAlias {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long nodeAliasId;

    @Column(name = "node_alias", nullable = false)
    private String nodeAlias;

    @JsonBackReference("node-alias")
    @ManyToOne
    @JoinColumn(name = "node_id", nullable = false)
    private Node node;

    public NodeAlias () {}

    public NodeAlias(
            Long nodeAliasId,
            String nodeAlias,
            Node node
        ) {
        this.nodeAliasId = nodeAliasId;
        this.nodeAlias = nodeAlias;
        this.node = node;
    }

    // ================= Getters and Setters =================

    public Long getNodeAliasId() { return nodeAliasId; }

    public void setNodeAliasId(Long nodeAliasId) { this.nodeAliasId = nodeAliasId; }

    public String getNodeAlias() { return nodeAlias; }

    public void setNodeAlias(String nodeAlias) { this.nodeAlias = nodeAlias; }

    public Node getNode() {
        return node;
    }

    public void setNode(Node node) {
        this.node = node;
    }
}
