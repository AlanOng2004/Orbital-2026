package com.orbital.nusmaps.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.orbital.nusmaps.model.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    @Modifying
    @Transactional
    @Query(value = """
        UPDATE users
        SET password = :password,
            gender = 'Other',
            is_admin = TRUE,
            created_at = CURRENT_TIMESTAMP
        WHERE username = :username
        """, nativeQuery = true)
    int resetAdminAccount(
        @Param("username") String username,
        @Param("password") String password
    );
}
