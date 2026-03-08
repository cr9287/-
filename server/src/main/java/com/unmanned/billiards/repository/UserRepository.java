package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    User findByAccountIgnoreCase(String account);
    boolean existsByAccountIgnoreCase(String account);
}