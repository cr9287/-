package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    /**
     * 根据账号查找通知，按创建时间倒序排列
     */
    List<Notification> findByAccountOrderByCreatedAtDesc(String account);
    
    /**
     * 根据账号和未读状态查找通知
     */
    List<Notification> findByAccountAndIsReadFalse(String account);
    
    /**
     * 统计用户的未读通知数量
     */
    int countByAccountAndIsReadFalse(String account);
}