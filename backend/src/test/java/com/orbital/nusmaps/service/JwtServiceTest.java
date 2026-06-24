package com.orbital.nusmaps.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbital.nusmaps.TestDataFactory;
import com.orbital.nusmaps.model.User;
import java.util.Base64;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = Base64.getEncoder().encodeToString(
            "01234567890123456789012345678901".getBytes()
    );

    @Test
    void generateTokenRoundTripsClaims() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        User user = TestDataFactory.user(42L, "alice", "password", true);

        String token = jwtService.generateToken(user);

        assertEquals("alice", jwtService.extractUsername(token));
        assertEquals(42L, jwtService.extractUserId(token));
        assertTrue(jwtService.extractIsAdmin(token));
        assertTrue(jwtService.isTokenValid(token, user));
    }

    @Test
    void tokenIsInvalidForDifferentUser() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        User tokenUser = TestDataFactory.user(42L, "alice", "password", false);
        User otherUser = TestDataFactory.user(42L, "bob", "password", false);

        String token = jwtService.generateToken(tokenUser);

        assertFalse(jwtService.isTokenValid(token, otherUser));
    }

    @Test
    void expiredTokenThrowsWhenValidated() throws InterruptedException {
        JwtService jwtService = new JwtService(SECRET, 1);
        User user = TestDataFactory.user(42L, "alice", "password", false);
        String token = jwtService.generateToken(user);

        Thread.sleep(10);

        assertThrows(ExpiredJwtException.class, () -> jwtService.isTokenValid(token, user));
    }
}
