package com.unmanned.billiards.controller;

import com.unmanned.billiards.entity.BilliardsTable;
import com.unmanned.billiards.entity.Consumption;
import com.unmanned.billiards.entity.Notification;
import com.unmanned.billiards.entity.Recharge;
import com.unmanned.billiards.entity.Reservation;
import com.unmanned.billiards.entity.Session;
import com.unmanned.billiards.entity.User;
import com.unmanned.billiards.service.BilliardsTableService;
import com.unmanned.billiards.repository.UserRepository;
import com.unmanned.billiards.service.ConsumptionService;
import com.unmanned.billiards.service.RechargeService;
import com.unmanned.billiards.service.ReservationService;
import com.unmanned.billiards.service.SessionService;
import com.unmanned.billiards.service.UserService;
import com.unmanned.billiards.service.AdminService;
import com.unmanned.billiards.service.NotificationService;
import com.unmanned.billiards.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TimeZone;
import java.util.stream.Collectors;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;


/**
 * 用户控制器
 * 处理用户相关的所有API请求
 */
@RestController
@RequestMapping("/api")
public class UserController {
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;
    
    @Autowired
    private BilliardsTableService billiardsTableService;
    
    @Autowired
    private SessionService sessionService;
    
    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private AdminService adminService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private ConsumptionService consumptionService;
    
    @Autowired
    private RechargeService rechargeService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private com.unmanned.billiards.service.BillingService billingService;

    // ========== 公共工具方法 ==========

