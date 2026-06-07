package com.orbital.nusmaps.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

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

    @JsonManagedReference("sp-user")
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SavedPlace> savedPlaces = new ArrayList<>();

    @JsonManagedReference("sr-user")
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SavedRoute> savedRoutes = new ArrayList<>();

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

    public List<SavedPlace> getSavedPlaces() { return this.savedPlaces; }

    public void setSavedPlaces(List<SavedPlace> savedPlaces) {
        this.savedPlaces.clear();
        if (savedPlaces == null) {
            return;
        }
        for (SavedPlace savedPlace : savedPlaces) {
            addSavedPlace(savedPlace);
        }
    }

    public void addSavedPlace(SavedPlace savedPlace) {
        if (savedPlace == null) {
            return;
        }
        savedPlaces.add(savedPlace);
        savedPlace.setUser(this);
    }

    public void removeSavedPlace(SavedPlace savedPlace) {
        if (savedPlace == null) {
            return;
        }
        savedPlaces.remove(savedPlace);
        savedPlace.setUser(null);
    }

    public List<SavedRoute> getSavedRoutes() { return this.savedRoutes; }

    public void setSavedRoutes(List<SavedRoute> savedRoutes) {
        this.savedRoutes.clear();
        if (savedRoutes == null) {
            return;
        }
        for (SavedRoute savedRoute : savedRoutes) {
            addSavedRoute(savedRoute);
        }
    }

    public void addSavedRoute(SavedRoute savedRoute) {
        if (savedRoute == null) {
            return;
        }
        savedRoutes.add(savedRoute);
        savedRoute.setUser(this);
    }

    public void removeSavedRoute(SavedRoute savedRoute) {
        if (savedRoute == null) {
            return;
        }
        savedRoutes.remove(savedRoute);
        savedRoute.setUser(null);
    }
}
