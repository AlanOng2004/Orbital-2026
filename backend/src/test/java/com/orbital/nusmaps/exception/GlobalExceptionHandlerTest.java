package com.orbital.nusmaps.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.orbital.nusmaps.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleUserAlreadyExistsReturnsConflict() {
        ResponseEntity<ErrorResponse> response =
                handler.handleUserAlreadyExists(new UserAlreadyExistsException("taken"));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("taken", response.getBody().getError());
    }

    @Test
    void handleAuthenticationReturnsUnauthorized() {
        ResponseEntity<ErrorResponse> response =
                handler.handleAuthentication(new AuthenticationException("bad creds"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("bad creds", response.getBody().getError());
    }

    @Test
    void handleBadRequestReturnsBadRequest() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBadRequest(new IllegalArgumentException("bad input"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("bad input", response.getBody().getError());
    }
}