    // MD5 加密方法
    private String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : messageDigest) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 算法不可用", e);
        }
    }

    // 辅助方法：构建响应
    private ResponseEntity<?> createResponse(boolean success, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    // 状态文本转换
    private String getStatusText(String status) {
        switch (status) {
            case "AVAILABLE":
                return "可用";
            case "IN_USE":
                return "使用中";
            case "RESERVED":
                return "已预约";
            case "FAULT":
                return "故障";
            default:
                return status;
        }
    }

    // 检查球桌是否有有效预约
    private boolean hasActiveReservation(BilliardsTable table, Date now) {
        List<Reservation> activeReservations = reservationService.findByTableId(table.getId());
        if (activeReservations.isEmpty()) {
            return false;
        }

        long nowTime = now.getTime();
        for (Reservation reservation : activeReservations) {
            if ("PENDING".equals(reservation.getStatus())) {
                long startTime = reservation.getStartDateTime().getTime();
                long endTime = reservation.getEndDateTime().getTime();
                if (nowTime >= startTime && nowTime <= endTime) {
                    return true;
                }
            }
        }
        return false;
    }

    // 获取球桌显示状态
    private String getDisplayStatus(BilliardsTable table, Date now) {
        String displayStatus = table.getStatus();
        
        // 检查是否有有效预约
        if (hasActiveReservation(table, now)) {
            displayStatus = "RESERVED";
        }
        
        // 如果显示为RESERVED但没有有效预约，重置为AVAILABLE
        if ("RESERVED".equals(displayStatus) && !hasActiveReservation(table, now)) {
            displayStatus = "AVAILABLE";
            table.setStatus("AVAILABLE");
            table.setCurrentReservationId(null);
            billiardsTableService.save(table);
        }
        
        return displayStatus;
    }

    // 计算会话时长和费用
    private Map<String, Object> calculateSessionCost(Session session, BilliardsTable table, Date endTime) {
        Map<String, Object> result = new HashMap<>();
        
        // 使用更精确的时间计算方法
        long startMillis = session.getStartDateTime().getTime();
        long endMillis = endTime.getTime();
        long durationMillis = Math.max(0, endMillis - startMillis);
        
        // 转换为分钟，向上取整
        double exactMinutes = durationMillis / 60000.0;
        int minutes = (int) Math.ceil(exactMinutes);
        minutes = Math.max(1, minutes); // 至少1分钟
        
        // 按10分钟单位折算（业务规则）
        int billingMinutes = (int) Math.ceil(minutes / 10.0) * 10;
        billingMinutes = Math.max(10, billingMinutes); // 至少按10分钟计算

        // 获取价格，优先使用分钟价格，其次小时价格
        double pricePerMinute = getPricePerMinute(table);
        double pricePerHour = pricePerMinute * 60;

        // 计算费用
        double actualPlayCost = (billingMinutes / 60.0) * pricePerHour;
        actualPlayCost = Math.round(actualPlayCost * 100.0) / 100.0;

        result.put("durationMinutes", minutes);
        result.put("billingMinutes", billingMinutes);
        result.put("totalCost", actualPlayCost);
        result.put("pricePerHour", pricePerHour);
        result.put("pricePerMinute", pricePerMinute);
        
        return result;
    }
    
    // 获取每分钟价格
    private double getPricePerMinute(BilliardsTable table) {
        // 优先使用配置的分钟价格
        if (table.getPricePerMinute() != null && table.getPricePerMinute() > 0) {
            return table.getPricePerMinute();
        }
        
        // 其次使用小时价格换算
        if (table.getPricePerHour() != null && table.getPricePerHour() > 0) {
            return table.getPricePerHour() / 60.0;
        }
        
        // 默认价格（应该从配置文件中读取）
        return 0.5;
    }

    // 用户注销账号
    @DeleteMapping("/user/deregister")
    @Transactional
    public ResponseEntity<?> deregister() {
        // 获取当前登录用户
        String account = SecurityContextHolder.getContext().getAuthentication().getName();
        if (account == null || account.equals("anonymousUser")) {
            return ResponseEntity.status(401).body("请先登录");
        }
        
        User user = userService.findByAccount(account);
        if (user == null) {
            return createResponse(false, "账户不存在");
        }
        
        // 检查余额
        if (user.getWalletBalance() > 0) {
            return createResponse(false, "账户余额不为零，请先提现或消费");
        }
        
        // 检查未完成的预约
        List<Reservation> reservations = reservationService.findByAccount(account);
        for (Reservation res : reservations) {
            if ("PENDING".equals(res.getStatus()) || "confirmed".equals(res.getStatus())) {
                return createResponse(false, "存在未完成的预约，请先取消或完成");
            }
        }
        
        // 检查正在进行的会话
        List<Session> sessions = sessionService.findByAccount(account);
        for (Session session : sessions) {
            if (session.getEndDateTime() == null) {
                return createResponse(false, "存在正在进行的会话，请先结账");
            }
        }
        
        // 数据匿名化处理
        String anonymizedAccount = "deleted_" + System.currentTimeMillis() + "_" + user.getId();
        
        reservationService.updateAccount(account, anonymizedAccount);
        sessionService.updateAccount(account, anonymizedAccount);
        consumptionService.updateAccount(account, anonymizedAccount);
        rechargeService.updateAccount(account, anonymizedAccount);
        
        // 删除用户
        userService.deleteById(user.getId());
        
        return createResponse(true, "账号注销成功");
    }

    // 用户注册
    @PostMapping("/user/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> registerRequest) {
        // 更灵活的参数获取方式，支持String和Object类型
        Object accountObj = registerRequest.get("account");
        Object passwordObj = registerRequest.get("password");
        Object nameObj = registerRequest.get("name");
        Object phoneObj = registerRequest.get("phone");
        
        String account = accountObj != null ? accountObj.toString().trim() : null;
        String password = passwordObj != null ? passwordObj.toString().trim() : null;
        String name = nameObj != null ? nameObj.toString().trim() : null;
        String phone = phoneObj != null ? phoneObj.toString().trim() : null;

        Map<String, Object> response = new HashMap<>();

        if (phone != null && !phone.isEmpty() && !phone.matches("^\\d{11}$")) {
            response.put("success", false);
            response.put("message", "手机号格式不正确");
            return ResponseEntity.ok(response);
        }

        if (userService.existsByAccount(account)) {
            response.put("success", false);
            response.put("message", "账户已存在");
            return ResponseEntity.ok(response);
        }

        // 检查是否与管理员账号冲突
        if (adminService.existsByAccount(account)) {
            response.put("success", false);
            response.put("message", "账户已存在（与管理员账号冲突）");
            return ResponseEntity.ok(response);
        }

        User user = new User();
        user.setAccount(account);
        user.setPassword(password); // 自动加密
        user.setName(name);
        user.setPhone(phone);
        user.setWalletBalance(0.0);
        userService.save(user);

        response.put("success", true);
        response.put("message", "注册成功");
        return ResponseEntity.ok(response);
    }

    // 用户登录
    @PostMapping("/user/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> loginRequest) {
        String account = null;
        try {
            // 更灵活的参数获取方式，支持String和Object类型
            Object accountObj = loginRequest.get("account");
            Object passwordObj = loginRequest.get("password");
            
            account = accountObj != null ? accountObj.toString().trim() : null;
            String password = passwordObj != null ? passwordObj.toString().trim() : null;

            // 输入验证
            if (account == null || account.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "账号不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (password == null || password.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "密码不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 账号格式验证（只允许字母、数字、下划线）
            if (!account.matches("^[a-zA-Z0-9_]+$")) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "账号格式不正确");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 密码长度验证
            if (password.length() < 6 || password.length() > 50) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "密码长度应在6-50位之间");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 防止SQL注入攻击
            if (account.contains("'") || account.contains("\"") || account.contains(";")) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "账号格式不正确");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userService.findByAccount(account);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "账户不存在");
                return ResponseEntity.ok(response);
            }
            
            boolean passwordCheckResult = userService.checkPassword(password, user.getPassword());
            
            if (!passwordCheckResult) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "密码错误");
                return ResponseEntity.ok(response);
            }
            
            // 创建UserDetails对象，使用用户的实际密码
            // 统一使用BCrypt加密密码
            String userPassword = user.getPassword();
            if (userPassword == null) {
                userPassword = ""; // 空密码
            }
            
            // 使用bcrypt前缀
            String encodedPassword = "{bcrypt}" + userPassword;
            
            UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                    .username(user.getAccount())
                    .password(encodedPassword) // 使用BCrypt加密的密码
                    .roles("USER")
                    .build();
            
            // 生成JWT令牌
            String jwt = jwtUtils.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("account", user.getAccount());
            response.put("walletBalance", user.getWalletBalance());
            response.put("name", user.getName());
            response.put("phone", user.getPhone());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "登录失败，请稍后重试");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // 用户重置密码
    @PostMapping("/user/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, Object> request) {
        // 更灵活的参数获取方式，支持String和Object类型
        Object accountObj = request.get("account");
        Object phoneObj = request.get("phone");
        Object newPasswordObj = request.get("newPassword");
        
        String account = accountObj != null ? accountObj.toString().trim() : null;
        String phone = phoneObj != null ? phoneObj.toString().trim() : null;
        String newPassword = newPasswordObj != null ? newPasswordObj.toString().trim() : null;

        Map<String, Object> result = new HashMap<>();

        if (account == null || phone == null || newPassword == null) {
            result.put("success", false);
            result.put("message", "请填写完整信息");
            return ResponseEntity.ok(result);
        }

        User user = userService.findByAccount(account);
        if (user == null) {
            result.put("success", false);
            result.put("message", "验证失败！请联系管理员");
            return ResponseEntity.ok(result);
        }

        // 验证手机号
        if (user.getPhone() == null || !user.getPhone().equals(phone)) {
            result.put("success", false);
            result.put("message", "验证失败！请联系管理员");
            return ResponseEntity.ok(result);
        }

        // 更新密码
        user.setPassword(newPassword);
        userService.save(user);

        result.put("success", true);
        result.put("message", "密码重置成功");
        return ResponseEntity.ok(result);
    }

    // 用户更新个人信息
    @PutMapping("/user/update")
    public ResponseEntity<?> updateUserInfo(@RequestBody Map<String, Object> request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.findByAccount(username);
        if (user == null) {
            return ResponseEntity.status(401).body("用户不存在");
        }

        // 更灵活的参数获取方式，支持String和Object类型
        Object nameObj = request.get("name");
        Object phoneObj = request.get("phone");
        Object currentPasswordObj = request.get("currentPassword");
        Object newPasswordObj = request.get("newPassword");
        
        String name = nameObj != null ? nameObj.toString().trim() : null;
        String phone = phoneObj != null ? phoneObj.toString().trim() : null;
        String currentPassword = currentPasswordObj != null ? currentPasswordObj.toString().trim() : null;
        String newPassword = newPasswordObj != null ? newPasswordObj.toString().trim() : null;

        if (phone != null && !phone.matches("^\\d{11}$")) {
            return createResponse(false, "手机号格式不正确");
        }

        // 更新基本信息
        userService.updateUserInfo(user.getId(), name, phone);

        // 更新密码
        if (currentPassword != null && !currentPassword.isEmpty() && newPassword != null && !newPassword.isEmpty()) {
            boolean passwordUpdated = userService.updatePassword(username, currentPassword, newPassword);
            if (!passwordUpdated) {
                return createResponse(false, "当前密码错误");
            }
        }

        return createResponse(true, "更新成功");
    }

    // 获取当前登录用户的信息
    @GetMapping("/user/info")
    public ResponseEntity<?> getUserInfo() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        if (username == null || username.equals("anonymousUser")) {
            return ResponseEntity.status(401).body("请先登录");
        }
        
        User user = userService.findByAccount(username);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("account", user.getAccount());
        response.put("walletBalance", user.getWalletBalance());
        response.put("name", user.getName());
        response.put("phone", user.getPhone());

        return ResponseEntity.ok(response);
    }
    
    // 获取用户充值记录
    @GetMapping("/user/recharges")
    public ResponseEntity<?> getUserRecharges() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            List<Recharge> recharges = rechargeService.findByAccount(username);
            return ResponseEntity.ok(recharges);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取充值记录失败");
        }
    }
    
    // 钱包充值
    @PostMapping("/user/recharge")
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> recharge(@RequestBody Map<String, Object> rechargeRequest) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 更灵活的参数获取方式，支持String和Object类型
            Object amountObj = rechargeRequest.get("amount");
            Object paymentMethodObj = rechargeRequest.get("paymentMethod");
            
            Double amount = null;
            try {
                amount = amountObj != null ? Double.parseDouble(amountObj.toString()) : null;
            } catch (NumberFormatException e) {
                return createResponse(false, "充值金额格式不正确");
            }
            String paymentMethod = paymentMethodObj != null ? paymentMethodObj.toString().trim() : null;
            
            // 验证支付方式
            if (paymentMethod == null || (!paymentMethod.equals("WECHAT") && !paymentMethod.equals("ALIPAY"))) {
                paymentMethod = "WECHAT"; // 默认微信支付
            }
            
            // 查找当前登录用户
            User user = userService.findByAccount(username);
            if (user == null) {
                // 检查用户是否被注销（账户名以deleted_开头）
                if (username.startsWith("deleted_")) {
                    return ResponseEntity.status(404).body("用户账户已被注销，请重新注册");
                } else {
                    return ResponseEntity.status(404).body("用户不存在: " + username);
                }
            }
            
            // 增加余额
            user.setWalletBalance(user.getWalletBalance() + amount);
            userService.save(user);
        
        // 生成交易ID
        String transactionId = "RC" + System.currentTimeMillis() + "_" + username;
        
        // 创建充值记录
        Recharge recharge = new Recharge();
        recharge.setAccount(username);
        recharge.setAmount(java.math.BigDecimal.valueOf(amount));
        recharge.setBalanceAfter(user.getWalletBalance());
        recharge.setCreatedAt(new Date());
        recharge.setStatus("SUCCESS");
        recharge.setPaymentMethod(paymentMethod);
        recharge.setTransactionId(transactionId);
        rechargeService.save(recharge);
        
        Map<String, Object> response = new HashMap<>();
        response.put("account", user.getAccount());
        response.put("walletBalance", user.getWalletBalance());
        response.put("paymentMethod", paymentMethod);
        response.put("transactionId", transactionId);
        
        return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "充值失败，请稍后重试");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // 检查支付密码设置状态
    @GetMapping("/user/payment-password/check")
    public ResponseEntity<?> checkPaymentPassword() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            User user = userService.findByAccount(username);
            if (user == null) {
                return ResponseEntity.status(404).body("用户不存在");
            }
            
            String paymentPassword = user.getPaymentPassword();
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasPaymentPassword", paymentPassword != null && !paymentPassword.isEmpty());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("检查支付密码状态失败");
        }
    }

    // 设置支付密码
    @PostMapping("/user/payment-password/set")
    public ResponseEntity<?> setPaymentPassword(@RequestBody Map<String, Object> request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            User user = userService.findByAccount(username);
            if (user == null) {
                return ResponseEntity.status(404).body("用户不存在");
            }
            
            String paymentPassword = (String) request.get("paymentPassword");
            if (paymentPassword == null || paymentPassword.length() != 6 || !paymentPassword.matches("\\d{6}")) {
                return ResponseEntity.status(400).body("支付密码必须为 6 位数字");
            }
            
            // 使用 MD5 加密支付密码
            String encryptedPassword = md5(paymentPassword);
            user.setPaymentPassword(encryptedPassword);
            userService.save(user);
            
            // 强制刷新持久化上下文，确保数据写入数据库
            userRepository.flush();
            
            return ResponseEntity.ok("支付密码设置成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("设置支付密码失败：" + e.getMessage());
        }
    }

    // 验证支付密码
    @PostMapping("/user/payment-password/verify")
    public ResponseEntity<?> verifyPaymentPassword(@RequestBody Map<String, Object> request) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            User user = userService.findByAccount(username);
            if (user == null) {
                return ResponseEntity.status(404).body("用户不存在");
            }
            
            String paymentPassword = (String) request.get("paymentPassword");
            if (paymentPassword == null || paymentPassword.length() != 6 || !paymentPassword.matches("\\d{6}")) {
                return ResponseEntity.status(400).body("支付密码必须为 6 位数字");
            }
            
            // 验证支付密码（使用 MD5 加密）
            String encryptedPassword = md5(paymentPassword);
            if (!encryptedPassword.equals(user.getPaymentPassword())) {
                return ResponseEntity.status(400).body("支付密码错误");
            }
            
            return ResponseEntity.ok("支付密码验证成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("验证支付密码失败");
        }
    }

    // 管理员获取用户候选列表（非管理员用户）
    @GetMapping("/admin/user-candidates")
    public ResponseEntity<?> getUserCandidates() {
        List<User> users = userService.findAll();
        // 过滤掉已经是管理员的用户和已注销的账号
        List<User> filteredUsers = new ArrayList<>();
        for (User user : users) {
            if (!adminService.existsByAccount(user.getAccount()) && 
                !user.getAccount().startsWith("deleted_")) {
                filteredUsers.add(user);
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("data", filteredUsers);
        return ResponseEntity.ok(response);
    }
    
    // 获取球桌列表（公共访问）
    @GetMapping("/tables")
    public ResponseEntity<?> getTables() {
        List<BilliardsTable> tables = billiardsTableService.findAll();
        Date now = new Date();
        
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
        
        List<Map<String, Object>> tableList = new ArrayList<>();
        for (BilliardsTable table : tables) {
            Map<String, Object> tableMap = new HashMap<>();
            
            // 使用公共方法获取显示状态
            String displayStatus = getDisplayStatus(table, now);
            String statusText = getStatusText(displayStatus);
            
            // 更新字段值
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
            
            // 查询该球台的最近有效预约（包括当前预约和未来预约）
            List<Reservation> activeReservations = reservationService.findByTableId(table.getId());
            if ((displayStatus.equals("AVAILABLE") || displayStatus.equals("RESERVED")) && !activeReservations.isEmpty()) {
                // 找到所有有效预约（PENDING状态），按开始时间排序
                List<Reservation> validReservations = activeReservations.stream()
                        .filter(reservation -> "PENDING".equals(reservation.getStatus()))
                        .sorted(Comparator.comparing(Reservation::getStartDateTime))
                        .collect(Collectors.toList());
                
                // 找到最近的预约（包括当前正在进行的和未来的）
                Optional<Reservation> nearestReservation = validReservations.stream()
                        .filter(reservation -> !now.after(reservation.getEndDateTime()))
                        .findFirst();
                
                if (nearestReservation.isPresent()) {
                    Reservation reservation = nearestReservation.get();
                    String startDate = dateFormat.format(reservation.getStartDateTime());
                    String currentDate = dateFormat.format(now);
                    long nowTime = now.getTime();
                    String tomorrowDate = dateFormat.format(new Date(nowTime + 24 * 60 * 60 * 1000));
                    
                    // 确定时间描述
                    String timeDesc = "";
                    if (startDate.equals(currentDate)) {
                        timeDesc = "今日";
                    } else if (startDate.equals(tomorrowDate)) {
                        timeDesc = "明日";
                    } else {
                        // 超过明天显示具体日期
                        timeDesc = startDate;
                    }
                    
                    // 格式化时间范围
                    String startTime = timeFormat.format(reservation.getStartDateTime());
                    String endTime = timeFormat.format(reservation.getEndDateTime());
                    String reserveTime = timeDesc + " " + startTime + "-" + endTime;
                    
                    tableMap.put("reserveTime", reserveTime);
                } else {
                    // 如果没有找到有效预约，但球桌显示为RESERVED状态，设置默认的reserveTime
                    tableMap.put("reserveTime", "");
                }
            } else {
                // 如果球桌状态不是AVAILABLE或RESERVED，确保reserveTime字段存在
                tableMap.put("reserveTime", "");
            }
            
            // 为使用中的球台添加实时计费信息
            if (table.getStatus().equals("IN_USE")) {
                // 首先检查是否有currentSessionId，如果没有，尝试查找该球桌的未结束会话
                Long sessionId = table.getCurrentSessionId();
                Session session = null;
                
                if (sessionId != null) {
                    session = sessionService.findById(sessionId);
                } 
                
                // 如果通过currentSessionId没有找到会话，尝试查找该球桌的未结束会话
                if (session == null) {
                    session = sessionService.findActiveSessionByTableId(table.getId());
                    // 如果找到会话，更新球桌的currentSessionId
                    if (session != null) {
                        table.setCurrentSessionId(session.getId());
                        billiardsTableService.save(table);
                    }
                }
                
                if (session != null) {
                    // 计算实时时长和金额
                    long startTime = session.getStartDateTime().getTime();
                    long endTime = now.getTime();
                    int minutes = (int) Math.max(1, Math.ceil((endTime - startTime) / 60000.0));
                    
                    // 确保pricePerMinute有合理的默认值
                    double pricePerMinute = 0.5; // 默认每分钟0.5元
                    if (table.getPricePerMinute() != null && table.getPricePerMinute() > 0) {
                        pricePerMinute = table.getPricePerMinute();
                    } else if (table.getPricePerHour() != null) {
                        pricePerMinute = table.getPricePerHour() / 60.0;
                    }
                    
                    // 不到十分钟按十分钟扣费
                    long displayMinutes = minutes;
                    if (displayMinutes < 10) {
                        displayMinutes = 10;
                    }
                    double amount = displayMinutes * pricePerMinute;
                    
                    // 格式化金额
                    String amountText = String.format("%.2f", amount);
                    
                    // 创建实时会话信息
                    Map<String, Object> currentSessionInfo = new HashMap<>();
                    currentSessionInfo.put("id", session.getId());
                    currentSessionInfo.put("startDateTime", session.getStartDateTime());
                    currentSessionInfo.put("minutes", displayMinutes);
                    currentSessionInfo.put("amount", amount);
                    currentSessionInfo.put("amountText", amountText);
                    
                    tableMap.put("currentSessionInfo", currentSessionInfo);
                }
            }
            
            tableList.add(tableMap);
        }
        

        
        Map<String, Object> response = new HashMap<>();
        response.put("data", tableList);
        return ResponseEntity.ok(response);
    }
    
    // 获取单个球桌详情（公共访问）
    @GetMapping("/tables/{id}")
    public ResponseEntity<?> getTableById(@PathVariable Long id) {
        BilliardsTable table = billiardsTableService.findById(id).orElse(null);
        if (table == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 获取当前时间
        Date now = new Date();
        
        // 使用公共方法获取显示状态和状态文本
        String displayStatus = getDisplayStatus(table, now);
        String statusText = getStatusText(displayStatus);
        
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
        
        Map<String, Object> response = new HashMap<>();
        response.put("data", tableMap);
        return ResponseEntity.ok(response);
    }
    
    // 创建会话（开台）
    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody Map<String, Object> sessionRequest) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取球桌ID
            Long tableId = Long.parseLong(sessionRequest.get("tableId").toString());
            // 获取开台类型："reservation"或"immediate"
            String openType = (String) sessionRequest.getOrDefault("openType", "immediate");
            
            Date now = new Date();
            Reservation validReservation = null;
            
            if ("reservation".equals(openType)) {
                // 预约开台：检查用户是否有该球桌当前时间段的有效预约
                List<Reservation> userReservations = reservationService.findByAccount(username);
                boolean hasValidReservation = false;
                
                for (Reservation reservation : userReservations) {
                    if (reservation.getTableId().equals(tableId) && 
                        reservation.getStatus().equals("PENDING") &&
                        now.getTime() >= reservation.getStartDateTime().getTime() && 
                        now.getTime() <= reservation.getEndDateTime().getTime()) {
                        hasValidReservation = true;
                        validReservation = reservation;
                        // 更新预约状态为已使用
                        reservation.setStatus("USED");
                        reservationService.save(reservation);
                        break;
                    }
                }
                
                if (!hasValidReservation) {
                    // 检查是否有已过期的预约
                    boolean hasExpiredReservation = false;
                    for (Reservation reservation : userReservations) {
                        if (reservation.getTableId().equals(tableId) && 
                            reservation.getStatus().equals("PENDING") &&
                            now.getTime() > reservation.getEndDateTime().getTime()) {
                            hasExpiredReservation = true;
                            // 更新过期预约状态
                            reservation.setStatus("EXPIRED");
                            reservationService.save(reservation);
                            break;
                        }
                    }
                    
                    if (hasExpiredReservation) {
                        return createResponse(false, "您的预约已过期，请重新预约");
                    } else {
                        return createResponse(false, "您没有该球桌当前时间段的有效预约");
                    }
                }
            } else if ("immediate".equals(openType)) {
                // 现场开台：检查球桌状态
                BilliardsTable table = billiardsTableService.findById(tableId).orElse(null);
                if (table != null) {
                    if ("FAULT".equals(table.getStatus())) {
                        return createResponse(false, "该球桌当前处于故障状态，无法使用");
                    }
                    if ("IN_USE".equals(table.getStatus())) {
                        return createResponse(false, "该球桌正在使用中");
                    }
                    if ("RESERVED".equals(table.getStatus())) {
                        return createResponse(false, "该球桌已被预约");
                    }
                }
            }
            
            // 创建会话
            Session session = new Session();
            session.setTableId(tableId);
            session.setBilliardsTableId(tableId);
            session.setAccount(username);
            session.setStartDateTime(now);
            session.setOpenType(openType); // 记录开台类型
            if (validReservation != null) {
                session.setReservationId(validReservation.getId()); // 关联预约ID
            }
            
            // 保存会话
            Session savedSession = sessionService.save(session);
            
            // 更新球桌状态为使用中，并设置当前会话ID
            BilliardsTable table = billiardsTableService.findById(tableId).orElse(null);
            if (table != null) {
                table.setStatus("IN_USE");
                table.setCurrentSessionId(savedSession.getId()); // 设置当前会话ID
                billiardsTableService.save(table);
            }
            
            // 返回会话ID
            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", savedSession.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("开台失败，请稍后重试");
        }
    }
    
    // 获取会话详情
    @GetMapping("/sessions/{id}")
    public ResponseEntity<?> getSessionById(@PathVariable Long id) {
        Session session = sessionService.findById(id);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 获取对应的球桌信息，添加价格信息到会话对象
        Map<String, Object> sessionWithPrice = new HashMap<>();
        sessionWithPrice.put("id", session.getId());
        sessionWithPrice.put("tableId", session.getTableId());
        sessionWithPrice.put("billiardsTableId", session.getBilliardsTableId());
        sessionWithPrice.put("account", session.getAccount());
        sessionWithPrice.put("startDateTime", session.getStartDateTime());
        sessionWithPrice.put("endDateTime", session.getEndDateTime());
        sessionWithPrice.put("status", session.getStatus());
        
        // 获取球桌价格信息
        BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
        if (table != null) {
            sessionWithPrice.put("pricePerHour", table.getPricePerHour());
            sessionWithPrice.put("pricePerMinute", table.getPricePerMinute());
        }
        
        // 获取对应的消费记录（包含金额）
        List<Consumption> consumptions = consumptionService.findBySessionId(session.getId());
        if (consumptions != null && !consumptions.isEmpty()) {
            Consumption consumption = consumptions.get(0);
            sessionWithPrice.put("amount", consumption.getAmount());
            sessionWithPrice.put("minutes", consumption.getMinutes());
        }
        
        return ResponseEntity.ok(sessionWithPrice);
    }
    
    // 结束会话（结算）
    @PutMapping("/sessions/{id}/end")
    public ResponseEntity<?> endSession(@PathVariable Long id) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            Session session = sessionService.findById(id);
            if (session == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 检查是否为当前用户的会话
            if (!session.getAccount().equals(username)) {
                return ResponseEntity.status(403).body("无权操作该会话");
            }
            
            // 设置结束时间
            session.setEndDateTime(new Date());
            
            // 保存会话
            Session updatedSession = sessionService.save(session);
            
            // 更新球桌状态为空闲，并清除当前会话ID和当前预约ID
            BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
            if (table != null) {
                table.setStatus("AVAILABLE");
                table.setCurrentSessionId(null); // 清除当前会话ID
                table.setCurrentReservationId(null); // 清除当前预约ID，确保球桌完全释放
                billiardsTableService.save(table);
            }
            
            return ResponseEntity.ok(updatedSession);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("结算失败，请稍后重试");
        }
    }

    // 结算预览
    @GetMapping("/sessions/{id}/settlement-preview")
    public ResponseEntity<?> getSettlementPreview(@PathVariable Long id) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }

            Session session = sessionService.findById(id);
            if (session == null) {
                return ResponseEntity.notFound().build();
            }

            if (!session.getAccount().equals(username)) {
                return ResponseEntity.status(403).body("无权操作该会话");
            }

            // 假设现在结束
            Date endTime = new Date();
            // 如果会话已经有结束时间，使用已有的结束时间
            if (session.getEndDateTime() != null) {
                endTime = session.getEndDateTime();
            }

            BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
            if (table == null) {
                return ResponseEntity.notFound().build();
            }

            long startTime = session.getStartDateTime().getTime();
            double rawMinutes = (endTime.getTime() - startTime) / 60000.0;
            // 按10分钟单位折算，不足10分钟按10分钟计算
            int minutes = (int) Math.ceil(rawMinutes / 10.0) * 10;
            minutes = Math.max(10, minutes); // 至少按10分钟计算

            double pricePerHour = 30.0;
            if (table.getPricePerHour() != null) {
                pricePerHour = table.getPricePerHour();
            } else if (table.getPricePerMinute() != null) {
                pricePerHour = table.getPricePerMinute() * 60;
            }

            double actualPlayCost = (minutes / 60.0) * pricePerHour;
            actualPlayCost = Math.round(actualPlayCost * 100.0) / 100.0;

            User user = userService.findByAccount(session.getAccount());
            
            String openType = session.getOpenType() != null ? session.getOpenType() : "reservation";
            double depositAmount = 0.0;
            
            if ("reservation".equals(openType)) {
                Long reservationId = session.getReservationId();
                if (reservationId != null) {
                     Reservation r = reservationService.findById(reservationId);
                     if (r != null) depositAmount = r.getDepositAmount() != null ? r.getDepositAmount() : 0.0;
                } else {
                    List<Reservation> rs = reservationService.findByTableIdAndAccountAndStatus(session.getTableId(), session.getAccount(), "USED");
                    if (!rs.isEmpty()) {
                        depositAmount = rs.get(0).getDepositAmount() != null ? rs.get(0).getDepositAmount() : 0.0;
                    }
                }
            }

            double finalPayAmount = actualPlayCost - depositAmount;
            finalPayAmount = Math.round(finalPayAmount * 100.0) / 100.0;
            
            // 如果finalPayAmount < 0，说明保证金多了，不需要支付（会退款）
            // 但这里主要检查余额是否足够支付正向差额
            
            double currentBalance = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
            boolean insufficientBalance = false;
            double shortage = 0.0;
            
            if (finalPayAmount > 0) {
                insufficientBalance = currentBalance < finalPayAmount;
                if (insufficientBalance) {
                    shortage = finalPayAmount - currentBalance;
                    shortage = Math.round(shortage * 100.0) / 100.0;
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("durationMinutes", minutes);
            response.put("totalCost", actualPlayCost);
            response.put("depositAmount", depositAmount);
            response.put("finalPayAmount", finalPayAmount);
            response.put("userBalance", currentBalance);
            response.put("insufficientBalance", insufficientBalance);
            response.put("shortage", shortage);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取结算预览失败");
        }
    }

    // 会话结算（创建消费记录）
    @PostMapping("/sessions/{id}/settle")
    public ResponseEntity<?> settleSession(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> request) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取会话信息
            Session session = sessionService.findById(id);
            if (session == null) {
                return ResponseEntity.status(404).body("会话不存在");
            }
            
            // 检查是否为当前用户的会话
            if (!session.getAccount().equals(username)) {
                System.err.println("权限错误 - 会话账户：" + session.getAccount() + ", 当前用户：" + username);
                return ResponseEntity.status(403).body("无权操作该会话");
            }
            
            // 检查会话是否已经结束
            if (session.getEndDateTime() != null) {
                System.err.println("会话已结束 - Session ID: " + id + ", 结束时间: " + session.getEndDateTime());
                return ResponseEntity.status(400).body("会话已结束，无法重复结算");
            }
            
            // 使用BillingService进行结算
            // 设置结束时间为当前时间
            Date endTime = new Date();
            System.out.println("开始结算 - 结束时间: " + endTime);
            
            // 不允许负余额（除非强制）
            Map<String, Object> response = billingService.settleSession(session, endTime, false);
            
            System.out.println("结算成功 - Session ID: " + id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 添加详细的错误信息以便调试
            String errorMessage = "结算失败: " + e.getMessage();
            System.err.println("会话结算错误 - Session ID: " + id + ", Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(errorMessage);
        }
    }
    
    // 获取用户预约记录
    @GetMapping("/user/reservations")
    public ResponseEntity<?> getUserReservations() {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取用户预约记录
            List<Reservation> reservations = reservationService.findByAccount(username);
            
            // 格式化预约记录，添加详细信息
            SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm");
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
            List<Map<String, Object>> formattedReservations = new ArrayList<>();
            
            for (Reservation reservation : reservations) {
                Map<String, Object> formatted = new HashMap<>();
                // 复制所有原有字段
                formatted.put("id", reservation.getId());
                formatted.put("tableId", reservation.getTableId());
                formatted.put("billiardsTableId", reservation.getBilliardsTableId());
                formatted.put("account", reservation.getAccount());
                formatted.put("totalAmount", reservation.getTotalAmount());
                formatted.put("depositAmount", reservation.getDepositAmount());
                formatted.put("depositStatus", reservation.getDepositStatus());
                formatted.put("status", reservation.getStatus());
                
                // 添加原始日期时间字段，用于前端日期比较
                formatted.put("startDateTime", reservation.getStartDateTime());
                formatted.put("endDateTime", reservation.getEndDateTime());
                
                // 添加格式化的日期时间字段，用于前端显示
                if (reservation.getStartDateTime() != null) {
                    formatted.put("startDateTimeStr", dateTimeFormat.format(reservation.getStartDateTime()));
                    formatted.put("startDate", dateFormat.format(reservation.getStartDateTime()));
                    formatted.put("startTime", timeFormat.format(reservation.getStartDateTime()));
                }
                if (reservation.getEndDateTime() != null) {
                    formatted.put("endDateTimeStr", dateTimeFormat.format(reservation.getEndDateTime()));
                    formatted.put("endDate", dateFormat.format(reservation.getEndDateTime()));
                    formatted.put("endTime", timeFormat.format(reservation.getEndDateTime()));
                }
                
                // 添加球桌信息
                BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
                if (table != null) {
                    formatted.put("tableName", table.getName());
                    formatted.put("tableType", table.getType());
                    formatted.put("tablePricePerHour", table.getPricePerHour());
                }
                
                // 添加状态文本
                String statusText = "";
                switch (reservation.getStatus()) {
                    case "PENDING":
                        statusText = "待核销";
                        break;
                    case "USED":
                        statusText = "已使用";
                        break;
                    case "CANCELED":
                        statusText = "已取消";
                        break;
                    case "EXPIRED":
                        statusText = "已过期";
                        break;
                    case "COMPLETED":
                        statusText = "已完成";
                        break;
                    default:
                        statusText = reservation.getStatus();
                }
                formatted.put("statusText", statusText);
                
                // 添加保证金状态文本
                String depositStatusText = "";
                switch (reservation.getDepositStatus()) {
                    case "PAID":
                        depositStatusText = "已支付";
                        break;
                    case "REFUNDED":
                        depositStatusText = "已退还";
                        break;
                    case "FORFEITED":
                        depositStatusText = "已没收";
                        break;
                    case "USED":
                        depositStatusText = "已使用";
                        break;
                    default:
                        depositStatusText = reservation.getDepositStatus();
                }
                formatted.put("depositStatusText", depositStatusText);
                
                formattedReservations.add(formatted);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", formattedReservations);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取预约记录失败");
        }
    }
    
    // 取消预约
    @PostMapping("/user/reservations/{id}/cancel")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取预约记录
            Reservation reservation = reservationService.findById(id);
            if (reservation == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 检查是否为当前用户的预约
            if (!reservation.getAccount().equals(username)) {
                return ResponseEntity.status(403).body("无权操作该预约");
            }
            
            // 检查预约状态
            if (!"PENDING".equals(reservation.getStatus())) {
                return createResponse(false, "该预约已核销、已取消或已过期");
            }
            
            // 获取用户信息
            User user = userService.findByAccount(username);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 计算当前时间与预约开始时间的差值（毫秒）
            Date now = new Date();
            Date startDateTime = reservation.getStartDateTime();
            long diffInMillis = startDateTime.getTime() - now.getTime();
            long diffInMinutes = diffInMillis / (60 * 1000);
            
            // 计算应退还的保证金
            double depositAmount = reservation.getDepositAmount() != null ? reservation.getDepositAmount() : 0.0;
            double refundAmount = 0.0;
            
            // 根据距离开台时间执行不同的退款政策
            if (diffInMinutes >= 120) {
                // 开台前2小时以上，全退保证金
                refundAmount = depositAmount;
            } else if (diffInMinutes >= 30) {
                // 30分钟-2小时，扣50%，退50%
                refundAmount = depositAmount * 0.5;
            } else {
                // 30分钟内，扣20分钟游玩费，剩余退还
                // 获取球桌信息，计算20分钟游玩费
                BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
                double pricePerMinute = 0.5; // 默认每分钟0.5元
                if (table != null) {
                    if (table.getPricePerMinute() != null && table.getPricePerMinute() > 0) {
                        pricePerMinute = table.getPricePerMinute();
                    } else if (table.getPricePerHour() != null) {
                        pricePerMinute = table.getPricePerHour() / 60.0;
                    }
                }
                double penaltyAmount = pricePerMinute * 20;
                refundAmount = Math.max(0, depositAmount - penaltyAmount);
            }
            
            // 计算新余额
            double newBalance = user.getWalletBalance() + refundAmount;
            // 更新用户余额
            user.setWalletBalance(newBalance);
            userService.save(user);
            
            // 创建保证金退还消费记录
            Consumption refundConsumption = new Consumption();
            refundConsumption.setAccount(username);
            refundConsumption.setTableId(reservation.getTableId());
            refundConsumption.setBilliardsTableId(reservation.getTableId());
            refundConsumption.setStartDateTime(new Date());
            refundConsumption.setEndDateTime(new Date());
            refundConsumption.setAmount(java.math.BigDecimal.valueOf(-refundAmount)); // 退还为负数
            refundConsumption.setStatus("PAID");
            refundConsumption.setBalanceAfter(newBalance);
            refundConsumption.setConsumptionType("deposit_refund"); // 标识为保证金退款
            // 保存保证金退还消费记录
            consumptionService.save(refundConsumption);
            
            // 更新预约状态
            reservation.setStatus("CANCELED");
            reservation.setDepositStatus("REFUNDED");
            reservationService.save(reservation);
            
            // 更新球桌状态为可用
            BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
            if (table != null) {
                table.setStatus("AVAILABLE");
                table.setCurrentReservationId(null);
                billiardsTableService.save(table);
            }
            
            return ResponseEntity.ok("预约已取消，已退还保证金：￥" + String.format("%.2f", refundAmount));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("取消预约失败");
        }
    }
    
    // 核销预约
    @PostMapping("/user/reservations/{id}/verify")
    public ResponseEntity<?> verifyReservation(@PathVariable Long id) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取预约记录
            Reservation reservation = reservationService.findById(id);
            if (reservation == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 检查是否为当前用户的预约
            if (!reservation.getAccount().equals(username)) {
                return ResponseEntity.status(403).body("无权操作该预约");
            }
            
            // 检查预约状态是否为待核销
            if (!"PENDING".equals(reservation.getStatus())) {
                return createResponse(false, "该预约已核销或已取消");
            }
            
            // 获取球桌信息
            BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
            if (table == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 检查球桌状态是否可用
            if (!"AVAILABLE".equals(table.getStatus()) && !"RESERVED".equals(table.getStatus())) {
                return createResponse(false, "该球桌当前不可用");
            }
            
            // 核销预约，创建会话
            Session session = new Session();
            session.setTableId(reservation.getTableId());
            session.setBilliardsTableId(reservation.getTableId());
            session.setAccount(username);
            session.setStartDateTime(new Date());
            Session savedSession = sessionService.save(session);
            
            // 更新球桌状态
            table.setStatus("IN_USE");
            table.setCurrentSessionId(savedSession.getId());
            billiardsTableService.save(table);
            
            // 更新预约状态
            reservation.setStatus("USED");
            reservation.setDepositStatus("USED");
            reservationService.save(reservation);
            
            // 返回会话ID，跳转到计时页面
            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", savedSession.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("核销失败");
        }
    }
    
    // 获取指定球桌指定日期的预约情况（公共访问）
    @GetMapping("/reservations")
    public ResponseEntity<?> getReservationsByTableAndDate(
            @RequestParam(required = false) Long tableId,
            @RequestParam(required = false) String date) {
        try {
            List<Reservation> reservations;
            if (tableId != null && date != null) {
                // 根据球桌ID和日期查询预约
                reservations = reservationService.findByTableIdAndDate(tableId, date);
            } else {
                // 查询所有预约
                reservations = reservationService.findAll();
            }
            
            // 格式化预约时间，添加startHM和endHM字段
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm");
            List<Map<String, Object>> formattedReservations = new ArrayList<>();
            
            for (Reservation reservation : reservations) {
                Map<String, Object> formatted = new HashMap<>();
                // 复制所有原有字段
                formatted.put("id", reservation.getId());
                formatted.put("tableId", reservation.getTableId());
                formatted.put("billiardsTableId", reservation.getBilliardsTableId());
                formatted.put("account", reservation.getAccount());
                formatted.put("startDateTime", reservation.getStartDateTime());
                formatted.put("endDateTime", reservation.getEndDateTime());
                formatted.put("totalAmount", reservation.getTotalAmount());
                formatted.put("depositAmount", reservation.getDepositAmount());
                formatted.put("depositStatus", reservation.getDepositStatus());
                formatted.put("status", reservation.getStatus());
                
                // 添加格式化的时间字段
                if (reservation.getStartDateTime() != null) {
                    formatted.put("startHM", timeFormat.format(reservation.getStartDateTime()));
                }
                if (reservation.getEndDateTime() != null) {
                    formatted.put("endHM", timeFormat.format(reservation.getEndDateTime()));
                }
                
                formattedReservations.add(formatted);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", formattedReservations);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取预约情况失败");
        }
    }
    
    // 获取单个预约详情（公共访问）
    @GetMapping("/reservations/{id}")
    public ResponseEntity<?> getReservationById(@PathVariable Long id) {
        Reservation reservation = reservationService.findById(id);
        if (reservation == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> response = new HashMap<>();
        response.put("data", reservation);
        return ResponseEntity.ok(response);
    }
    
    // 创建预约（公共访问）
    @PostMapping("/reservations")
    @Transactional
    public ResponseEntity<?> createReservation(@RequestBody Reservation reservation) {
        try {
            // 获取用户信息
            User user = userService.findByAccount(reservation.getAccount());
            if (user == null) {
                return ResponseEntity.status(404).body("用户不存在");
            }
            
            // 检查预约可用性
            boolean isAvailable = checkReservationAvailability(reservation.getTableId(), reservation.getStartDateTime(), reservation.getEndDateTime());
            if (!isAvailable) {
                return createResponse(false, "该时间段已被预约");
            }
            
            // 检查球桌状态是否为故障
            BilliardsTable table = billiardsTableService.findById(reservation.getTableId()).orElse(null);
            if (table != null && "FAULT".equals(table.getStatus())) {
                return createResponse(false, "该球桌当前处于故障状态，无法预约");
            }
            
            // 计算预约时长（分钟）
            long durationMinutes = (reservation.getEndDateTime().getTime() - reservation.getStartDateTime().getTime()) / (60 * 1000);
            if (durationMinutes <= 0) {
                return createResponse(false, "预约时长必须大于0");
            }
            
            // 获取球台信息，使用球台实际单价
            double pricePerHour = 0.0;
            if (table != null && table.getPricePerHour() != null) {
                pricePerHour = table.getPricePerHour();
            } else {
                pricePerHour = 30.0; // 默认30元/小时
            }
            
            // 计算总费用（预约时长费用，实际结算时按实际时长计算）
            double totalAmount = (durationMinutes / 60.0) * pricePerHour;
            
            // 计算保证金：预约时长×单价×5%
            double depositAmount = (durationMinutes / 60.0) * pricePerHour * 0.05;
            depositAmount = Math.round(depositAmount * 100.0) / 100.0; // 保留两位小数
            
            // 检查用户钱包余额是否足够支付保证金
            if (user.getWalletBalance() < depositAmount) {
                return createResponse(false, "钱包余额不足支付保证金");
            }
            
            // 从用户钱包中扣除保证金
            double newBalance = user.getWalletBalance() - depositAmount;
            user.setWalletBalance(newBalance);
            userService.save(user);
            
            // 创建保证金消费记录
            Consumption depositConsumption = new Consumption();
            depositConsumption.setAccount(reservation.getAccount());
            depositConsumption.setTableId(reservation.getTableId());
            depositConsumption.setBilliardsTableId(reservation.getTableId());
            depositConsumption.setStartDateTime(reservation.getStartDateTime());
            depositConsumption.setEndDateTime(reservation.getEndDateTime());
            depositConsumption.setAmount(java.math.BigDecimal.valueOf(depositAmount));
            depositConsumption.setStatus("PAID");
            depositConsumption.setBalanceAfter(newBalance);
            depositConsumption.setConsumptionType("deposit"); // 标识为预约保证金
            // 保存保证金消费记录
            consumptionService.save(depositConsumption);
            
            // 设置预约的费用和保证金信息
            reservation.setTotalAmount(totalAmount);
            reservation.setDepositAmount(depositAmount);
            reservation.setDepositStatus("PAID"); // 保证金已支付
            reservation.setStatus("PENDING"); // 预约状态为待核销
            
            // 同时设置两个球桌ID字段，避免数据库约束违反
            if (reservation.getTableId() != null && reservation.getBilliardsTableId() == null) {
                reservation.setBilliardsTableId(reservation.getTableId());
            }
            
            // 保存预约
            Reservation savedReservation = reservationService.save(reservation);
            
            // 注意：不直接修改球桌状态为RESERVED，因为预约可能是未来的
            // 球桌状态的维护（RESERVED/AVAILABLE）由定时任务或查询时的动态逻辑处理
            // 只有当预约时间已经开始时，才可能需要更新状态，但这也应该由统一的状态管理逻辑处理
            
            Map<String, Object> response = new HashMap<>();
            response.put("reservationId", savedReservation.getId());
            response.put("depositAmount", depositAmount);
            response.put("totalAmount", totalAmount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("创建预约失败");
        }
    }
    
    // 检查预约可用性的内部方法
    private boolean checkReservationAvailability(Long tableId, Date startDateTime, Date endDateTime) {
        // 检查该时段是否已被预约
        List<Reservation> existingReservations = reservationService.findByTableId(tableId);
        
        for (Reservation reservation : existingReservations) {
            // 只检查有效的预约状态
            if (reservation.getStatus().equals("PENDING") || reservation.getStatus().equals("USED")) {
                Date resStart = reservation.getStartDateTime();
                Date resEnd = reservation.getEndDateTime();
                
                // 检查时间冲突：更严格的冲突检测
                // 新预约的开始时间在现有预约的时间段内
                boolean startInExisting = (startDateTime.compareTo(resStart) >= 0 && startDateTime.compareTo(resEnd) < 0);
                // 新预约的结束时间在现有预约的时间段内
                boolean endInExisting = (endDateTime.compareTo(resStart) > 0 && endDateTime.compareTo(resEnd) <= 0);
                // 新预约完全包含现有预约
                boolean containsExisting = (startDateTime.compareTo(resStart) <= 0 && endDateTime.compareTo(resEnd) >= 0);
                
                if (startInExisting || endInExisting || containsExisting) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // 检查预约可用性
    @PostMapping("/reservations/check-availability")
    public ResponseEntity<?> checkAvailability(@RequestBody Map<String, Object> request) {
        try {
            Long tableId = Long.parseLong(request.get("tableId").toString());
            String startDateTimeStr = (String) request.get("startDateTime");
            String endDateTimeStr = (String) request.get("endDateTime");
            
            Date startDateTime;
            Date endDateTime;
            
            try {
                // 尝试解析时间戳
                startDateTime = new Date(Long.parseLong(startDateTimeStr));
                endDateTime = new Date(Long.parseLong(endDateTimeStr));
            } catch (NumberFormatException e) {
                // 如果不是时间戳，尝试解析ISO格式
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                startDateTime = sdf.parse(startDateTimeStr);
                endDateTime = sdf.parse(endDateTimeStr);
            }
            
            // 调用已有的检查方法
            boolean isAvailable = checkReservationAvailability(tableId, startDateTime, endDateTime);
            
            Map<String, Boolean> response = new HashMap<>();
            response.put("available", isAvailable);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("可用性检查失败");
        }
    }
    


    // 获取用户的进行中会话
    @GetMapping("/user/sessions")
    public ResponseEntity<?> getUserSessions() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            List<Session> ongoingSessions = sessionService.findByAccount(username).stream()
                .filter(session -> session.getEndDateTime() == null)
                .collect(java.util.stream.Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", ongoingSessions);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取会话记录失败");
        }
    }
    
    // 自动结算用户所有进行中的会话
    @PostMapping("/user/sessions/auto-settle")
    public ResponseEntity<?> autoSettleUserSessions() {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取用户的所有进行中会话
            List<Session> sessions = sessionService.findAll();
            List<Session> ongoingSessions = sessions.stream()
                .filter(session -> session.getAccount().equals(username) && session.getEndDateTime() == null)
                .collect(java.util.stream.Collectors.toList());
            
            if (ongoingSessions.isEmpty()) {
                return createResponse(true, "没有需要结算的会话");
            }
            
            // 结算所有进行中的会话
            int settledCount = 0;
            List<String> settlementResults = new ArrayList<>();
            boolean hasNegativeBalance = false;
            double totalConsumptionAmount = 0.0;
            
            for (Session session : ongoingSessions) {
                try {
                    // 使用BillingService进行结算，允许负余额（强制结算）
                    Date endTime = new Date();
                    Map<String, Object> settlementResult = billingService.settleSession(session, endTime, true);
                    settledCount++;
                    
                    // 获取结算金额信息
                    double finalPayAmount = (Double) settlementResult.get("finalPayAmount");
                    double remainingBalance = (Double) settlementResult.get("remainingBalance");
                    
                    // 检查余额是否为负
                    if (remainingBalance < 0) {
                        hasNegativeBalance = true;
                    }
                    
                    // 累加总消费金额
                    if (finalPayAmount > 0) {
                        totalConsumptionAmount += finalPayAmount;
                    }
                    
                    // 更新球桌状态为空闲
                    BilliardsTable table = billiardsTableService.findById(session.getTableId()).orElse(null);
                    if (table != null) {
                        table.setStatus("AVAILABLE");
                        table.setCurrentSessionId(null);
                        billiardsTableService.save(table);
                    }
                    
                    // 给用户发送退出登录自动结算通知
                    notificationService.createNotification(
                        username,
                        "退出登录自动结算",
                        String.format("您在退出登录时，球桌 %d 已自动结算。消费金额：¥%.2f，结算后余额：¥%.2f", 
                            session.getTableId(), finalPayAmount, remainingBalance),
                        "LOGOUT_SETTLE"
                    );
                    
                    // 构建详细的结算信息，包含金额
                    String detail = String.format("球桌 %d 已自动结算，消费金额：¥%.2f，结算后余额：¥%.2f", 
                        session.getTableId(), finalPayAmount, remainingBalance);
                    settlementResults.add(detail);
                } catch (Exception e) {
                    settlementResults.add(String.format("球桌 %d 结算失败: %s", session.getTableId(), e.getMessage()));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "已自动结算 " + settledCount + " 个会话");
            response.put("settledCount", settledCount);
            response.put("details", settlementResults);
            response.put("hasNegativeBalance", hasNegativeBalance);
            response.put("totalConsumptionAmount", totalConsumptionAmount);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("自动结算失败: " + e.getMessage());
        }
    }
    
    // 获取用户的消息通知
    @GetMapping("/user/notifications")
    public ResponseEntity<?> getUserNotifications() {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取用户的所有通知
            List<Notification> notifications = notificationService.getNotificationsByAccount(username);
            
            // 格式化通知数据
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm");
            List<Map<String, Object>> formattedNotifications = new ArrayList<>();
            
            for (Notification notification : notifications) {
                Map<String, Object> formatted = new HashMap<>();
                formatted.put("id", notification.getId());
                formatted.put("title", notification.getTitle());
                formatted.put("content", notification.getContent());
                formatted.put("type", notification.getType());
                formatted.put("isRead", notification.getIsRead());
                formatted.put("createdAt", notification.getCreatedAt());
                formatted.put("createdAtStr", dateFormat.format(notification.getCreatedAt()));
                formatted.put("readAt", notification.getReadAt());
                
                formattedNotifications.add(formatted);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", formattedNotifications);
            response.put("unreadCount", notificationService.getUnreadCount(username));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取通知失败");
        }
    }
    
    // 标记通知为已读
    @PutMapping("/user/notifications/{id}/read")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long id) {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            notificationService.markAsRead(id);
            return createResponse(true, "标记为已读");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("标记失败");
        }
    }
    
    // 标记所有通知为已读
    @PutMapping("/user/notifications/read-all")
    public ResponseEntity<?> markAllNotificationsAsRead() {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            notificationService.markAllAsRead(username);
            return createResponse(true, "全部标记为已读");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("标记失败");
        }
    }
    
    // 获取用户的消费记录和充值记录
    @GetMapping("/user/transactions")
    public ResponseEntity<?> getUserTransactions() {
        try {
            // 从token中获取当前登录用户的账号
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username.equals("anonymousUser")) {
                return ResponseEntity.status(401).body("请先登录");
            }
            
            // 获取用户的消费记录，并过滤掉被用户标记为删除的记录
            List<Consumption> consumptions = consumptionService.findByAccount(username);
            // 过滤掉用户已删除的记录
            List<Consumption> filteredConsumptions = consumptions.stream()
                .filter(consumption -> consumption.getUserDeleted() == null || !consumption.getUserDeleted())
                .collect(java.util.stream.Collectors.toList());
            
            // 获取用户的充值记录
            List<Recharge> recharges = rechargeService.findByAccount(username);
            
            // 合并消费记录和充值记录
            List<Map<String, Object>> mergedRecords = new ArrayList<>();
            
            // 添加消费记录
            for (Consumption consumption : filteredConsumptions) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", consumption.getId());
                record.put("type", "consumption");
                record.put("amount", consumption.getAmount().doubleValue()); // 直接使用原始金额，由前端判断类型
                record.put("balanceAfter", consumption.getBalanceAfter());
                record.put("createdAt", consumption.getStartDateTime());
                record.put("startDateTime", consumption.getStartDateTime());
                record.put("endDateTime", consumption.getEndDateTime());
                record.put("tableId", consumption.getTableId());
                record.put("minutes", consumption.getMinutes());
                // 添加消费类型字段，用于前端显示预约保证金标识
                record.put("consumptionType", consumption.getConsumptionType());
                mergedRecords.add(record);
            }
            
            // 添加充值记录
            for (Recharge recharge : recharges) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", recharge.getId());
                record.put("type", "recharge");
                record.put("amount", recharge.getAmount()); // 充值为正数
                record.put("balanceAfter", recharge.getBalanceAfter());
                record.put("createdAt", recharge.getCreatedAt());
                record.put("paymentMethod", recharge.getPaymentMethod()); // 添加支付方式字段
                mergedRecords.add(record);
            }
            
            // 按照时间倒序排序
            mergedRecords.sort((a, b) -> {
                Date dateA = (Date) a.get("createdAt");
                Date dateB = (Date) b.get("createdAt");
                return dateB.compareTo(dateA); // 倒序
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("data", mergedRecords);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("获取消费记录失败");
        }
    }
    
    


}