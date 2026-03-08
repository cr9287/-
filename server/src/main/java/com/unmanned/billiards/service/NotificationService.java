package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Notification;
import java.util.List;

public interface NotificationService {
    
    /**
     * 创建通知
     */
    Notification createNotification(String account, String title, String content, String type);
    
    /**
     * 获取用户的所有通知
     */
    List<Notification> getNotificationsByAccount(String account);
    
    /**
     * 获取用户的未读通知数量
     */
    int getUnreadCount(String account);
    
    /**
     * 标记通知为已读
     */
    void markAsRead(Long notificationId);
    
    /**
     * 标记所有通知为已读
     */
    void markAllAsRead(String account);
    
    /**
     * 删除通知
     */
    void deleteNotification(Long notificationId);
}