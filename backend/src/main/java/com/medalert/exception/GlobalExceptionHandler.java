package com.medalert.exception;

import com.medalert.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "An error occurred";
        HttpStatus status = resolveStatus(message);
        log.warn("[API] {} — {}", status.value(), message);
        return ResponseEntity.status(status).body(ApiResponse.error(message, status.value()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Authentication required";
        log.warn("[API] 401 — {}", message);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(message, HttpStatus.UNAUTHORIZED.value()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Access denied";
        log.warn("[API] 403 — {}", message);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(message, HttpStatus.FORBIDDEN.value()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(message, HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Invalid request body", HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("[API] 500 — Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected server error occurred", HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }

    /**
     * Resolves the appropriate HTTP status from a RuntimeException message.
     * Each condition is checked independently to avoid operator-precedence bugs.
     */
    private HttpStatus resolveStatus(String message) {
        if (message == null) {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }
        // 403 — explicit access denial or caretaker restrictions
        if (message.contains("Access Denied") || message.contains("Access denied")) {
            return HttpStatus.FORBIDDEN;
        }
        // 401 — unauthorized role or action
        if (message.startsWith("Unauthorized")) {
            return HttpStatus.FORBIDDEN; // role mismatch, not missing credentials → 403
        }
        // 409 — duplicate / conflict
        if (message.contains("already linked") || message.contains("already exists")) {
            return HttpStatus.CONFLICT;
        }
        // 404 — resource not found
        if (message.contains("not found") || message.contains("Not found")) {
            return HttpStatus.NOT_FOUND;
        }
        // 400 — bad input
        if (message.contains("required") || message.contains("invalid") || message.contains("Invalid")) {
            return HttpStatus.BAD_REQUEST;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
