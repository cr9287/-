package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Consumption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConsumptionRepository extends JpaRepository<Consumption, Long> {
    List<Consumption> findByAccount(String account);
    List<Consumption> findBySessionId(Long sessionId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Consumption c SET c.account = ?2 WHERE c.account = ?1")
    void updateAccount(String oldAccount, String newAccount);
}