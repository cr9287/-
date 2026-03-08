package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    Admin findByAccount(String account);
    boolean existsByAccount(String account);
}