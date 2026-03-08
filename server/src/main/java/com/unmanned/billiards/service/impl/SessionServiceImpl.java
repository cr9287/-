package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.Session;
import com.unmanned.billiards.repository.SessionRepository;
import com.unmanned.billiards.service.SessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SessionServiceImpl implements SessionService {
    @Autowired
    private SessionRepository sessionRepository;

    @Override
    public List<Session> findAll() {
        return sessionRepository.findAll();
    }

    @Override
    public Session findById(Long id) {
        return sessionRepository.findById(id).orElse(null);
    }

    @Override
    public Session save(Session session) {
        return sessionRepository.save(session);
    }

    @Override
    public void deleteById(Long id) {
        sessionRepository.deleteById(id);
    }

    @Override
    public Session findActiveSessionByTableId(Long tableId) {
        return sessionRepository.findByTableIdAndEndDateTimeIsNull(tableId);
    }

    @Override
    public List<Session> findByAccount(String account) {
        return sessionRepository.findByAccount(account);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateAccount(String oldAccount, String newAccount) {
        sessionRepository.updateAccount(oldAccount, newAccount);
    }
}
