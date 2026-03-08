package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.entity.Session;
import com.unmanned.billiards.entity.User;
import com.unmanned.billiards.repository.ReservationRepository;
import com.unmanned.billiards.repository.SessionRepository;
import com.unmanned.billiards.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 自动结算服务
 * 功能：
 * 1. 检查预约时间，当预约时间到达时自动结算当前进行中的会话
 * 2. 提醒用户预约时间到达
 */
@Service
public class AutoSettlementService {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillingService billingService;

    /**
     * 定时任务：每 10 秒检查一次预约时间
     * 当预约时间到达时，自动结算当前进行中的会话
     */
    @Scheduled(fixedRate = 10000) // 每 10 秒执行一次
    @Transactional
    public void checkReservationsAndSettle() {
        
        Date now = new Date();
        
        try {
            // 获取所有状态为 ACTIVE 的预约
            List<Reservation> activeReservations = reservationRepository.findByStatus("ACTIVE");
            
            if (activeReservations.isEmpty()) {
                return;
            }
            
            int settledCount = 0;
            
            for (Reservation reservation : activeReservations) {
                // 检查预约的开始时间是否已到（提前 1 分钟开始检查，避免时间误差）
                Date reservationStartTime = reservation.getStartDateTime();
                long timeDiff = reservationStartTime.getTime() - now.getTime();
                
                // 如果预约时间还有 1 分钟以上，跳过
                if (timeDiff > 60000) { // 60 秒
                    continue;
                }
                
                // 如果预约时间已过，处理
                if (timeDiff <= 60000) {
                    
                    // 检查该球桌是否有进行中的会话
                    Session ongoingSession = findOngoingSession(reservation.getTableId(), reservation.getAccount());
                    
                    if (ongoingSession != null) {
                        // 自动结算当前会话
                        boolean settled = autoSettleSession(ongoingSession, reservation);
                        if (settled) {
                            settledCount++;
                        }
                    }
                }
            }
            
        } catch (Exception e) {
        }
    }
    
    /**
     * 查找指定球桌的进行中会话（排除预约用户自己的会话）
     */
    private Session findOngoingSession(Long tableId, String reservationUserAccount) {
        List<Session> sessions = sessionRepository.findByTableIdAndAccountNotAndEndDateTimeIsNull(tableId, reservationUserAccount);
        
        if (sessions == null || sessions.isEmpty()) {
            return null;
        }
        
        // 返回第一个进行中的会话
        return sessions.get(0);
    }
    
    /**
     * 自动结算会话
     */
    private boolean autoSettleSession(Session session, Reservation reservation) {
        try {
            Date endTime = new Date();
            session.setEndDateTime(endTime);
            session.setStatus("COMPLETED");
            
            Map<String, Object> settlementResult = billingService.settleSession(session, endTime, false);
            
            sessionRepository.save(session);
            
            Double finalPayAmount = (Double) settlementResult.get("finalPayAmount");
            Double remainingBalance = (Double) settlementResult.get("remainingBalance");
            
            logAutoSettlement(session, reservation, finalPayAmount, remainingBalance);
            
            return true;
            
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * 记录自动结算日志
     */
    private void logAutoSettlement(Session session, Reservation reservation, Double amount, Double balance) {
    }
    
    /**
     * 手动触发自动结算（用于测试或管理员手动操作）
     */
    @Transactional
    public Map<String, Object> triggerManualSettlement() {
        Map<String, Object> result = new HashMap<>();
        
        Date before = new Date();
        checkReservationsAndSettle();
        Date after = new Date();
        
        result.put("success", true);
        result.put("message", "自动结算已触发");
        result.put("executedAt", after);
        result.put("duration", (after.getTime() - before.getTime()) + "ms");
        
        return result;
    }
}
