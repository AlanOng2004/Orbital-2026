package com.orbital.nusmaps.dto;

public class UserResponse {

    private final Integer userId;
    private final String username;
    private final String gender;
    private final Boolean isAdmin;
    private final String createdAt;

    public UserResponse(Integer userId, String username, String gender, Boolean isAdmin, String createdAt) {
        this.userId = userId;
        this.username = username;
        this.gender = gender;
        this.isAdmin = isAdmin;
        this.createdAt = createdAt;
    }

    public Integer getUserId() {
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

    public String getCreatedAt() {
        return createdAt;
    }
}
