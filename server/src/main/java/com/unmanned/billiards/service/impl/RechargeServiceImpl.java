package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.Recharge;
import com.unmanned.billiards.repository.RechargeRepository;
import com.unmanned.billiards.service.RechargeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RechargeServiceImpl implements RechargeService {
    @Autowired
    private RechargeRepository rechargeRepository;

    @Override
    public Recharge save(Recharge recharge) {
        return rechargeRepository.save(recharge);
    }

    @Override
    public List<Recharge> findByAccount(String account) {
        return rechargeRepository.findByAccount(account);
    }

    @Override
    public List<Recharge> findAll() {
        return rechargeRepository.findAll();
    }

    @Override
    public Optional<Recharge> findById(Long id) {
        return rechargeRepository.findById(id);
    }

    @Override
    public void deleteById(Long id) {
        rechargeRepository.deleteById(id);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateAccount(String oldAccount, String newAccount) {
        rechargeRepository.updateAccount(oldAccount, newAccount);
    }
    
    @Override
    public List<Recharge> findByAccountAndTimeRange(String account, long timeRangeMillis) {
        List<Recharge> recharges = rechargeRepository.findByAccount(account);
        if (recharges == null || recharges.isEmpty()) {
            return recharges;
        }
        
        long currentTime = System.currentTimeMillis();
        long thresholdTime = currentTime - timeRangeMillis;
        
        // 过滤出指定时间范围内的记录
        return recharges.stream()
            .filter(recharge -> {
                if (recharge.getCreatedAt() == null) {
                    return false;
                }
                return recharge.getCreatedAt().getTime() >= thresholdTime;
            })
            .collect(java.util.stream.Collectors.toList());
    }
}