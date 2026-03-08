package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.*;
import com.unmanned.billiards.service.BillingService;
import com.unmanned.billiards.service.BilliardsTableService;
import com.unmanned.billiards.service.ConsumptionService;
import com.unmanned.billiards.service.ReservationService;
import com.unmanned.billiards.service.SessionService;
import com.unmanned.billiards.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BillingServiceImpl implements BillingService {

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserService userService;

    @Autowired
    private ConsumptionService consumptionService;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private BilliardsTableService billiardsTableService;

    @Override
    @Transactional
    public Map<String, Object> settleSession(Session session, Date endTime, boolean allowNegative) throws Exception {
        if (session == null || session.getEndDateTime() != null) {
            throw new IllegalArgumentException("会话不存在或已结束");
        }

        long minutes = endTime.getTime() - session.getStartDateTime().getTime();
        minutes = minutes / 1000 / 60;
        if (minutes < 1) minutes = 1;
        
        // 转换为 Integer 类型
        int minutesInt = (int) minutes;

        BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
        if (table == null) {
            throw new IllegalArgumentException("球桌不存在");
        }

        double pricePerHour = 0.0;
        if (table.getPricePerHour() != null) {
            pricePerHour = table.getPricePerHour();
        } else if (table.getPricePerMinute() != null) {
            pricePerHour = table.getPricePerMinute() * 60;
        }

        double actualPlayCost = (minutes / 60.0) * pricePerHour;
        actualPlayCost = Math.round(actualPlayCost * 100.0) / 100.0;

        User user = userService.findByAccount(session.getAccount());
        if (user == null) {
             throw new RuntimeException("用户不存在，账户：" + session.getAccount());
        }

        String openType = session.getOpenType() != null ? session.getOpenType() : "reservation";
        double depositAmount = 0.0;
        Reservation usedReservation = null;

        if ("reservation".equals(openType)) {
            Long reservationId = session.getReservationId();
            if (reservationId != null) {
                usedReservation = reservationService.findById(reservationId);
            } else {
                List<Reservation> rs = reservationService.findByTableIdAndAccountAndStatus(session.getTableId(), session.getAccount(), "USED");
                if (!rs.isEmpty()) {
                    usedReservation = rs.get(0);
                }
            }
            
            if (usedReservation != null) {
                depositAmount = usedReservation.getDepositAmount() != null ? usedReservation.getDepositAmount() : 0.0;
            }
        }

        double finalPayAmount = actualPlayCost - depositAmount;
        finalPayAmount = Math.round(finalPayAmount * 100.0) / 100.0;

        double currentBalance = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
        double newBalance = currentBalance;

        if (finalPayAmount > 0) {
            newBalance = currentBalance - finalPayAmount;
            if (newBalance < 0 && !allowNegative) {
                throw new Exception("余额不足，请先充值");
            }
        } else if (finalPayAmount < 0) {
            double refundAmount = Math.abs(finalPayAmount);
            newBalance = currentBalance + refundAmount;
        }

        user.setWalletBalance(newBalance);
        try {
            userService.save(user);
        } catch (Exception e) {
            throw new RuntimeException("用户余额更新失败：" + e.getMessage());
        }

        Consumption consumption = new Consumption();
        consumption.setAccount(session.getAccount());
        consumption.setTableId(session.getTableId());
        consumption.setBilliardsTableId(session.getTableId());
        consumption.setSessionId(session.getId());
        consumption.setStartDateTime(session.getStartDateTime());
        consumption.setEndDateTime(endTime);
        consumption.setMinutes(minutesInt);
        consumption.setAmount(BigDecimal.valueOf(finalPayAmount));
        consumption.setStatus("PAID");
        consumption.setBalanceAfter(newBalance);
        consumption.setConsumptionType("normal");
        consumptionService.save(consumption);
        
        session.setEndDateTime(endTime);
        sessionService.save(session);
        
        if (usedReservation != null) {
            usedReservation.setStatus("COMPLETED");
            reservationService.save(usedReservation);
        }

        if (!"RESERVED".equals(table.getStatus())) {
             table.setStatus("AVAILABLE");
             table.setCurrentSessionId(null);
             table.setCurrentReservationId(null);
             billiardsTableService.save(table);
        } else {
             table.setCurrentSessionId(null);
             billiardsTableService.save(table);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "结算成功");
        response.put("actualPlayCost", actualPlayCost);
        response.put("depositDeducted", depositAmount);
        response.put("finalPayAmount", finalPayAmount);
        response.put("remainingBalance", newBalance);
        
        return response;
    }
}
