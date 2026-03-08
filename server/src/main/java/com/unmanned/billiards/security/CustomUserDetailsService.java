package com.unmanned.billiards.security;

import com.unmanned.billiards.entity.Admin;
import com.unmanned.billiards.entity.User;
import com.unmanned.billiards.service.AdminService;
import com.unmanned.billiards.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private AdminService adminService;

    @Autowired
    private UserService userService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 先检查管理员表
        Admin admin = adminService.findByAccount(username);
        if (admin != null) {
            String adminPassword = admin.getPassword();
            if (adminPassword == null) {
                adminPassword = "{noop}"; // 使用noop前缀表示明文密码
            } else if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2y$")) {
                // BCrypt格式的密码，添加bcrypt前缀
                adminPassword = "{bcrypt}" + adminPassword;
            } else {
                // 明文密码，使用noop前缀
                adminPassword = "{noop}" + adminPassword;
            }
            return org.springframework.security.core.userdetails.User.builder()
                    .username(admin.getAccount())
                    .password(adminPassword)
                    .roles("ADMIN")
                    .build();
        }

        // 再检查用户表
        User user = userService.findByAccount(username);
        if (user != null) {
            String userPassword = user.getPassword();
            if (userPassword == null) {
                userPassword = "{noop}"; // 使用noop前缀表示明文密码
            } else if (userPassword.startsWith("$2a$") || userPassword.startsWith("$2b$") || userPassword.startsWith("$2y$")) {
                // BCrypt格式的密码，添加bcrypt前缀
                userPassword = "{bcrypt}" + userPassword;
            } else {
                // 明文密码，使用noop前缀
                userPassword = "{noop}" + userPassword;
            }
            return org.springframework.security.core.userdetails.User.builder()
                    .username(user.getAccount())
                    .password(userPassword)
                    .roles("USER")
                    .build();
        }

        throw new UsernameNotFoundException("User not found with username: " + username);
    }
}