package com.orbital.nusmaps.service;

import com.orbital.nusmaps.model.User;

public interface LoginService {

    User login(String username, String password);
}
