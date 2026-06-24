package com.orbital.nusmaps.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.dto.AuthResponse;
import com.orbital.nusmaps.dto.LoginRequest;
import com.orbital.nusmaps.dto.RegisterRequest;
import com.orbital.nusmaps.dto.UserResponse;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import com.orbital.nusmaps.service.JwtService;
import com.orbital.nusmaps.service.LoginService;
import com.orbital.nusmaps.service.RegisterService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private RegisterService registerService;

    @Mock
    private LoginService loginService;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    private AuthController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthController(registerService, loginService, jwtService, userRepository);
    }

    @Test
    void signupBuildsUserAndReturnsTokenizedResponse() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("alice");
        request.setPassword("password");
        request.setGender("female");
        request.setIsAdmin(null);

        User savedUser = TestDataFactory.user(5L, "alice", "encoded", false);
        savedUser.setGender(User.Gender.Female);
        when(registerService.register(org.mockito.ArgumentMatchers.any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(savedUser)).thenReturn("jwt-token");

        AuthResponse response = authController.signup(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(registerService).register(userCaptor.capture());
        User signupUser = userCaptor.getValue();

        assertEquals("alice", signupUser.getUsername());
        assertEquals("password", signupUser.getPassword());
        assertEquals(User.Gender.Female, signupUser.getGender());
        assertFalse(signupUser.getIsAdmin());
        assertEquals("jwt-token", response.getToken());
        assertEquals("alice", response.getUser().getUsername());
    }

    @Test
    void signupRejectsInvalidGender() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("alice");
        request.setPassword("password");
        request.setGender("invalid");

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authController.signup(request)
        );

        assertEquals("Invalid gender value.", ex.getMessage());
    }

    @Test
    void loginDelegatesToServiceAndReturnsAuthResponse() {
        LoginRequest request = new LoginRequest();
        request.setUsername("alice");
        request.setPassword("password");
        User user = TestDataFactory.user(10L, "alice", "encoded", true);
        when(loginService.login("alice", "password")).thenReturn(user);
        when(jwtService.generateToken(user)).thenReturn("jwt-token");

        AuthResponse response = authController.login(request);

        assertEquals("jwt-token", response.getToken());
        assertEquals("alice", response.getUser().getUsername());
        assertEquals(true, response.getUser().getIsAdmin());
    }

    @Test
    void meReturnsCurrentUserProfile() {
        User user = TestDataFactory.user(10L, "alice", "encoded", false);
        user.setGender(User.Gender.Other);
        Authentication authentication = new TestingAuthenticationToken("alice", null);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserResponse response = authController.me(authentication);

        assertEquals(10L, response.getUserId());
        assertEquals("alice", response.getUsername());
        assertEquals("Other", response.getGender());
    }
}
