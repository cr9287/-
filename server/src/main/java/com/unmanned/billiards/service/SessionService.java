package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Session;
import java.util.List;

public interface SessionService {
    List<Session> findAll();
    Session findById(Long id);
    Session save(Session session);
    void deleteById(Long id);
    // 查找特定球桌的未结束会话
    Session findActiveSessionByTableId(Long tableId);
    // 查找用户的会话记录
    List<Session> findByAccount(String account);
    
    void updateAccount(String oldAccount, String newAccount);
}
