package com.orbital.nusmaps.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbital.nusmaps.dto.AuthResponse;
import com.orbital.nusmaps.dto.LoginRequest;
import com.orbital.nusmaps.dto.RegisterRequest;
import com.orbital.nusmaps.dto.UserResponse;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import com.orbital.nusmaps.service.JwtService;
import com.orbital.nusmaps.service.LoginService;
import com.orbital.nusmaps.service.RegisterService;

import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegisterService registerService;
    private final LoginService loginService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AuthController(
        RegisterService registerService,
        LoginService loginService,
        JwtService jwtService,
        UserRepository userRepository
    ) {
        this.registerService = registerService;
        this.loginService = loginService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signup(@RequestBody RegisterRequest request) {
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(request.getPassword());
        newUser.setIsAdmin(Boolean.TRUE.equals(request.getIsAdmin()));

        if (request.getGender() != null && !request.getGender().isBlank()) {
            newUser.setGender(User.Gender.valueOf(request.getGender().trim()));
        }

        User savedUser = registerService.register(newUser);
        return buildAuthResponse(savedUser);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        User user = loginService.login(request.getUsername(), request.getPassword());
        return buildAuthResponse(user);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new IllegalArgumentException("User not found."));
        return toUserResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            user.getUserId(),
            user.getUsername(),
            user.getGender() == null ? null : user.getGender().name(),
            Boolean.TRUE.equals(user.getIsAdmin()),
            user.getCreatedAt()
        );
    }
}
