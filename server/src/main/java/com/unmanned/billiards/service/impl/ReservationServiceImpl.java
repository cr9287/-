package com.unmanned.billiards.service.impl;

import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.repository.ReservationRepository;
import com.unmanned.billiards.service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class ReservationServiceImpl implements ReservationService {
    @Autowired
    private ReservationRepository reservationRepository;

    @Override
    public List<Reservation> findAll() {
        return reservationRepository.findAll();
    }

    @Override
    public Reservation findById(Long id) {
        return reservationRepository.findById(id).orElse(null);
    }

    @Override
    public Reservation save(Reservation reservation) {
        return reservationRepository.save(reservation);
    }

    @Override
    public void deleteById(Long id) {
        reservationRepository.deleteById(id);
    }

    @Override
    public List<Reservation> findByAccount(String account) {
        return reservationRepository.findByAccount(account);
    }
    
    @Override
    public List<Reservation> findByTableIdAndDate(Long tableId, String date) {
        // 先根据tableId查询所有预约
        List<Reservation> allReservations = reservationRepository.findByTableId(tableId);
        
        // 在service层进行日期过滤
        return allReservations.stream()
                .filter(reservation -> {
                    // 格式化预约的开始时间为YYYY-MM-DD格式
                    Date startDateTime = reservation.getStartDateTime();
                    if (startDateTime == null) {
                        return false;
                    }
                    
                    // 简单的日期格式比较（实际项目中应该使用日期格式化工具）
                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
                    String reservationDate = sdf.format(startDateTime);
                    
                    return reservationDate.equals(date);
                })
                .collect(java.util.stream.Collectors.toList());
    }
    
    @Override
    public List<Reservation> findByTableId(Long tableId) {
        return reservationRepository.findByTableId(tableId);
    }

    @Override
    public List<Reservation> findByTableIdAndAccountAndStatus(Long tableId, String account, String status) {
        return reservationRepository.findByTableIdAndAccountAndStatus(tableId, account, status);
    }
    
    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateAccount(String oldAccount, String newAccount) {
        reservationRepository.updateAccount(oldAccount, newAccount);
    }
}