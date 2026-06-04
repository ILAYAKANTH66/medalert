package com.medalert.service;

import com.medalert.dto.AuthenticationRequest;
import com.medalert.dto.AuthenticationResponse;
import com.medalert.dto.RegisterRequest;
import com.medalert.dto.UserProfileResponse;
import com.medalert.model.CaretakerLink;
import com.medalert.model.Role;
import com.medalert.model.User;
import com.medalert.repository.CaretakerLinkRepository;
import com.medalert.repository.UserRepository;
import com.medalert.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    
    private final UserRepository repository;
    private final CaretakerLinkRepository caretakerLinkRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserPreferencesService userPreferencesService;

    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        var userBuilder = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole());
        
        if (request.getRole() == Role.PATIENT) {
            userBuilder.caretakerToken(generateUniqueToken());
        }

        var user = userBuilder.build();
        repository.save(user);
        userPreferencesService.ensureDefaultPreferences(user);

        // Optionally link caretaker to patient upon registration if token is provided
        if (request.getRole() == Role.CARETAKER && request.getCaretakerToken() != null && !request.getCaretakerToken().trim().isEmpty()) {
            User patient = repository.findByCaretakerToken(request.getCaretakerToken().trim())
                    .orElseThrow(() -> new RuntimeException("Patient with given token not found"));
            
            CaretakerLink link = CaretakerLink.builder()
                    .caretaker(user)
                    .patient(patient)
                    .build();
            caretakerLinkRepository.save(link);
        }

        var jwtToken = jwtService.generateToken(buildTokenClaims(user), user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .user(mapToProfile(user))
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        var jwtToken = jwtService.generateToken(buildTokenClaims(user), user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .user(mapToProfile(user))
                .build();
    }

    private Map<String, Object> buildTokenClaims(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        return claims;
    }

    public UserProfileResponse getProfile(String email) {
        User user = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToProfile(user);
    }

    private UserProfileResponse mapToProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .caretakerToken(user.getCaretakerToken())
                .build();
    }

    private String generateUniqueToken() {
        return "MEDA" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}

