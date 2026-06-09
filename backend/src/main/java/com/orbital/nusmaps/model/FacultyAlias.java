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
import jakarta.persistence.Table;

@Entity
@Table(
        name = "faculty_aliases",
        indexes = {
                @Index(name = "idx_faculty_alias", columnList = "faculty_alias")
        },
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"faculty_id", "faculty_alias"})
        }
)
public class FacultyAlias {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long facultyAliasId;

    @Column(name = "faculty_alias", nullable = false)
    private String facultyAlias;

    @JsonBackReference("faculty-alias")
    @ManyToOne
    @JoinColumn(name = "faculty_id", nullable = false)
    private Faculty faculty;

    public FacultyAlias () {}

    public FacultyAlias(
            Long facultyAliasId,
            String facultyAlias,
            Faculty faculty
        ) {
        this.facultyAliasId = facultyAliasId;
        this.facultyAlias = facultyAlias;
        this.faculty = faculty;
    }

    // ================= Getters and Setters =================

    public Long getFacultyAliasId() { return facultyAliasId; }

    public void setFacultyAliasId(Long facultyAliasId) { this.facultyAliasId = facultyAliasId; }

    public String getFacultyAlias() { return facultyAlias; }

    public void setFacultyAlias(String facultyAlias) { this.facultyAlias = facultyAlias; }

    public Faculty getFaculty() { return faculty; }

    public void setFaculty(Faculty faculty) { this.faculty = faculty; }
}
