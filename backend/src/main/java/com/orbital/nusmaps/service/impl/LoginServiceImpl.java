package com.orbital.nusmaps.service.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.orbital.nusmaps.exception.AuthenticationException;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import com.orbital.nusmaps.service.LoginService;

@Service
public class LoginServiceImpl implements LoginService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User login(String username, String password) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedPassword = normalizePassword(password);

        User user = userRepository.findByUsername(normalizedUsername)
            .orElseThrow(() -> new AuthenticationException("Invalid username or password."));

        if (!passwordEncoder.matches(normalizedPassword, user.getPassword())) {
            throw new AuthenticationException("Invalid username or password.");
        }

        return user;
    }

    private String normalizeUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new AuthenticationException("Username is required.");
        }
        return username.trim();
    }

    private String normalizePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new AuthenticationException("Password is required.");
        }
        return password;
    }
}
