package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Admin;
import com.unmanned.billiards.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {
    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Admin findByAccount(String account) {
        return adminRepository.findByAccount(account);
    }

    public Admin findById(Long id) {
        return adminRepository.findById(id).orElse(null);
    }

    public List<Admin> findAll() {
        return adminRepository.findAll();
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        if (encodedPassword == null) {
            return false;
        }
        // 支持明文密码登录
        if (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$")) {
            // 如果是BCrypt加密的密码，使用密码编码器比较
            return passwordEncoder.matches(rawPassword, encodedPassword);
        } else {
            // 否则使用明文比较
            return rawPassword.equals(encodedPassword);
        }
    }

    public Admin save(Admin admin) {
        // 加密密码后保存
        if (admin.getPassword() != null && !admin.getPassword().startsWith("$2a$") && !admin.getPassword().startsWith("$2b$") && !admin.getPassword().startsWith("$2y$")) {
            admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        }
        return adminRepository.save(admin);
    }

    public void deleteById(Long id) {
        adminRepository.deleteById(id);
    }

    public boolean existsByAccount(String account) {
        return adminRepository.existsByAccount(account);
    }
}