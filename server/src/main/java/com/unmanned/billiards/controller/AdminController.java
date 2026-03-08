package com.unmanned.billiards.controller;

import com.unmanned.billiards.entity.Admin;
import com.unmanned.billiards.entity.BilliardsTable;
import com.unmanned.billiards.entity.Consumption;
import com.unmanned.billiards.entity.Recharge;
import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.entity.Session;
import com.unmanned.billiards.entity.User;
import com.unmanned.billiards.service.AdminService;
import com.unmanned.billiards.service.AutoSettlementService;
import com.unmanned.billiards.service.BilliardsTableService;
import com.unmanned.billiards.service.ConsumptionService;
import com.unmanned.billiards.service.ReservationService;
import com.unmanned.billiards.service.RechargeService;
import com.unmanned.billiards.service.SessionService;
import com.unmanned.billiards.service.UserService;
import com.unmanned.billiards.utils.JwtUtils;
import com.unmanned.billiards.utils.TableUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 管理员控制器
 * 处理管理员相关的所有API请求
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AdminService adminService;

    @Autowired
    private BilliardsTableService billiardsTableService;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private ConsumptionService consumptionService;

    @Autowired
    private UserService userService;

    @Autowired
    private RechargeService rechargeService;
    
    @Autowired
    private TableUtils tableUtils;
    
    @Autowired
    private AutoSettlementService autoSettlementService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> loginRequest) {
        try {
            // 更灵活的参数获取方式，支持String和Object类型
            Object accountObj = loginRequest.get("account");
            Object passwordObj = loginRequest.get("password");
            
            String account = accountObj != null ? accountObj.toString().trim() : null;
            String password = passwordObj != null ? passwordObj.toString().trim() : null;
            
            if (account == null || password == null) {
                return createResponse(false, "账号和密码不能为空");
            }
            
            // 使用AdminService验证用户名和密码
            Admin admin = adminService.findByAccount(account);
            if (admin == null) {
                return createResponse(false, "账户不存在");
            }
            
            if (!adminService.checkPassword(password, admin.getPassword())) {
                return createResponse(false, "密码错误");
            }

            // 创建UserDetails对象，使用固定密码绕过Spring Security密码验证
            // 注意：这里使用固定密码，因为密码验证已经在前面通过adminService.checkPassword完成了
            UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                    .username(admin.getAccount())
                    .password("{noop}password") // 使用固定密码，绕过密码验证
                    .roles("ADMIN")
                    .build();

            // 生成JWT令牌
            String jwt = jwtUtils.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("account", account);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal Server Error: " + e.getMessage());
        }
    }

    @GetMapping("/info")
    public ResponseEntity<?> getAdminInfo() {
        try {
            // 获取当前登录的管理员账号
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (currentUsername.equals("anonymousUser")) {
                return createResponse(false, "请先登录");
            }
            
            // 查找管理员信息
            Admin admin = adminService.findByAccount(currentUsername);
            if (admin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            // 返回管理员信息
            Map<String, Object> response = new HashMap<>();
            response.put("id", admin.getId());
            response.put("account", admin.getAccount());
            response.put("name", admin.getName());
            response.put("role", admin.getRole());
            response.put("isSuperAdmin", admin.getIsSuperAdmin());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal Server Error: " + e.getMessage());
        }
    }

    @GetMapping("/tables")
    public ResponseEntity<?> getTables() {
        List<BilliardsTable> tables = billiardsTableService.findAll();
        Date now = new Date();
        
        // 使用公共工具类构建球桌信息
        List<Map<String, Object>> tableList = new ArrayList<>();
        for (BilliardsTable table : tables) {
            Map<String, Object> tableMap = tableUtils.buildTableInfo(table, now);
            tableList.add(tableMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", tableList);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tables/{id}")
    public ResponseEntity<?> getTableById(@PathVariable Long id) {
        try {
            BilliardsTable table = billiardsTableService.findById(id).orElse(null);
            if (table == null) {
                return ResponseEntity.status(404).body("球桌不存在，ID: " + id);
            }
            
            // 获取当前时间
            Date now = new Date();
            long nowTime = now.getTime();
            
            // 检查是否处于预约时间段内
            List<Reservation> activeReservations = reservationService.findByTableId(table.getId());
        String displayStatus = table.getStatus();
        
        // 检查是否有有效预约
        boolean hasActiveReservation = false;
        if (!activeReservations.isEmpty()) {
            for (Reservation reservation : activeReservations) {
                // 仅PENDING状态影响显示
                if ("PENDING".equals(reservation.getStatus())) {
                    long startTime = reservation.getStartDateTime().getTime();
                    long endTime = reservation.getEndDateTime().getTime();
                    
                    if (nowTime >= startTime && nowTime <= endTime) {
                        hasActiveReservation = true;
                        displayStatus = "RESERVED";
                        break;
                    }
                }
            }
        }
        
        // 状态重置
        if ("RESERVED".equals(displayStatus) && !hasActiveReservation) {
            displayStatus = "AVAILABLE";
            table.setStatus("AVAILABLE");
            table.setCurrentReservationId(null);
            billiardsTableService.save(table);
        }
        
        // 转换状态为中文显示
        String statusText = "";
        switch (displayStatus) {
            case "AVAILABLE":
                statusText = "可用";
                break;
            case "IN_USE":
                statusText = "使用中";
                break;
            case "RESERVED":
                statusText = "已预约";
                break;
            case "FAULT":
                statusText = "故障";
                break;
            default:
                statusText = displayStatus;
        }
        
        // 转换为Map，以便修改状态
        Map<String, Object> tableMap = new HashMap<>();
        tableMap.put("id", table.getId());
        tableMap.put("name", table.getName());
        tableMap.put("status", displayStatus);
        tableMap.put("statusText", statusText);
        tableMap.put("pricePerHour", table.getPricePerHour());
        tableMap.put("pricePerMinute", table.getPricePerMinute());
        tableMap.put("type", table.getType());
        tableMap.put("tableNumber", table.getTableNumber());
        tableMap.put("currentReservationId", table.getCurrentReservationId());
        tableMap.put("currentSessionId", table.getCurrentSessionId());
        
        return ResponseEntity.ok(tableMap);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取球桌信息失败: " + e.getMessage());
        }
    }

    @PostMapping("/tables")
    public ResponseEntity<?> createTable(@RequestBody BilliardsTable table) {
        try {
            if (table.getName() == null || table.getName().trim().isEmpty()) {
                return createResponse(false, "球桌名称不能为空");
            }
            if (table.getPricePerHour() == null) {
                return createResponse(false, "价格不能为空");
            }
            if (table.getStatus() == null) {
                table.setStatus("AVAILABLE");
            }
            
            // 自动计算每分钟价格
            if (table.getPricePerMinute() == null) {
                table.setPricePerMinute(table.getPricePerHour() / 60.0);
            }
            
            // 设置默认类型
            if (table.getType() == null) {
                table.setType("MIDDLE");
            }
            
            // 设置默认桌号
            if (table.getTableNumber() == null || table.getTableNumber() == 0) {
                if (table.getTableNumber() == null) {
                    table.setTableNumber(0);
                }
            }
            
            BilliardsTable savedTable = billiardsTableService.save(table);
            
            // 尝试更新桌号为ID
            if (savedTable.getTableNumber() == 0) {
                savedTable.setTableNumber(savedTable.getId().intValue());
                savedTable = billiardsTableService.save(savedTable);
            }
            
            return ResponseEntity.ok(savedTable);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal Server Error");
        }
    }

    @PutMapping("/tables/{id}")
    public ResponseEntity<?> updateTable(@PathVariable Long id, @RequestBody BilliardsTable table) {
        BilliardsTable existingTable = billiardsTableService.findById(id).orElse(null);
        if (existingTable == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 只更新允许修改的字段，避免覆盖当前会话/预约信息
        if (table.getName() != null && !table.getName().trim().isEmpty()) {
            existingTable.setName(table.getName());
        }
        if (table.getStatus() != null) {
            existingTable.setStatus(table.getStatus());
        }
        if (table.getPricePerHour() != null) {
            existingTable.setPricePerHour(table.getPricePerHour());
            // 如果更新了每小时价格但没有提供每分钟价格，自动更新每分钟价格
            if (table.getPricePerMinute() == null) {
                existingTable.setPricePerMinute(table.getPricePerHour() / 60.0);
            }
        }
        if (table.getPricePerMinute() != null) {
            existingTable.setPricePerMinute(table.getPricePerMinute());
        }
        if (table.getType() != null) {
            existingTable.setType(table.getType());
        }
        if (table.getTableNumber() != null) {
            existingTable.setTableNumber(table.getTableNumber());
        }
        
        BilliardsTable updatedTable = billiardsTableService.save(existingTable);
        return ResponseEntity.ok(updatedTable);
    }

    @PutMapping("/tables/{id}/status")
    public ResponseEntity<?> updateTableStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        BilliardsTable table = billiardsTableService.findById(id).orElse(null);
        if (table == null) {
            return ResponseEntity.notFound().build();
        }
        // 更灵活的参数获取方式，支持String和Object类型
        Object statusObj = request.get("status");
        String status = statusObj != null ? statusObj.toString().trim() : null;
        table.setStatus(status);
        BilliardsTable updatedTable = billiardsTableService.save(table);
        return ResponseEntity.ok(updatedTable);
    }

    @DeleteMapping("/tables/{id}")
    public ResponseEntity<?> deleteTable(@PathVariable Long id) {
        BilliardsTable table = billiardsTableService.findById(id).orElse(null);
        if (table == null) {
            return ResponseEntity.notFound().build();
        }
        billiardsTableService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // 预约相关接口
    @GetMapping("/reservations")
    public ResponseEntity<?> getReservations() {
        List<Reservation> reservations = reservationService.findAll();
        
        // 转换为包含详细信息的Map列表
        List<Map<String, Object>> reservationList = new ArrayList<>();
        for (Reservation reservation : reservations) {
            Map<String, Object> reservationMap = new HashMap<>();
            reservationMap.put("id", reservation.getId());
            reservationMap.put("account", reservation.getAccount());
            reservationMap.put("tableId", reservation.getTableId());
            reservationMap.put("billiardsTableId", reservation.getBilliardsTableId());
            reservationMap.put("startDateTime", reservation.getStartDateTime());
            reservationMap.put("endDateTime", reservation.getEndDateTime());
            reservationMap.put("totalAmount", reservation.getTotalAmount());
            reservationMap.put("depositAmount", reservation.getDepositAmount());
            reservationMap.put("depositStatus", reservation.getDepositStatus());
            reservationMap.put("status", reservation.getStatus());
            
            // 获取球桌名称
            BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
            if (table != null) {
                reservationMap.put("tableName", table.getName());
            } else {
                reservationMap.put("tableName", "未知球桌");
            }
            
            reservationList.add(reservationMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", reservationList);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reservations/{id}")
    public ResponseEntity<?> getReservationById(@PathVariable Long id) {
        Reservation reservation = reservationService.findById(id);
        if (reservation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(reservation);
    }

    @PostMapping("/reservations")
    public ResponseEntity<?> createReservation(@RequestBody Reservation reservation) {
        Reservation savedReservation = reservationService.save(reservation);
        return ResponseEntity.ok(savedReservation);
    }

    @PutMapping("/reservations/{id}")
    public ResponseEntity<?> updateReservation(@PathVariable Long id, @RequestBody Reservation reservation) {
        Reservation existingReservation = reservationService.findById(id);
        if (existingReservation == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 只更新允许修改的字段
        if (reservation.getAccount() != null) {
            existingReservation.setAccount(reservation.getAccount());
        }
        if (reservation.getStartDateTime() != null) {
            existingReservation.setStartDateTime(reservation.getStartDateTime());
        }
        if (reservation.getEndDateTime() != null) {
            existingReservation.setEndDateTime(reservation.getEndDateTime());
        }
        if (reservation.getTotalAmount() != null) {
            existingReservation.setTotalAmount(reservation.getTotalAmount());
        }
        if (reservation.getDepositAmount() != null) {
            existingReservation.setDepositAmount(reservation.getDepositAmount());
        }
        if (reservation.getStatus() != null) {
            existingReservation.setStatus(reservation.getStatus());
        }
        if (reservation.getTableId() != null) {
            existingReservation.setTableId(reservation.getTableId());
            existingReservation.setBilliardsTableId(reservation.getTableId());
        }
        
        Reservation updatedReservation = reservationService.save(existingReservation);
        return ResponseEntity.ok(updatedReservation);
    }

    @DeleteMapping("/reservations/{id}")
    public ResponseEntity<?> deleteReservation(@PathVariable Long id) {
        Reservation reservation = reservationService.findById(id);
        if (reservation == null) {
            return ResponseEntity.notFound().build();
        }
        reservationService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // 会话相关接口
    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions() {
        List<Session> sessions = sessionService.findAll();
        List<Map<String, Object>> sessionList = new ArrayList<>();
        
        for (Session session : sessions) {
            Map<String, Object> sessionMap = new HashMap<>();
            sessionMap.put("id", session.getId());
            sessionMap.put("account", session.getAccount());
            sessionMap.put("tableId", session.getTableId());
            sessionMap.put("billiardsTableId", session.getBilliardsTableId());
            sessionMap.put("startDateTime", session.getStartDateTime());
            sessionMap.put("endDateTime", session.getEndDateTime());
            sessionMap.put("startAt", session.getStartDateTime()); // 兼容前端字段名
            sessionMap.put("endAt", session.getEndDateTime()); // 兼容前端字段名
            sessionMap.put("userId", session.getAccount()); // 兼容前端字段名
            
            // 获取球桌名称
            BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
            if (table != null) {
                sessionMap.put("tableName", table.getName());
            } else {
                sessionMap.put("tableName", "");
            }
            
            sessionList.add(sessionMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("data", sessionList);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id) {
        Session session = sessionService.findById(id);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody Session session) {
        Session savedSession = sessionService.save(session);
        return ResponseEntity.ok(savedSession);
    }

    @PutMapping("/sessions/{id}")
    public ResponseEntity<?> updateSession(@PathVariable Long id, @RequestBody Session session) {
        Session existingSession = sessionService.findById(id);
        if (existingSession == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 只更新允许修改的字段
        if (session.getStartDateTime() != null) {
            existingSession.setStartDateTime(session.getStartDateTime());
        }
        if (session.getEndDateTime() != null) {
            existingSession.setEndDateTime(session.getEndDateTime());
        }
        if (session.getAccount() != null) {
            existingSession.setAccount(session.getAccount());
        }
        if (session.getTableId() != null) {
            existingSession.setTableId(session.getTableId());
            existingSession.setBilliardsTableId(session.getTableId());
        }
        
        Session updatedSession = sessionService.save(existingSession);
        return ResponseEntity.ok(updatedSession);
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> deleteSession(@PathVariable Long id) {
        try {
            Session session = sessionService.findById(id);
            if (session == null) {
                return ResponseEntity.status(404).body("会话不存在，ID: " + id);
            }
            
            // 检查会话是否已结束，如果未结束需要先结束会话
            if (session.getEndDateTime() == null) {
                // 会话未结束，先结束会话
                session.setEndDateTime(new Date());
                sessionService.save(session);
            }
            
            sessionService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("删除会话失败: " + e.getMessage());
        }
    }

    // 消费相关接口
    @GetMapping("/consumptions")
    public ResponseEntity<?> getConsumptions() {
        List<Consumption> consumptions = consumptionService.findAll();
        Map<String, Object> response = new HashMap<>();
        response.put("data", consumptions);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/consumptions/{id}")
    public ResponseEntity<?> getConsumptionById(@PathVariable Long id) {
        Consumption consumption = consumptionService.findById(id);
        if (consumption == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(consumption);
    }

    @PostMapping("/consumptions")
    public ResponseEntity<?> createConsumption(@RequestBody Consumption consumption) {
        // 确保状态字段有默认值
        if (consumption.getStatus() == null || consumption.getStatus().trim().isEmpty()) {
            consumption.setStatus("COMPLETED"); // 默认设置为已完成
        }
        Consumption savedConsumption = consumptionService.save(consumption);
        return ResponseEntity.ok(savedConsumption);
    }

    @PutMapping("/consumptions/{id}")
    public ResponseEntity<?> updateConsumption(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Consumption existingConsumption = consumptionService.findById(id);
        if (existingConsumption == null) {
            return ResponseEntity.notFound().build();
        }
        
        Integer minutes = request.containsKey("minutes") ? Integer.parseInt(request.get("minutes").toString()) : null;
        Double amountVal = request.containsKey("amount") ? Double.parseDouble(request.get("amount").toString()) : null;
        java.math.BigDecimal amount = amountVal != null ? java.math.BigDecimal.valueOf(amountVal) : null;
        Boolean linkWallet = request.containsKey("linkWallet") ? Boolean.valueOf(request.get("linkWallet").toString()) : false;
        
        String status = (String) request.get("status");
        String account = (String) request.get("account");
        Integer tableId = request.containsKey("tableId") ? Integer.parseInt(request.get("tableId").toString()) : null;
        
        // 解析时间
        Object startDateTimeObj = request.get("startDateTime");
        Object endDateTimeObj = request.get("endDateTime");
        Date startDateTime = null;
        Date endDateTime = null;
        
        try {
            if (startDateTimeObj != null) {
                if (startDateTimeObj instanceof Long) {
                    startDateTime = new Date((Long) startDateTimeObj);
                } else {
                    String s = startDateTimeObj.toString();
                    try {
                        startDateTime = new Date(Long.parseLong(s));
                    } catch (NumberFormatException e) {
                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                        startDateTime = sdf.parse(s);
                    }
                }
            }
            if (endDateTimeObj != null) {
                 if (endDateTimeObj instanceof Long) {
                    endDateTime = new Date((Long) endDateTimeObj);
                } else {
                    String s = endDateTimeObj.toString();
                    try {
                        endDateTime = new Date(Long.parseLong(s));
                    } catch (NumberFormatException e) {
                        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                        endDateTime = sdf.parse(s);
                    }
                }
            }
        } catch (Exception ex) {
            // 静默处理日期解析错误
        }

        // 保存原始金额
        java.math.BigDecimal oldAmount = existingConsumption.getAmount();
        if (oldAmount == null) {
            oldAmount = java.math.BigDecimal.ZERO;
        }
        
        // 只更新允许修改的字段
        if (minutes != null) {
            existingConsumption.setMinutes(minutes);
        }
        if (amount != null) {
            existingConsumption.setAmount(amount);
        }
        if (status != null) {
            existingConsumption.setStatus(status);
        }
        if (account != null) {
            existingConsumption.setAccount(account);
        }
        if (tableId != null) {
            existingConsumption.setTableId(tableId.longValue());
            existingConsumption.setBilliardsTableId(tableId.longValue());
        }
        if (startDateTime != null) {
            existingConsumption.setStartDateTime(startDateTime);
        }
        if (endDateTime != null) {
            existingConsumption.setEndDateTime(endDateTime);
        }
        
        Consumption updatedConsumption = consumptionService.save(existingConsumption);
        
        // 如果需要同步钱包且金额发生了变化
        if (Boolean.TRUE.equals(linkWallet) && amount != null) {
            java.math.BigDecimal diff = amount.subtract(oldAmount);
            if (diff.compareTo(java.math.BigDecimal.ZERO) != 0) {
                // 查找用户
                String userAccount = existingConsumption.getAccount();
                if (userAccount != null) {
                    User user = userService.findByAccount(userAccount);
                    if (user != null) {
                        // 更新余额: 原余额 - 差额 (如果金额增加，余额减少；如果金额减少，余额增加)
                        // 注意：这里假设amount是消费金额，消费越多余额越少
                        Double currentBalance = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
                        user.setWalletBalance(currentBalance - diff.doubleValue());
                        userService.save(user);
                    }
                }
            }
        }
        
        return ResponseEntity.ok(updatedConsumption);
    }

    @DeleteMapping("/consumptions/{id}")
    public ResponseEntity<?> deleteConsumption(@PathVariable Long id) {
        Consumption consumption = consumptionService.findById(id);
        if (consumption == null) {
            return ResponseEntity.notFound().build();
        }
        consumptionService.deleteById(id);
        return ResponseEntity.ok().build();
    }
    
    // 管理员管理相关接口
    
    // 获取所有管理员列表
    @GetMapping("/admins")
    public ResponseEntity<?> getAdmins() {
        List<Admin> admins = adminService.findAll();
        // 过滤掉已注销的账号（以 deleted_ 开头）
        List<Admin> activeAdmins = new ArrayList<>();
        for (Admin admin : admins) {
            if (!admin.getAccount().startsWith("deleted_")) {
                activeAdmins.add(admin);
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("data", activeAdmins);
        return ResponseEntity.ok(response);
    }
    
    // 获取当前管理员信息
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentAdmin() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            Admin admin = adminService.findByAccount(username);
            if (admin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            Map<String, Object> adminInfo = new HashMap<>();
            adminInfo.put("account", admin.getAccount());
            adminInfo.put("name", admin.getName());
            adminInfo.put("isSuperAdmin", admin.getIsSuperAdmin());
            
            return ResponseEntity.ok(adminInfo);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取管理员信息失败");
        }
    }

    // 管理员注销账号
    @DeleteMapping("/deregister")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deregisterAdmin() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            Admin admin = adminService.findByAccount(username);
            if (admin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            // 检查是否为超级管理员
            if (admin.getIsSuperAdmin() != null && admin.getIsSuperAdmin()) {
                return createResponse(false, "超级管理员账号不可被注销");
            }
            
            // 至少保留一个管理员
            List<Admin> admins = adminService.findAll();
            if (admins.size() <= 1) {
                return createResponse(false, "无法删除最后一个管理员账号");
            }

            // 数据匿名化处理
            String anonymizedAccount = "deleted_" + System.currentTimeMillis() + "_admin_" + admin.getId();
            
            reservationService.updateAccount(username, anonymizedAccount);
            sessionService.updateAccount(username, anonymizedAccount);
            consumptionService.updateAccount(username, anonymizedAccount);
            rechargeService.updateAccount(username, anonymizedAccount);
            
            adminService.deleteById(admin.getId());
            return ResponseEntity.ok("管理员账号已注销");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("注销失败");
        }
    }
    
    // 获取单个管理员详情
    @GetMapping("/admins/{id}")
    public ResponseEntity<?> getAdminById(@PathVariable Long id) {
        Admin admin = adminService.findById(id);
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(admin);
    }
    
    // 创建新管理员
    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(@RequestBody Map<String, Object> adminRequest) {
        try {
            // 更灵活的参数获取方式，支持String和Object类型
            Object accountObj = adminRequest.get("account");
            Object passwordObj = adminRequest.get("password");
            Object nameObj = adminRequest.get("name");
            
            String account = accountObj != null ? accountObj.toString().trim() : null;
            String password = passwordObj != null ? passwordObj.toString().trim() : null;
            String name = nameObj != null ? nameObj.toString().trim() : null;
            
            if (account == null || account.isEmpty() || password == null || password.isEmpty()) {
                return createResponse(false, "账号和密码不能为空");
            }
            
            if (adminService.existsByAccount(account)) {
                return createResponse(false, "账号已存在");
            }

            // 检查是否与普通用户账号冲突
            if (userService.existsByAccount(account)) {
                return createResponse(false, "账号已存在（与普通用户冲突）");
            }
            
            Admin admin = new Admin();
            admin.setAccount(account);
            admin.setPassword(password);
            admin.setName(name);
            
            Admin savedAdmin = adminService.save(admin);
            return ResponseEntity.ok(savedAdmin);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("创建管理员失败");
        }
    }
    
    // 更新管理员信息
    @PutMapping("/admins/{id}")
    public ResponseEntity<?> updateAdmin(@PathVariable Long id, @RequestBody Map<String, Object> adminRequest) {
        try {
            Admin existingAdmin = adminService.findById(id);
            if (existingAdmin == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 更灵活的参数获取方式，支持String和Object类型
            Object nameObj = adminRequest.get("name");
            Object passwordObj = adminRequest.get("password");
            
            String name = nameObj != null ? nameObj.toString().trim() : null;
            String password = passwordObj != null ? passwordObj.toString().trim() : null;
            
            if (name != null) {
                existingAdmin.setName(name);
            }
            
            if (password != null && !password.isEmpty()) {
                existingAdmin.setPassword(password);
            }
            
            Admin updatedAdmin = adminService.save(existingAdmin);
            return ResponseEntity.ok(updatedAdmin);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("更新管理员失败");
        }
    }
    
    // 删除管理员
    @DeleteMapping("/admins/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteAdmin(@PathVariable Long id) {
        try {
            Admin admin = adminService.findById(id);
            if (admin == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 保护超级管理员admin账号，不允许删除
            if ("admin".equals(admin.getAccount())) {
                return createResponse(false, "超级管理员账号无法删除");
            }
            
            // 数据匿名化处理
            String username = admin.getAccount();
            String anonymizedAccount = "deleted_" + System.currentTimeMillis() + "_admin_" + admin.getId();
            
            reservationService.updateAccount(username, anonymizedAccount);
            sessionService.updateAccount(username, anonymizedAccount);
            consumptionService.updateAccount(username, anonymizedAccount);
            rechargeService.updateAccount(username, anonymizedAccount);
            
            adminService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("删除管理员失败");
        }
    }
    
    // 将普通用户添加为管理员
    @PostMapping("/admins/from-user")
    public ResponseEntity<?> addAdminFromUser(@RequestBody Map<String, Object> request) {
        try {
            // 验证管理员身份
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (adminUsername.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 检查管理员是否存在
            Admin currentAdmin = adminService.findByAccount(adminUsername);
            if (currentAdmin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            // 更灵活的参数获取方式，支持String和Object类型
            Object userAccountObj = request.get("userAccount");
            String userAccount = userAccountObj != null ? userAccountObj.toString().trim() : null;
            
            if (userAccount == null || userAccount.isEmpty()) {
                return createResponse(false, "用户账号不能为空");
            }
            
            // 检查用户是否存在
            User user = userService.findByAccount(userAccount);
            if (user == null) {
                return createResponse(false, "用户不存在");
            }
            
            // 检查是否已存在相同账号的管理员
            if (adminService.existsByAccount(userAccount)) {
                return createResponse(false, "该用户已为管理员");
            }
            
            // 创建管理员账号，直接使用用户原有的密码
            Admin admin = new Admin();
            admin.setAccount(user.getAccount());
            admin.setPassword(user.getPassword()); // 使用用户原密码
            admin.setName(user.getName() != null ? user.getName() : user.getAccount());
            
            Admin savedAdmin = adminService.save(admin);
            
            // 删除原普通用户，避免同一账号同时存在于用户和管理员列表中
            userService.deleteById(user.getId());
            
            return ResponseEntity.ok(savedAdmin);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("添加管理员失败");
        }
    }

    // 将管理员降级为普通用户
    @PostMapping("/admins/demote")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> demoteAdminToUser(@RequestBody Map<String, Object> request) {
        try {
            // 验证管理员身份
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (adminUsername.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 检查管理员是否存在
            Admin currentAdmin = adminService.findByAccount(adminUsername);
            if (currentAdmin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            String adminIdStr = request.get("adminId").toString();
            Long adminId = Long.parseLong(adminIdStr);
            
            Admin admin = adminService.findById(adminId);
            if (admin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            // 至少保留一个管理员
            List<Admin> admins = adminService.findAll();
            if (admins.size() <= 1) {
                return createResponse(false, "无法降级最后一个管理员");
            }
            
            // 检查该账号是否已存在于用户表（虽然正常逻辑互斥，但防御性检查）
            if (userService.existsByAccount(admin.getAccount())) {
                return createResponse(false, "该账号已存在于用户列表中，无法降级");
            }

            // 禁止降级超级管理员 admin
            if ("admin".equals(admin.getAccount())) {
                return createResponse(false, "超级管理员账号不能被降级");
            }
            
            // 创建普通用户账号，保留原管理员的账号、密码和姓名
            User user = new User();
            user.setAccount(admin.getAccount());
            user.setPassword(admin.getPassword());
            user.setName(admin.getName());
            user.setWalletBalance(0.0); // 初始余额为0
            
            userService.save(user);
            
            // 删除管理员记录（直接删除，不进行匿名化处理，以便数据关联到新用户）
            adminService.deleteById(adminId);
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("降级管理员失败");
        }
    }

    // 管理员创建用户
    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userRequest) {
        String account = (String) userRequest.get("account");
        String password = (String) userRequest.get("password");
        Double walletBalance = userRequest.get("walletBalance") != null ? Double.parseDouble(userRequest.get("walletBalance").toString()) : 0.0;
        String name = (String) userRequest.get("name");
        String phone = (String) userRequest.get("phone");

        if (phone != null && !phone.isEmpty() && !phone.matches("^\\d{11}$")) {
            return createResponse(false, "手机号格式不正确");
        }

        // 检查账号是否已存在（用户或管理员）
        if (userService.existsByAccount(account) || adminService.existsByAccount(account)) {
            return createResponse(false, "账户已存在");
        }

        User user = userService.createUser(account, password, walletBalance, name, phone);
        return ResponseEntity.ok(user);
    }

    // 获取所有用户列表
    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        List<User> users = userService.findAll();
        List<Map<String, Object>> userList = new ArrayList<>();
        
        for (User user : users) {
            // 过滤掉已注销的账号（以 deleted_ 开头）
            if (user.getAccount().startsWith("deleted_")) {
                continue;
            }
            
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("account", user.getAccount());
            userMap.put("name", user.getName());
            userMap.put("phone", user.getPhone());
            userMap.put("walletBalance", user.getWalletBalance());
            
            // Fetch latest consumption
            List<Consumption> consumptions = consumptionService.findByAccount(user.getAccount());
            if (consumptions != null && !consumptions.isEmpty()) {
                // Find latest by endDateTime or startDateTime if end is null
                consumptions.sort((c1, c2) -> {
                    Date d1 = c1.getEndDateTime() != null ? c1.getEndDateTime() : c1.getStartDateTime();
                    Date d2 = c2.getEndDateTime() != null ? c2.getEndDateTime() : c2.getStartDateTime();
                    if (d1 == null && d2 == null) return 0;
                    if (d1 == null) return 1;
                    if (d2 == null) return -1;
                    return d2.compareTo(d1); // Descending
                });
                Consumption latest = consumptions.get(0);
                Date lastDate = latest.getEndDateTime() != null ? latest.getEndDateTime() : latest.getStartDateTime();
                userMap.put("lastConsumptionTime", lastDate);
            } else {
                userMap.put("lastConsumptionTime", null);
            }
            
            userList.add(userMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", userList);
        return ResponseEntity.ok(response);
    }

    // 更新用户信息
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> userRequest) {
        User user = userService.findById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        String name = (String) userRequest.get("name");
        String password = (String) userRequest.get("password");
        String phone = (String) userRequest.get("phone");

        if (name != null) {
            user.setName(name);
        }
        if (password != null && !password.isEmpty()) {
            // UserService.save will handle password encoding if it's not already encoded
            user.setPassword(password);
        }
        if (phone != null && !phone.isEmpty()) {
            if (!phone.matches("^\\d{11}$")) {
                return createResponse(false, "手机号格式不正确");
            }
            user.setPhone(phone);
        }

        User updatedUser = userService.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    // 删除用户
    @DeleteMapping("/users/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userService.findById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // 数据匿名化处理
        String username = user.getAccount();
        String anonymizedAccount = "deleted_" + System.currentTimeMillis() + "_" + user.getId();
        
        reservationService.updateAccount(username, anonymizedAccount);
        sessionService.updateAccount(username, anonymizedAccount);
        consumptionService.updateAccount(username, anonymizedAccount);
        rechargeService.updateAccount(username, anonymizedAccount);

        userService.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ==================== 充值记录管理API ====================

    // 获取所有充值记录（使用现有的recharge表）
    @GetMapping("/recharge-records")
    public ResponseEntity<?> getAllRechargeRecords() {
        try {
            // 直接从recharge表获取所有充值记录
            List<Recharge> rechargeRecords = rechargeService.findAll();
            
            // 转换为前端需要的格式
            List<Map<String, Object>> recordList = new ArrayList<>();
            for (Recharge record : rechargeRecords) {
                Map<String, Object> recordMap = new HashMap<>();
                recordMap.put("id", record.getId());
                recordMap.put("account", record.getAccount());
                recordMap.put("amount", record.getAmount() != null ? record.getAmount().doubleValue() : 0.0);
                recordMap.put("rechargeTime", record.getCreatedAt()); // 使用创建时间作为充值时间
                recordMap.put("status", record.getStatus() != null ? record.getStatus() : "SUCCESS");
                recordMap.put("paymentMethod", record.getPaymentMethod() != null ? record.getPaymentMethod() : "WECHAT"); // 使用实际支付方式
                recordMap.put("transactionId", "RC" + record.getId()); // 生成交易ID
                recordMap.put("remark", "管理员代充");
                
                // 获取用户信息
                User user = userService.findByAccount(record.getAccount());
                if (user != null) {
                    recordMap.put("userName", user.getName());
                    recordMap.put("userPhone", user.getPhone());
                } else {
                    recordMap.put("userName", "未知用户");
                    recordMap.put("userPhone", "");
                }
                
                recordList.add(recordMap);
            }
            
            // 按充值时间倒序排列
            recordList.sort((a, b) -> {
                Date timeA = (Date) a.get("rechargeTime");
                Date timeB = (Date) b.get("rechargeTime");
                return timeB.compareTo(timeA);
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", recordList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("data", new ArrayList<>());
            return ResponseEntity.ok(errorResponse);
        }
    }

    // 根据ID获取充值记录
    @GetMapping("/recharge-records/{id}")
    public ResponseEntity<?> getRechargeRecordById(@PathVariable Long id) {
        try {
            Optional<Recharge> recordOpt = rechargeService.findById(id);
            if (!recordOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(recordOpt.get());
        } catch (Exception e) {
            return createResponse(false, "获取充值记录失败: " + e.getMessage());
        }
    }

    // 创建充值记录
    @PostMapping("/recharge-records")
    public ResponseEntity<?> createRechargeRecord(@RequestBody Map<String, Object> rechargeRequest) {
        try {
            // 验证管理员身份
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (adminUsername.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 检查管理员是否存在
            Admin admin = adminService.findByAccount(adminUsername);
            if (admin == null) {
                return createResponse(false, "管理员不存在");
            }
            
            // 更灵活的参数获取方式，支持String和Object类型
            Object accountObj = rechargeRequest.get("account");
            Object amountObj = rechargeRequest.get("amount");
            Object paymentMethodObj = rechargeRequest.get("paymentMethod");
            
            String account = accountObj != null ? accountObj.toString().trim() : null;
            Double amount = null;
            try {
                amount = amountObj != null ? Double.valueOf(amountObj.toString()) : null;
            } catch (NumberFormatException e) {
                return createResponse(false, "充值金额格式不正确");
            }
            String paymentMethod = paymentMethodObj != null ? paymentMethodObj.toString().trim() : null;
            
            if (account == null || amount == null || amount <= 0) {
                return createResponse(false, "账户和金额不能为空，且金额必须大于0");
            }
            
            // 验证支付方式
            if (paymentMethod == null || (!paymentMethod.equals("WECHAT") && !paymentMethod.equals("ALIPAY") && !paymentMethod.equals("ADMIN"))) {
                paymentMethod = "ADMIN"; // 默认管理员充值
            }
            
            // 检查用户是否存在
            User user = userService.findByAccount(account);
            if (user == null) {
                return createResponse(false, "用户不存在: " + account);
            }
            
            // 生成交易ID
            String transactionId = "ADMIN_RC" + System.currentTimeMillis() + "_" + account;
            
            // 创建充值记录
            Recharge record = new Recharge();
            record.setAccount(account);
            record.setAmount(java.math.BigDecimal.valueOf(amount));
            record.setCreatedAt(new Date());
            record.setStatus("SUCCESS");
            record.setPaymentMethod(paymentMethod);
            record.setTransactionId(transactionId);
            
            // 计算充值后余额
            Double currentBalance = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
            record.setBalanceAfter(currentBalance + amount);
            
            // 更新用户余额
            user.setWalletBalance(currentBalance + amount);
            userService.save(user);
            
            Recharge savedRecord = rechargeService.save(record);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "充值成功");
            response.put("data", savedRecord);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return createResponse(false, "创建充值记录失败: " + e.getMessage());
        }
    }

    // 更新充值记录
    @PutMapping("/recharge-records/{id}")
    public ResponseEntity<?> updateRechargeRecord(@PathVariable Long id, @RequestBody Recharge recharge) {
        try {
            Optional<Recharge> existingRecordOpt = rechargeService.findById(id);
            if (!existingRecordOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Recharge existingRecord = existingRecordOpt.get();
            
            // 记录原始金额和状态
            BigDecimal oldAmount = existingRecord.getAmount();
            String oldStatus = existingRecord.getStatus();
            
            // 更新字段
            if (recharge.getAmount() != null) {
                existingRecord.setAmount(recharge.getAmount());
            }
            if (recharge.getStatus() != null) {
                existingRecord.setStatus(recharge.getStatus());
            }
            if (recharge.getPaymentMethod() != null) {
                existingRecord.setPaymentMethod(recharge.getPaymentMethod());
            }
            if (recharge.getAdminAccount() != null) {
                existingRecord.setAdminAccount(recharge.getAdminAccount());
            }
            if (recharge.getRemark() != null) {
                existingRecord.setRemark(recharge.getRemark());
            }
            if (recharge.getCreatedAt() != null) {
                existingRecord.setCreatedAt(recharge.getCreatedAt());
            }
            
            // 如果金额或状态发生变化，需要同步更新用户余额
            if ((oldAmount != null && !oldAmount.equals(recharge.getAmount())) || 
                (oldStatus != null && !oldStatus.equals(recharge.getStatus()))) {
                
                // 获取用户信息
                User user = userService.findByAccount(existingRecord.getAccount());
                if (user != null) {
                    // 重新计算用户余额：减去原充值金额，加上新充值金额
                    Double newBalance = user.getWalletBalance();
                    
                    // 如果原状态是成功，减去原金额
                    if ("SUCCESS".equals(oldStatus) && oldAmount != null) {
                        newBalance = newBalance - oldAmount.doubleValue();
                    }
                    
                    // 如果新状态是成功，加上新金额
                    if ("SUCCESS".equals(recharge.getStatus()) && recharge.getAmount() != null) {
                        newBalance = newBalance + recharge.getAmount().doubleValue();
                    }
                    
                    // 确保余额不为负数
                    if (newBalance < 0) {
                        newBalance = 0.0;
                    }
                    
                    user.setWalletBalance(newBalance);
                    userService.save(user);
                    
                    // 更新充值记录的余额后值
                    existingRecord.setBalanceAfter(newBalance);
                }
            }
            
            Recharge updatedRecord = rechargeService.save(existingRecord);
            return ResponseEntity.ok(updatedRecord);
        } catch (Exception e) {
            return createResponse(false, "更新充值记录失败: " + e.getMessage());
        }
    }

    // 删除充值记录
    @DeleteMapping("/recharge-records/{id}")
    public ResponseEntity<?> deleteRechargeRecord(@PathVariable Long id) {
        try {
            Optional<Recharge> recordOpt = rechargeService.findById(id);
            if (!recordOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            rechargeService.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return createResponse(false, "删除充值记录失败: " + e.getMessage());
        }
    }

    // 管理员降级为普通用户
    @PostMapping("/demote")
    public ResponseEntity<?> selfDemoteToUser(@RequestBody Map<String, String> request) {
        try {
            String account = request.get("account");
            if (account == null || account.trim().isEmpty()) {
                return createResponse(false, "账号不能为空");
            }
            
            // 检查是否为超级管理员
            if ("admin".equals(account)) {
                return createResponse(false, "超级管理员admin不能被降级为普通用户");
            }
            
            // 获取当前登录的管理员信息
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (currentUsername.equals("anonymousUser")) {
                return createResponse(false, "请先登录");
            }
            
            // 检查权限：只能降级自己
            if (!currentUsername.equals(account)) {
                return createResponse(false, "只能降级自己的账号");
            }
            
            // 查找管理员
            Admin admin = adminService.findByAccount(account);
            if (admin == null) {
                return createResponse(false, "管理员账号不存在");
            }
            
            // 检查是否已经是普通用户
            if (!"ADMIN".equals(admin.getRole())) {
                return createResponse(false, "该账号已经是普通用户");
            }
            
            // 执行降级操作：将管理员角色改为普通用户
            admin.setRole("USER");
            adminService.save(admin);
            
            return createResponse(true, "管理员账号已成功降级为普通用户");
            
        } catch (Exception e) {
            return createResponse(false, "降级操作失败：" + e.getMessage());
        }
    }

    // 管理员注销账号
    @PostMapping("/delete")
    public ResponseEntity<?> deleteAccount(@RequestBody Map<String, String> request) {
        try {
            String account = request.get("account");
            if (account == null || account.trim().isEmpty()) {
                return createResponse(false, "账号不能为空");
            }
            
            // 检查是否为超级管理员
            if ("admin".equals(account)) {
                return createResponse(false, "超级管理员 admin 账号不能注销");
            }
            
            // 获取当前登录的管理员信息
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (currentUsername.equals("anonymousUser")) {
                return createResponse(false, "请先登录");
            }
            
            // 检查权限：只能删除自己
            if (!currentUsername.equals(account)) {
                return createResponse(false, "只能注销自己的账号");
            }
            
            // 查找管理员
            Admin admin = adminService.findByAccount(account);
            if (admin == null) {
                return createResponse(false, "管理员账号不存在");
            }
            
            // 匿名化账号信息
            String anonymizedAccount = "deleted_" + System.currentTimeMillis() + "_admin_" + admin.getId();
            admin.setAccount(anonymizedAccount);
            admin.setName("已注销用户");
            admin.setRole("USER");
            admin.setPassword("");
            adminService.save(admin);
            
            return createResponse(true, "管理员账号已永久注销");
            
        } catch (Exception e) {
            return createResponse(false, "注销操作失败：" + e.getMessage());
        }
    }

    private ResponseEntity<?> createResponse(boolean success, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", message);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 手动触发自动结算（用于测试或紧急情况）
     */
    @PostMapping("/auto-settle")
    public ResponseEntity<?> triggerAutoSettle() {
        try {
            // 验证管理员身份
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (adminUsername.equals("anonymousUser")) {
                return createResponse(false, "请先登录");
            }
            
            // 触发自动结算
            Map<String, Object> result = autoSettlementService.triggerManualSettlement();
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return createResponse(false, "触发自动结算失败：" + e.getMessage());
        }
    }
}