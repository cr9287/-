package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Reservation;
import java.util.List;

public interface ReservationService {
    List<Reservation> findAll();
    Reservation findById(Long id);
    Reservation save(Reservation reservation);
    void deleteById(Long id);
    List<Reservation> findByAccount(String account);
    List<Reservation> findByTableIdAndDate(Long tableId, String date);
    List<Reservation> findByTableId(Long tableId);
    List<Reservation> findByTableIdAndAccountAndStatus(Long tableId, String account, String status);
    
    void updateAccount(String oldAccount, String newAccount);
}