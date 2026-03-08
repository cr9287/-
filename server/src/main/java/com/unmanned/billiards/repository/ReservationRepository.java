package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByAccount(String account);
    List<Reservation> findByTableId(Long tableId);
    List<Reservation> findByTableIdAndAccountAndStatus(Long tableId, String account, String status);
    List<Reservation> findByStatus(String status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Reservation r SET r.account = ?2 WHERE r.account = ?1")
    void updateAccount(String oldAccount, String newAccount);
}