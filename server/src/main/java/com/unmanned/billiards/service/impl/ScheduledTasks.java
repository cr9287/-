package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.BilliardsTable;
import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.entity.Session;
import com.unmanned.billiards.service.BilliardsTableService;
import com.unmanned.billiards.service.ReservationService;
import com.unmanned.billiards.service.SessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ScheduledTasks {

    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private BilliardsTableService billiardsTableService;
    
    @Autowired
    private SessionService sessionService;

    @Autowired
    private com.unmanned.billiards.service.BillingService billingService;
    
    @Autowired
    private com.unmanned.billiards.service.NotificationService notificationService;

    // 每 30 秒执行一次，处理超时未开台的预约（从 5 分钟改为 30 秒，提升响应速度）
    @Scheduled(fixedRate = 30000)
    public void handleExpiredReservations() {
        // 获取当前时间
        Date now = new Date();
        
        // 获取所有状态为 PENDING 的预约
        List<Reservation> pendingReservations = reservationService.findAll().stream()
                .filter(reservation -> "PENDING".equals(reservation.getStatus()))
                .collect(Collectors.toList());
        
        if (pendingReservations.isEmpty()) {
            return;
        }
        
        int expiredCount = 0;
        
        // 处理每个预约
        for (Reservation reservation : pendingReservations) {
            // 检查预约是否已超时（开始时间超过 20 分钟）
            long diffInMillies = now.getTime() - reservation.getStartDateTime().getTime();
            long diffInMinutes = diffInMillies / (60 * 1000);
            
            // 如果超时 20 分钟，判定为爽约
            if (diffInMinutes >= 20) {
                
                try {
                    // 预约后未使用且未取消的保证金不退还
                    
                    // 更新预约状态为已过期，保证金状态为已没收
                    reservation.setStatus("EXPIRED");
                    reservation.setDepositStatus("FORFEITED");
                    reservationService.save(reservation);
                    
                    // 更新球桌状态为可用
                    BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
                    if (table != null) {
                        // 检查球桌当前状态
                        
                        // 如果球桌状态为已预约（RESERVED），则释放球桌
                        if ("RESERVED".equals(table.getStatus())) {
                            table.setStatus("AVAILABLE");
                            table.setCurrentReservationId(null);
                            billiardsTableService.save(table);
                        }
                    }
                    
                    expiredCount++;
                    
                    // 发送超时通知给用户
                    notificationService.createNotification(
                        reservation.getAccount(),
                        "预约超时通知",
                        String.format("您预约的球桌 %d 因超过 20 分钟未开台，已自动取消。保证金不予退还。", reservation.getTableId()),
                        "RESERVATION_EXPIRED"
                    );
                    
                } catch (Exception e) {
                }
            }
        }
        
    }

    // 每1分钟执行一次，检查会话超时和预约冲突
    @Scheduled(fixedRate = 60000)
    public void checkSessionConflicts() {
        Date now = new Date();
        
        // 1. 获取所有进行中的会话
        List<Session> activeSessions = sessionService.findAll().stream()
                .filter(s -> s.getEndDateTime() == null)
                .collect(Collectors.toList());

        for (Session session : activeSessions) {
            Long tableId = session.getTableId();
            
            // 2. 查找该球桌即将开始的有效预约 (PENDING状态)
            List<Reservation> reservations = reservationService.findByTableId(tableId);
            
            Reservation nextReservation = null;
            long minDiff = Long.MAX_VALUE;

            for (Reservation r : reservations) {
                if ("PENDING".equals(r.getStatus())) {
                    // 预约开始时间
                    long startTime = r.getStartDateTime().getTime();
                    long diff = startTime - now.getTime();
                    
                    // 查找 StartTime 最接近 Now 的预约
                    if (diff < minDiff && diff > -15 * 60 * 1000) { // 忽略已经开始超过15分钟的
                         minDiff = diff;
                         nextReservation = r;
                    }
                }
            }

            if (nextReservation != null) {
                long timeUntilReservation = nextReservation.getStartDateTime().getTime() - now.getTime();
                
                // 情况1: 距离预约开始5分钟内
                if (timeUntilReservation > 0 && timeUntilReservation <= 5 * 60 * 1000) {
                    // 距离预约开始5分钟内，无需特殊处理
                }
                
                // 情况2: 预约时间已到
                if (timeUntilReservation <= 0) {
                    // 强制结束当前会话
                    forceEndSession(session, nextReservation);
                }
            }
        }
    }

    private void forceEndSession(Session session, Reservation nextReservation) {
        // 1. 结算当前会话 (允许负余额)
        try {
            billingService.settleSession(session, new Date(), true);
            
            // 给当前用户发送自动结算通知
            notificationService.createNotification(
                session.getAccount(),
                "球桌自动结算通知",
                String.format("您的球桌 %d 因其他用户预约时间已到，已自动结算。费用已从账户扣除。", session.getTableId()),
                "AUTO_SETTLE"
            );
            
            // 给预约用户发送可用通知
            notificationService.createNotification(
                nextReservation.getAccount(),
                "球桌可用通知",
                String.format("您预约的球桌 %d 已就绪，可开始使用。", nextReservation.getTableId()),
                "RESERVATION_READY"
            );
            
        } catch (Exception e) {
            // 记录错误继续执行
        }
        
        // 2. 更新球桌状态
        BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
        if (table != null) {
            table.setStatus("RESERVED");
            table.setCurrentSessionId(null);
            table.setCurrentReservationId(nextReservation.getId());
            billiardsTableService.save(table);
        }
        
        // 3. 记录日志（已通过消息通知系统实现）
    }
}
