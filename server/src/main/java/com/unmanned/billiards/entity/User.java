package com.unmanned.billiards.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String account;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    private String name;

    private String phone;

    private Double walletBalance = 0.0;

    @Column(name = "payment_password")
    @JsonIgnore
    private String paymentPassword;

    // getter and setter methods
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Double getWalletBalance() {
        return walletBalance;
    }

    public void setWalletBalance(Double walletBalance) {
        this.walletBalance = walletBalance;
    }

    public String getPaymentPassword() {
        return paymentPassword;
    }

    public void setPaymentPassword(String paymentPassword) {
        this.paymentPassword = paymentPassword;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        if (id != null && user.id != null) {
            return id.equals(user.id);
        }
        // 如果两个对象都是新对象（ID为null），则比较业务字段
        return account != null && account.equals(user.account);
    }

    @Override
    public int hashCode() {
        if (id != null) {
            return id.hashCode();
        }
        // 对于新对象，使用业务字段作为哈希码
        return account != null ? account.hashCode() : super.hashCode();
    }
}