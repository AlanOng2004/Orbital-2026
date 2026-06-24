package com.orbital.nusmaps.implement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.exception.AuthenticationException;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class LoginServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private LoginServiceImpl loginService;

    @BeforeEach
    void setUp() {
        loginService = new LoginServiceImpl(userRepository, passwordEncoder);
    }

    @Test
    void loginReturnsUserWhenCredentialsAreValid() {
        User user = TestDataFactory.user(1L, "alice", "encoded-password", false);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("plain-password", "encoded-password")).thenReturn(true);

        User result = loginService.login("  alice  ", "plain-password");

        assertSame(user, result);
        verify(userRepository).findByUsername("alice");
        verify(passwordEncoder).matches("plain-password", "encoded-password");
    }

    @Test
    void loginRejectsBlankUsername() {
        AuthenticationException ex = assertThrows(
                AuthenticationException.class,
                () -> loginService.login("   ", "password")
        );

        assertEquals("Username is required.", ex.getMessage());
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void loginRejectsBlankPassword() {
        AuthenticationException ex = assertThrows(
                AuthenticationException.class,
                () -> loginService.login("alice", " ")
        );

        assertEquals("Password is required.", ex.getMessage());
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void loginRejectsUnknownUsername() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.empty());

        AuthenticationException ex = assertThrows(
                AuthenticationException.class,
                () -> loginService.login("alice", "password")
        );

        assertEquals("Invalid username or password.", ex.getMessage());
        verify(userRepository).findByUsername("alice");
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = TestDataFactory.user(1L, "alice", "encoded-password", false);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        AuthenticationException ex = assertThrows(
                AuthenticationException.class,
                () -> loginService.login("alice", "wrong-password")
        );

        assertEquals("Invalid username or password.", ex.getMessage());
        verify(passwordEncoder).matches("wrong-password", "encoded-password");
    }
}
