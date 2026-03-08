package com.unmanned.billiards.utils;

import com.unmanned.billiards.entity.BilliardsTable;
import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.service.ReservationService;
import com.unmanned.billiards.service.BilliardsTableService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 球桌工具类
 * 提供球桌相关的公共方法，消除代码重复
 */
@Component
public class TableUtils {
    
    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private BilliardsTableService billiardsTableService;
    
    /**
     * 状态文本转换
     */
    public String getStatusText(String status) {
        switch (status) {
            case "AVAILABLE":
                return "可用";
            case "IN_USE":
                return "使用中";
            case "RESERVED":
                return "已预约";
            case "FAULT":
                return "故障";
            default:
                return status;
        }
    }
    
    /**
     * 检查球桌是否有有效预约
     */
    public boolean hasActiveReservation(BilliardsTable table, Date now) {
        List<Reservation> activeReservations = reservationService.findByTableId(table.getId());
        if (activeReservations.isEmpty()) {
            return false;
        }

        long nowTime = now.getTime();
        for (Reservation reservation : activeReservations) {
            if ("PENDING".equals(reservation.getStatus())) {
                long startTime = reservation.getStartDateTime().getTime();
                long endTime = reservation.getEndDateTime().getTime();
                if (nowTime >= startTime && nowTime <= endTime) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * 获取球桌显示状态
     */
    public String getDisplayStatus(BilliardsTable table, Date now) {
        String displayStatus = table.getStatus();
        
        // 检查是否有有效预约
        if (hasActiveReservation(table, now)) {
            displayStatus = "RESERVED";
        }
        
        // 如果显示为RESERVED但没有有效预约，重置为AVAILABLE
        if ("RESERVED".equals(displayStatus) && !hasActiveReservation(table, now)) {
            displayStatus = "AVAILABLE";
            table.setStatus("AVAILABLE");
            table.setCurrentReservationId(null);
            billiardsTableService.save(table);
        }
        
        return displayStatus;
    }
    
    /**
     * 构建球桌信息Map
     */
    public Map<String, Object> buildTableInfo(BilliardsTable table, Date now) {
        Map<String, Object> tableMap = new HashMap<>();
        
        String displayStatus = getDisplayStatus(table, now);
        String statusText = getStatusText(displayStatus);
        
        tableMap.put("id", table.getId());
        tableMap.put("name", table.getName());
        tableMap.put("status", displayStatus);
        tableMap.put("statusText", statusText);
        tableMap.put("pricePerHour", table.getPricePerHour());
        tableMap.put("pricePerMinute", table.getPricePerMinute());
        tableMap.put("type", table.getType());
        tableMap.put("tableNumber", table.getTableNumber());
        tableMap.put("currentReservationId", table.getCurrentReservationId());
        tableMap.put("currentSessionId", table.getCurrentSessionId());
        
        return tableMap;
    }
    
    /**
     * 获取每分钟价格
     */
    public double getPricePerMinute(BilliardsTable table) {
        // 优先使用配置的分钟价格
        if (table.getPricePerMinute() != null && table.getPricePerMinute() > 0) {
            return table.getPricePerMinute();
        }
        
        // 其次使用小时价格换算
        if (table.getPricePerHour() != null && table.getPricePerHour() > 0) {
            return table.getPricePerHour() / 60.0;
        }
        
        // 默认价格
        return 0.5;
    }
    
    /**
     * 计算会话时长和费用
     */
    public Map<String, Object> calculateSessionCost(Date startTime, Date endTime, BilliardsTable table) {
        Map<String, Object> result = new HashMap<>();
        
        // 使用更精确的时间计算方法
        long startMillis = startTime.getTime();
        long endMillis = endTime.getTime();
        long durationMillis = Math.max(0, endMillis - startMillis);
        
        // 转换为分钟，向上取整
        double exactMinutes = durationMillis / 60000.0;
        int minutes = (int) Math.ceil(exactMinutes);
        minutes = Math.max(1, minutes); // 至少1分钟
        
        // 按10分钟单位折算（业务规则）
        int billingMinutes = (int) Math.ceil(minutes / 10.0) * 10;
        billingMinutes = Math.max(10, billingMinutes); // 至少按10分钟计算

        // 获取价格
        double pricePerMinute = getPricePerMinute(table);
        double pricePerHour = pricePerMinute * 60;

        // 计算费用
        double actualPlayCost = (billingMinutes / 60.0) * pricePerHour;
        actualPlayCost = Math.round(actualPlayCost * 100.0) / 100.0;

        result.put("durationMinutes", minutes);
        result.put("billingMinutes", billingMinutes);
        result.put("totalCost", actualPlayCost);
        result.put("pricePerHour", pricePerHour);
        result.put("pricePerMinute", pricePerMinute);
        
        return result;
    }
}