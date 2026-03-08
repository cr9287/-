package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.User;
import com.unmanned.billiards.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User findByAccount(String account) {
        return userRepository.findByAccountIgnoreCase(account);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional
    public User save(User user) {
        // 统一使用 BCrypt 加密密码
        if (user.getPassword() != null && !user.getPassword().startsWith("$2a$") && !user.getPassword().startsWith("$2b$") && !user.getPassword().startsWith("$2y$")) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    public boolean existsByAccount(String account) {
        return userRepository.existsByAccountIgnoreCase(account);
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        // 检查encodedPassword是否为null
        if (encodedPassword == null) {
            return false;
        }
        
        // 统一使用BCrypt加密密码验证
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    public User createUser(String account, String password, Double walletBalance, String name, String phone) {
        User user = new User();
        user.setAccount(account);
        user.setPassword(passwordEncoder.encode(password)); // 加密密码
        user.setWalletBalance(walletBalance);
        user.setName(name);
        user.setPhone(phone);
        return userRepository.save(user);
    }

    public User updateUser(Long id, String username, String password) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            if (username != null && !username.isEmpty()) {
                // 检查新用户名是否已存在，排除当前用户
                User existingUser = userRepository.findByAccountIgnoreCase(username);
                if (existingUser == null || existingUser.getId().equals(id)) {
                    user.setAccount(username);
                }
            }
            if (password != null && !password.isEmpty()) {
                user.setPassword(passwordEncoder.encode(password)); // 加密密码
            }
            return userRepository.save(user);
        }
        return null;
    }
    
    // 更新用户基本信息（name, phone）
    public User updateUserInfo(Long id, String name, String phone) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            if (name != null) {
                user.setName(name);
            }
            if (phone != null) {
                user.setPhone(phone);
            }
            return userRepository.save(user);
        }
        return null;
    }
    
    // 更新用户用户名
    public User updateUsername(Long id, String newUsername) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            // 检查新用户名是否已存在
            if (userRepository.existsByAccountIgnoreCase(newUsername)) {
                return null;
            }
            user.setAccount(newUsername);
            return userRepository.save(user);
        }
        return null;
    }
    
    // 更新用户密码
    public boolean updatePassword(String account, String currentPassword, String newPassword) {
        User user = userRepository.findByAccountIgnoreCase(account);
        if (user != null) {
            // 验证当前密码
            if (checkPassword(currentPassword, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(newPassword)); // 加密新密码
                userRepository.save(user);
                return true;
            }
        }
        return false;
    }
    

    
    // 根据ID查找用户
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}