package com.orbital.nusmaps.implement;

import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.orbital.nusmaps.exception.UserAlreadyExistsException;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import com.orbital.nusmaps.service.RegisterService;

@Service
public class RegisterServiceImpl implements RegisterService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RegisterServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User register(User user) {
        String normalizedUsername = normalizeUsername(user.getUsername());
        String rawPassword = normalizePassword(user.getPassword());

        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new UserAlreadyExistsException("Username is already taken.");
        }

        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setIsAdmin(Boolean.TRUE.equals(user.getIsAdmin()));

        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }

        return userRepository.save(user);
    }

    private String normalizeUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required.");
        }
        return username.trim();
    }

    private String normalizePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required.");
        }
        return password;
    }
}
