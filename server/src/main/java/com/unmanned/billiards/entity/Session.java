package com.unmanned.billiards.entity;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "session")
public class Session {
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

    @Column(name = "table_id")
    private Long tableId;
    
    @Column(name = "open_type")
    private String openType;
    
    @Column(name = "reservation_id")
    private Long reservationId;
    
    @Column(name = "status")
    private String status; // ONGOING, COMPLETED

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

    public Long getTableId() {
        return tableId;
    }

    public void setTableId(Long tableId) {
        this.tableId = tableId;
    }
    
    public String getOpenType() {
        return openType;
    }
    
    public void setOpenType(String openType) {
        this.openType = openType;
    }
    
    public Long getReservationId() {
        return reservationId;
    }
    
    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
}