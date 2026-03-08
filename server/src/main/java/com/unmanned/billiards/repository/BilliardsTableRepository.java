package com.unmanned.billiards.repository;

import com.unmanned.billiards.entity.BilliardsTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BilliardsTableRepository extends JpaRepository<BilliardsTable, Long> {
    BilliardsTable findByName(String name);
    boolean existsByName(String name);
}