package com.orbital.nusmaps.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    public enum Gender {
        Male,
        Female,
        Other
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(name = "username", unique = true, nullable = false)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private Gender gender;

    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "timetable_url", columnDefinition = "TEXT")
    private String timetableUrl;

    public User () {}

    public User(
            Long userId,
            String username,
            String password,
            Gender gender,
            Boolean isAdmin,
            LocalDateTime createdAt,
            String timetableUrl
        ) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.gender = gender;
        this.isAdmin = isAdmin;
        this.createdAt = createdAt;
        this.timetableUrl = timetableUrl;
    }

    // ================= Getters and Setters =================

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public Boolean getIsAdmin() {
        return isAdmin;
    }

    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getTimetableUrl() { return this.timetableUrl; }

    public void setTimetableUrl(String timetableUrl) { this.timetableUrl = timetableUrl; }
}
