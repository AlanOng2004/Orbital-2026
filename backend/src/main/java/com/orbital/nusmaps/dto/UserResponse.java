package com.orbital.nusmaps.dto;

import java.time.LocalDateTime;

public class UserResponse {

    private final Long userId;
    private final String username;
    private final String gender;
    private final Boolean isAdmin;
    private final LocalDateTime createdAt;

    public UserResponse(Long userId, String username, String gender, Boolean isAdmin, LocalDateTime createdAt) {
        this.userId = userId;
        this.username = username;
        this.gender = gender;
        this.isAdmin = isAdmin;
        this.createdAt = createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getGender() {
        return gender;
    }

    public Boolean getIsAdmin() {
        return isAdmin;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
