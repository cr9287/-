package com.unmanned.billiards;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BilliardsApplication {
    public static void main(String[] args) {
        SpringApplication.run(BilliardsApplication.class, args);
    }
}