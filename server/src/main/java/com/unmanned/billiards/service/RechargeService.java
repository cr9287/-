package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Recharge;

import java.util.List;
import java.util.Optional;

public interface RechargeService {
    Recharge save(Recharge recharge);
    List<Recharge> findByAccount(String account);
    List<Recharge> findAll();
    Optional<Recharge> findById(Long id);
    void deleteById(Long id);
    
    void updateAccount(String oldAccount, String newAccount);
    
    // 查询指定时间范围内的充值记录（用于幂等性验证）
    List<Recharge> findByAccountAndTimeRange(String account, long timeRangeMillis);
}