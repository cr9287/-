package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.BilliardsTable;
import com.unmanned.billiards.repository.BilliardsTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BilliardsTableService {
    @Autowired
    private BilliardsTableRepository billiardsTableRepository;

    public List<BilliardsTable> findAll() {
        return billiardsTableRepository.findAll();
    }

    public Optional<BilliardsTable> findById(Long id) {
        return billiardsTableRepository.findById(id);
    }

    public BilliardsTable findByName(String name) {
        return billiardsTableRepository.findByName(name);
    }

    public BilliardsTable save(BilliardsTable table) {
        return billiardsTableRepository.save(table);
    }

    public void deleteById(Long id) {
        billiardsTableRepository.deleteById(id);
    }

    public boolean existsByName(String name) {
        return billiardsTableRepository.existsByName(name);
    }
}