package com.orbital.nusmaps.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.orbital.nusmaps.model.User;
import com.orbital.nusmaps.repository.UserRepository;

@Configuration
public class AdminAccountInitializer {

    @Bean
    public CommandLineRunner seedAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.existsByUsername("admin1")) {
                userRepository.resetAdminAccount("admin1", passwordEncoder.encode("password"));
                return;
            }

            User adminUser = new User();
            adminUser.setUsername("admin1");
            adminUser.setPassword(passwordEncoder.encode("password"));
            adminUser.setGender(User.Gender.Other);
            adminUser.setIsAdmin(true);
            adminUser.setCreatedAt(LocalDateTime.now());

            userRepository.save(adminUser);
        };
    }
}
