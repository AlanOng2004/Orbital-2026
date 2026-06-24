package com.orbital.nusmaps.implement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.exception.UserAlreadyExistsException;
import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class RegisterServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private RegisterServiceImpl registerService;

    @BeforeEach
    void setUp() {
        registerService = new RegisterServiceImpl(userRepository, passwordEncoder);
    }

    @Test
    void registerNormalizesAndPersistsUser() {
        User user = TestDataFactory.user(null, "  alice  ", "plain-password", null);
        user.setCreatedAt(null);
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(passwordEncoder.encode("plain-password")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User saved = registerService.register(user);

        ArgumentCaptor<User> savedUserCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUserCaptor.capture());
        User persisted = savedUserCaptor.getValue();

        assertSame(saved, persisted);
        assertEquals("alice", persisted.getUsername());
        assertEquals("encoded-password", persisted.getPassword());
        assertFalse(persisted.getIsAdmin());
        assertNotNull(persisted.getCreatedAt());
    }

    @Test
    void registerPreservesExistingCreatedAtAndAdminFlag() {
        LocalDateTime createdAt = LocalDateTime.of(2023, 5, 6, 7, 8);
        User user = TestDataFactory.user(null, "alice", "plain-password", true);
        user.setCreatedAt(createdAt);

        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(passwordEncoder.encode("plain-password")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User saved = registerService.register(user);

        assertEquals(createdAt, saved.getCreatedAt());
        assertEquals(true, saved.getIsAdmin());
    }

    @Test
    void registerRejectsDuplicateUsername() {
        User user = TestDataFactory.user(null, "alice", "plain-password", false);
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        UserAlreadyExistsException ex = assertThrows(
                UserAlreadyExistsException.class,
                () -> registerService.register(user)
        );

        assertEquals("Username is already taken.", ex.getMessage());
        verify(userRepository).existsByUsername("alice");
        verifyNoMoreInteractions(userRepository);
    }

    @Test
    void registerRejectsBlankUsername() {
        User user = TestDataFactory.user(null, "   ", "plain-password", false);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> registerService.register(user)
        );

        assertEquals("Username is required.", ex.getMessage());
    }

    @Test
    void registerRejectsBlankPassword() {
        User user = TestDataFactory.user(null, "alice", " ", false);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> registerService.register(user)
        );

        assertEquals("Password is required.", ex.getMessage());
    }
}
