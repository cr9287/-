package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.Notification;
import com.unmanned.billiards.repository.NotificationRepository;
import com.unmanned.billiards.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Override
    public Notification createNotification(String account, String title, String content, String type) {
        Notification notification = new Notification();
        notification.setAccount(account);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setType(type);
        notification.setIsRead(false);
        notification.setCreatedAt(new Date());
        
        return notificationRepository.save(notification);
    }

    @Override
    public List<Notification> getNotificationsByAccount(String account) {
        return notificationRepository.findByAccountOrderByCreatedAtDesc(account);
    }

    @Override
    public int getUnreadCount(String account) {
        return notificationRepository.countByAccountAndIsReadFalse(account);
    }

    @Override
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification != null && !notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(new Date());
            notificationRepository.save(notification);
        }
    }

    @Override
    public void markAllAsRead(String account) {
        List<Notification> unreadNotifications = notificationRepository.findByAccountAndIsReadFalse(account);
        Date now = new Date();
        for (Notification notification : unreadNotifications) {
            notification.setIsRead(true);
            notification.setReadAt(now);
        }
        notificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }
}