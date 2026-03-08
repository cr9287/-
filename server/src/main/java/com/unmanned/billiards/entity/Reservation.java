package com.unmanned.billiards.entity;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "reservation")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "billiards_table_id")
    private Long billiardsTableId;

    private String account;

    @Column(name = "start_date_time")
    private Date startDateTime;

    @Column(name = "end_date_time")
    private Date endDateTime;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "table_id")
    private Long tableId;
    
    // 预约总费用
    @Column(name = "total_amount")
    private Double totalAmount;
    
    // 保证金金额（总费用的5%）
    @Column(name = "deposit_amount")
    private Double depositAmount;
    
    // 保证金状态：PAID（已支付）、REFUND（已退还）、FORFEIT（已没收）
    @Column(name = "deposit_status", length = 20)
    private String depositStatus;

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBilliardsTableId() {
        return billiardsTableId;
    }

    public void setBilliardsTableId(Long billiardsTableId) {
        this.billiardsTableId = billiardsTableId;
    }

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public Date getStartDateTime() {
        return startDateTime;
    }

    public void setStartDateTime(Date startDateTime) {
        this.startDateTime = startDateTime;
    }

    public Date getEndDateTime() {
        return endDateTime;
    }

    public void setEndDateTime(Date endDateTime) {
        this.endDateTime = endDateTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getTableId() {
        return tableId;
    }

    public void setTableId(Long tableId) {
        this.tableId = tableId;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Double getDepositAmount() {
        return depositAmount;
    }

    public void setDepositAmount(Double depositAmount) {
        this.depositAmount = depositAmount;
    }

    public String getDepositStatus() {
        return depositStatus;
    }

    public void setDepositStatus(String depositStatus) {
        this.depositStatus = depositStatus;
    }
}