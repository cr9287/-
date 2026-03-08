package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Recharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RechargeRepository extends JpaRepository<Recharge, Long> {
    List<Recharge> findByAccount(String account);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Recharge r SET r.account = ?2 WHERE r.account = ?1")
    void updateAccount(String oldAccount, String newAccount);
}