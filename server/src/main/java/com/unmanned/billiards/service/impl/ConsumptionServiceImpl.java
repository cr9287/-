package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.Consumption;
import com.unmanned.billiards.repository.ConsumptionRepository;
import com.unmanned.billiards.service.ConsumptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConsumptionServiceImpl implements ConsumptionService {
    @Autowired
    private ConsumptionRepository consumptionRepository;

    @Override
    public List<Consumption> findAll() {
        return consumptionRepository.findAll();
    }

    @Override
    public Consumption findById(Long id) {
        return consumptionRepository.findById(id).orElse(null);
    }

    @Override
    public Consumption save(Consumption consumption) {
        return consumptionRepository.save(consumption);
    }

    @Override
    public void deleteById(Long id) {
        consumptionRepository.deleteById(id);
    }

    @Override
    public List<Consumption> findByAccount(String account) {
        return consumptionRepository.findByAccount(account);
    }

    @Override
    public List<Consumption> findBySessionId(Long sessionId) {
        return consumptionRepository.findBySessionId(sessionId);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateAccount(String oldAccount, String newAccount) {
        consumptionRepository.updateAccount(oldAccount, newAccount);
    }
}