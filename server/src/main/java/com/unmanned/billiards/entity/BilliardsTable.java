package com.unmanned.billiards.entity;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "billiards_table")
public class BilliardsTable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "status", nullable = false)
    private String status; // AVAILABLE, IN_USE, RESERVED, FAULT

    @Column(name = "price_per_hour")
    private Double pricePerHour;

    @Column(name = "price_per_minute")
    private Double pricePerMinute;

    @Column(name = "type")
    private String type;

    @Column(name = "table_number")
    private Integer tableNumber;

    @Column(name = "current_reservation_id")
    private Long currentReservationId;

    @Column(name = "current_session_id")
    private Long currentSessionId;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getPricePerHour() {
        return pricePerHour;
    }

    public void setPricePerHour(Double pricePerHour) {
        this.pricePerHour = pricePerHour;
    }

    public Double getPricePerMinute() {
        return pricePerMinute;
    }

    public void setPricePerMinute(Double pricePerMinute) {
        this.pricePerMinute = pricePerMinute;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getTableNumber() {
        return tableNumber;
    }

    public void setTableNumber(Integer tableNumber) {
        this.tableNumber = tableNumber;
    }

    public Long getCurrentReservationId() {
        return currentReservationId;
    }

    public void setCurrentReservationId(Long currentReservationId) {
        this.currentReservationId = currentReservationId;
    }

    public Long getCurrentSessionId() {
        return currentSessionId;
    }

    public void setCurrentSessionId(Long currentSessionId) {
        this.currentSessionId = currentSessionId;
    }
}