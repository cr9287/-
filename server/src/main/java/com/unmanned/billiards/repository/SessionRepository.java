package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    // 查找特定球桌的未结束会话
    Session findByTableIdAndEndDateTimeIsNull(Long tableId);
    
    // 查找特定球桌的未结束会话（排除指定用户）
    List<Session> findByTableIdAndAccountNotAndEndDateTimeIsNull(Long tableId, String account);
    
    // 查找用户的会话记录
    List<Session> findByAccount(String account);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Session s SET s.account = ?2 WHERE s.account = ?1")
    void updateAccount(String oldAccount, String newAccount);
}
