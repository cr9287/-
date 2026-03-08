package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Consumption;
import java.util.List;

public interface ConsumptionService {
    List<Consumption> findAll();
    Consumption findById(Long id);
    Consumption save(Consumption consumption);
    void deleteById(Long id);
    List<Consumption> findByAccount(String account);
    List<Consumption> findBySessionId(Long sessionId);
    
    void updateAccount(String oldAccount, String newAccount);
}