/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80040 (8.0.40)
 Source Host           : localhost:3306
 Source Schema         : billiards_db

 Target Server Type    : MySQL
 Target Server Version : 80040 (8.0.40)
 File Encoding         : 65001

 Date: 08/03/2026 23:47:09
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `create_time` datetime(6) NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `update_time` datetime(6) NULL DEFAULT NULL,
  `is_super_admin` tinyint(1) NOT NULL DEFAULT 0,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'ADMIN',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`account` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES (1, 'admin', '$2a$10$lnzclSoWdPngAjL8QWupi.F2C7PY5cY649zHnztk2Gc01k.wz8MOm', NULL, NULL, '2026-02-01 15:50:05.468000', 1, 'ADMIN');
INSERT INTO `admin` VALUES (3, 'deleted_1772625597139_admin_3', '$2a$10$K.nteK/9dxY3SobeTk66seSBix56GdndyBVQmX6JgBGt2dOa43iEK', NULL, '已注销用户', NULL, 0, 'USER');
INSERT INTO `admin` VALUES (7, 'admin002', '$2a$10$ElKDGU/w0t/dEz3SV0TxoeAK2.glT8jS5tYUMqR/9tVQOz3Cfa5Da', NULL, '管理员2', NULL, 0, 'ADMIN');
INSERT INTO `admin` VALUES (8, 'admin001', '$2a$10$62B.W0TJtqYveT.DkiJHP.zIB4mULnNfkfl66eUsM2ieiMjYsLFle', NULL, '管理员1', NULL, 0, 'ADMIN');

-- ----------------------------
-- Table structure for billiards_table
-- ----------------------------
DROP TABLE IF EXISTS `billiards_table`;
CREATE TABLE `billiards_table`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `price_per_hour` decimal(19, 2) NULL DEFAULT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `current_reservation_id` bigint NULL DEFAULT NULL,
  `current_session_id` bigint NULL DEFAULT NULL,
  `create_time` datetime(6) NULL DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `price_per_minute` double NOT NULL,
  `table_number` int NOT NULL,
  `update_time` datetime(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of billiards_table
-- ----------------------------
INSERT INTO `billiards_table` VALUES (1, '球桌1', 'AVAILABLE', 60.00, 'HIGH', NULL, NULL, NULL, NULL, NULL, 1, 0, '2026-02-01 01:27:45.827000');
INSERT INTO `billiards_table` VALUES (2, '球桌2', 'AVAILABLE', 60.00, 'HIGH', NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-02-01 01:33:45.046000');
INSERT INTO `billiards_table` VALUES (3, '球桌3', 'AVAILABLE', 30.00, 'MIDDLE', NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-29 19:54:54.084000');
INSERT INTO `billiards_table` VALUES (4, '球桌4', 'AVAILABLE', 30.00, 'MIDDLE', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL);
INSERT INTO `billiards_table` VALUES (5, '球桌5', 'AVAILABLE', 15.00, 'LOW', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL);
INSERT INTO `billiards_table` VALUES (9, '球桌6', 'AVAILABLE', 15.00, 'LOW', NULL, NULL, NULL, NULL, NULL, 0.25, 9, NULL);

-- ----------------------------
-- Table structure for consumption
-- ----------------------------
DROP TABLE IF EXISTS `consumption`;
CREATE TABLE `consumption`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `billiards_table_id` bigint NOT NULL,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `minutes` int NULL DEFAULT NULL,
  `amount` decimal(38, 2) NULL DEFAULT NULL,
  `start_date_time` datetime NULL DEFAULT NULL,
  `end_date_time` datetime NULL DEFAULT NULL,
  `table_id` bigint NOT NULL,
  `session_id` bigint NULL DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `user_deleted` bit(1) NULL DEFAULT NULL,
  `balance_after` double NULL DEFAULT NULL,
  `consumption_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 95 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of consumption
-- ----------------------------
INSERT INTO `consumption` VALUES (76, 2, 'user001', 0, 0.00, '2026-03-01 15:00:00', '2026-03-01 16:00:00', 2, NULL, 'PAID', NULL, 859, 'deposit');
INSERT INTO `consumption` VALUES (77, 2, 'user004', 20, 20.00, '2026-03-02 02:49:21', '2026-03-02 03:06:36', 2, 56, 'PAID', NULL, -15.9, 'normal');
INSERT INTO `consumption` VALUES (78, 3, 'user001', 10, 5.00, '2026-03-02 17:13:48', '2026-03-02 17:13:59', 3, 60, 'PAID', NULL, 1855, 'normal');
INSERT INTO `consumption` VALUES (79, 3, 'user001', 10, 5.00, '2026-03-02 17:57:53', '2026-03-02 17:58:05', 3, 62, 'PAID', NULL, 1855, 'normal');
INSERT INTO `consumption` VALUES (80, 3, 'user001', 10, 5.00, '2026-03-02 18:06:10', '2026-03-02 18:06:51', 3, 63, 'PAID', NULL, 1850, 'normal');
INSERT INTO `consumption` VALUES (81, 3, 'user001', 10, 5.00, '2026-03-02 18:13:19', '2026-03-02 18:13:28', 3, 64, 'PAID', NULL, 1845, 'normal');
INSERT INTO `consumption` VALUES (82, 3, 'user001', 10, 5.00, '2026-03-02 18:19:08', '2026-03-02 18:19:15', 3, 65, 'PAID', NULL, 1840, 'normal');
INSERT INTO `consumption` VALUES (83, 3, 'user001', 10, 5.00, '2026-03-02 18:24:30', '2026-03-02 18:24:40', 3, 66, 'PAID', NULL, 1835, 'normal');
INSERT INTO `consumption` VALUES (84, 3, 'user004', 10, 5.00, '2026-03-02 19:33:03', '2026-03-02 19:33:11', 3, 68, 'PAID', NULL, 5, 'normal');
INSERT INTO `consumption` VALUES (85, 1, 'user004', NULL, 3.00, '2026-03-03 22:40:00', '2026-03-03 23:40:00', 1, NULL, 'PAID', NULL, 77, 'deposit');
INSERT INTO `consumption` VALUES (86, 1, 'user004', NULL, 3.00, '2026-03-04 03:10:00', '2026-03-04 04:10:00', 1, NULL, 'PAID', NULL, 74, 'deposit');
INSERT INTO `consumption` VALUES (87, 1, 'user001', 20, 20.00, '2026-03-04 02:52:08', '2026-03-04 03:10:41', 1, 84, 'PAID', NULL, 1830, 'normal');
INSERT INTO `consumption` VALUES (88, 1, 'user004', NULL, 1.50, '2026-03-04 13:30:00', '2026-03-04 14:00:00', 1, NULL, 'PAID', NULL, 91.5, 'deposit');
INSERT INTO `consumption` VALUES (89, 1, 'user001', 30, 30.00, '2026-03-04 13:07:46', '2026-03-04 13:30:29', 1, 85, 'PAID', NULL, 1800, 'normal');
INSERT INTO `consumption` VALUES (90, 1, 'test001', NULL, 3.00, '2026-03-04 20:50:00', '2026-03-04 21:50:00', 1, NULL, 'PAID', NULL, 17, 'deposit');
INSERT INTO `consumption` VALUES (91, 1, 'user001', 10, 10.00, '2026-03-04 20:40:46', '2026-03-04 20:50:00', 1, 86, 'PAID', NULL, 1790, 'normal');
INSERT INTO `consumption` VALUES (92, 1, 'user001', 0, 3.00, '2026-03-08 21:30:00', '2026-03-08 22:20:00', 1, NULL, 'PAID', NULL, 1807.5, 'deposit');
INSERT INTO `consumption` VALUES (93, 3, 'user004', NULL, 1.25, '2026-03-08 21:40:00', '2026-03-08 22:30:00', 3, NULL, 'PAID', NULL, 98.75, 'deposit');
INSERT INTO `consumption` VALUES (94, 1, 'user004', 9, 9.00, '2026-03-08 21:21:18', '2026-03-08 21:30:21', 1, 87, 'PAID', NULL, 89.75, 'normal');

-- ----------------------------
-- Table structure for notification
-- ----------------------------
DROP TABLE IF EXISTS `notification`;
CREATE TABLE `notification`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `is_read` bit(1) NULL DEFAULT NULL,
  `message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `read_at` datetime(6) NULL DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 22 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of notification
-- ----------------------------
INSERT INTO `notification` VALUES (1, 'user004', '2026-02-23 17:33:26.531000', b'1', '您已超时，球桌已锁定，本次费用已结算）。', 'FORCE_STOP', NULL, NULL, NULL);
INSERT INTO `notification` VALUES (2, 'user001', '2026-02-23 17:33:26.541000', b'1', '球桌已就绪，可点击‘开台’开始使用。', 'READY', NULL, NULL, NULL);
INSERT INTO `notification` VALUES (3, 'user004', '2026-03-02 03:06:36.699000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 2 已自动结算。费用已从账户扣除。', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (4, 'user001', '2026-03-02 17:13:58.907000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。费用已从账户扣除。', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (5, 'user001', '2026-03-02 17:58:04.775000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥1855.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (6, 'user001', '2026-03-02 18:06:50.940000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥1850.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (7, 'user001', '2026-03-02 18:13:28.392000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥1845.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (8, 'user001', '2026-03-02 18:19:15.144000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥1840.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (9, 'user001', '2026-03-02 18:24:40.480000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥1835.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (10, 'user004', '2026-03-02 19:33:11.304000', b'0', NULL, 'LOGOUT_SETTLE', '您在退出登录时，球桌 3 已自动结算。消费金额：¥5.00，结算后余额：¥5.00', NULL, '退出登录自动结算');
INSERT INTO `notification` VALUES (11, 'user001', '2026-03-04 03:10:40.901000', b'0', NULL, 'AUTO_SETTLE', '您的球桌 1 因其他用户预约时间已到，已自动结算。费用已从账户扣除。', NULL, '球桌自动结算通知');
INSERT INTO `notification` VALUES (12, 'user004', '2026-03-04 03:10:40.910000', b'0', NULL, 'RESERVATION_READY', '您预约的球桌 1 已就绪，可开始使用。', NULL, '球桌可用通知');
INSERT INTO `notification` VALUES (13, 'user001', '2026-03-04 13:30:30.646000', b'0', NULL, 'AUTO_SETTLE', '您的球桌 1 因其他用户预约时间已到，已自动结算。费用已从账户扣除。', NULL, '球桌自动结算通知');
INSERT INTO `notification` VALUES (14, 'user004', '2026-03-04 13:30:30.667000', b'0', NULL, 'RESERVATION_READY', '您预约的球桌 1 已就绪，可开始使用。', NULL, '球桌可用通知');
INSERT INTO `notification` VALUES (15, 'user001', '2026-03-04 20:50:01.665000', b'0', NULL, 'AUTO_SETTLE', '您的球桌 1 因其他用户预约时间已到，已自动结算。费用已从账户扣除。', NULL, '球桌自动结算通知');
INSERT INTO `notification` VALUES (16, 'test001', '2026-03-04 20:50:02.079000', b'0', NULL, 'RESERVATION_READY', '您预约的球桌 1 已就绪，可开始使用。', NULL, '球桌可用通知');
INSERT INTO `notification` VALUES (17, 'test001', '2026-03-04 21:10:01.239000', b'0', NULL, 'RESERVATION_EXPIRED', '您预约的球桌 1 因超过 20 分钟未开台，已自动取消。保证金不予退还。', NULL, '预约超时通知');
INSERT INTO `notification` VALUES (18, 'user004', '2026-03-08 21:30:21.252000', b'0', NULL, 'AUTO_SETTLE', '您的球桌 1 因其他用户预约时间已到，已自动结算。费用已从账户扣除。', NULL, '球桌自动结算通知');
INSERT INTO `notification` VALUES (19, 'user001', '2026-03-08 21:30:21.263000', b'0', NULL, 'RESERVATION_READY', '您预约的球桌 1 已就绪，可开始使用。', NULL, '球桌可用通知');
INSERT INTO `notification` VALUES (20, 'user001', '2026-03-08 21:50:06.564000', b'0', NULL, 'RESERVATION_EXPIRED', '您预约的球桌 1 因超过 20 分钟未开台，已自动取消。保证金不予退还。', NULL, '预约超时通知');
INSERT INTO `notification` VALUES (21, 'user004', '2026-03-08 22:00:09.113000', b'0', NULL, 'RESERVATION_EXPIRED', '您预约的球桌 3 因超过 20 分钟未开台，已自动取消。保证金不予退还。', NULL, '预约超时通知');

-- ----------------------------
-- Table structure for recharge
-- ----------------------------
DROP TABLE IF EXISTS `recharge`;
CREATE TABLE `recharge`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `amount` decimal(19, 2) NULL DEFAULT NULL,
  `balance_after` double NULL DEFAULT NULL,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `payment_method` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `transaction_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `admin_account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 64 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of recharge
-- ----------------------------
INSERT INTO `recharge` VALUES (37, 'user001', 100.00, 100, '2026-01-29 10:30:00.000000', 'SUCCESS', NULL, NULL, NULL, NULL);
INSERT INTO `recharge` VALUES (38, 'user002', 50.00, 50, '2026-01-29 11:15:00.000000', 'SUCCESS', NULL, NULL, NULL, NULL);
INSERT INTO `recharge` VALUES (39, 'user003', 200.00, 200, '2026-01-29 14:20:00.000000', 'SUCCESS', NULL, NULL, NULL, NULL);
INSERT INTO `recharge` VALUES (40, 'user004', 30.00, 30, '2026-01-29 16:45:00.000000', 'SUCCESS', NULL, NULL, NULL, NULL);
INSERT INTO `recharge` VALUES (41, 'deleted_1772625659348_29', 150.00, 150, '2026-01-29 18:30:00.000000', 'SUCCESS', NULL, NULL, NULL, NULL);
INSERT INTO `recharge` VALUES (42, 'user004', 0.05, 4.1, '2026-03-02 01:58:03.449000', 'SUCCESS', 'WECHAT', 'RC1772387883447_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (43, 'user004', 25.90, 9.999999999999998, '2026-03-02 14:24:52.432000', 'SUCCESS', 'ALIPAY', 'RC1772432692432_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (44, 'user001', 1001.00, 1860, '2026-03-02 17:13:12.745000', 'SUCCESS', 'ALIPAY', 'RC1772442792744_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (45, 'user001', 5.00, 1860, '2026-03-02 17:31:50.488000', 'SUCCESS', 'ALIPAY', 'RC1772443910487_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (46, 'user004', 5.00, 10, '2026-03-02 20:02:56.158000', 'SUCCESS', 'WECHAT', 'RC1772452976158_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (47, 'user004', 10.00, 20, '2026-03-03 14:45:38.982000', 'SUCCESS', 'WECHAT', 'RC1772520338980_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (48, 'user004', 10.00, 30, '2026-03-03 17:32:01.013000', 'SUCCESS', 'WECHAT', 'RC1772530321013_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (49, 'user004', 20.00, 50, '2026-03-03 17:33:10.508000', 'SUCCESS', 'WECHAT', 'RC1772530390508_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (50, 'user004', 20.00, 70, '2026-03-03 17:33:23.075000', 'SUCCESS', 'WECHAT', 'RC1772530403075_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (51, 'user004', 10.00, 80, '2026-03-03 17:42:31.771000', 'SUCCESS', 'WECHAT', 'RC1772530951771_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (52, 'user001', 5.00, 1840, '2026-03-03 17:44:57.226000', 'SUCCESS', 'WECHAT', 'RC1772531097226_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (53, 'user001', 10.00, 1850, '2026-03-03 19:16:46.446000', 'SUCCESS', 'ADMIN', 'ADMIN_RC1772536606446_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (54, 'user004', 3.00, 77, '2026-03-04 02:09:49.270000', 'SUCCESS', 'WECHAT', 'RC1772561389270_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (55, 'user004', 3.00, 80, '2026-03-04 02:12:42.073000', 'SUCCESS', 'WECHAT', 'RC1772561562073_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (56, 'user004', 3.00, 83, '2026-03-04 02:13:37.280000', 'SUCCESS', 'WECHAT', 'RC1772561617280_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (57, 'user004', 10.00, 93, '2026-03-04 12:08:25.013000', 'SUCCESS', 'WECHAT', 'RC1772597305013_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (58, 'test001', 10.00, 10, '2026-03-04 19:35:42.825000', 'SUCCESS', 'ALIPAY', 'RC1772624142823_test001', NULL, NULL);
INSERT INTO `recharge` VALUES (59, 'test001', 10.00, 20, '2026-03-04 19:45:19.436000', 'SUCCESS', 'ALIPAY', 'RC1772624719436_test001', NULL, NULL);
INSERT INTO `recharge` VALUES (60, 'user001', 10.00, 1800, '2026-03-08 18:40:25.007000', 'SUCCESS', 'WECHAT', 'RC1772966425005_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (61, 'user001', 10.00, 1810, '2026-03-08 18:45:12.058000', 'SUCCESS', 'ALIPAY', 'RC1772966712058_user001', NULL, NULL);
INSERT INTO `recharge` VALUES (62, 'user004', 1.50, 93, '2026-03-08 21:21:51.701000', 'SUCCESS', 'WECHAT', 'RC1772976111701_user004', NULL, NULL);
INSERT INTO `recharge` VALUES (63, 'user004', 22.00, 100.75, '2026-03-08 21:25:44.747000', 'SUCCESS', 'WECHAT', 'RC1772976344747_user004', '', '1');

-- ----------------------------
-- Table structure for reservation
-- ----------------------------
DROP TABLE IF EXISTS `reservation`;
CREATE TABLE `reservation`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `billiards_table_id` bigint NOT NULL,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `start_date_time` datetime NOT NULL,
  `end_date_time` datetime NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `table_id` bigint NOT NULL,
  `deposit_amount` double NULL DEFAULT NULL,
  `deposit_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `total_amount` double NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 33 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of reservation
-- ----------------------------
INSERT INTO `reservation` VALUES (26, 2, 'user001', '2026-03-01 15:00:00', '2026-03-01 16:00:00', 'EXPIRED', 2, 3, 'FORFEITED', 60);
INSERT INTO `reservation` VALUES (27, 1, 'user004', '2026-03-03 22:40:00', '2026-03-03 23:40:00', 'EXPIRED', 1, 3, 'FORFEITED', 60);
INSERT INTO `reservation` VALUES (28, 1, 'user004', '2026-03-04 03:10:00', '2026-03-04 04:10:00', 'EXPIRED', 1, 3, 'FORFEITED', 60);
INSERT INTO `reservation` VALUES (29, 1, 'user004', '2026-03-04 13:30:00', '2026-03-04 14:00:00', 'EXPIRED', 1, 1.5, 'FORFEITED', 30);
INSERT INTO `reservation` VALUES (30, 1, 'test001', '2026-03-04 20:50:00', '2026-03-04 21:50:00', 'EXPIRED', 1, 3, 'FORFEITED', 60);
INSERT INTO `reservation` VALUES (31, 1, 'user001', '2026-03-08 21:30:00', '2026-03-08 22:20:00', 'EXPIRED', 1, 2.5, 'FORFEITED', 50);
INSERT INTO `reservation` VALUES (32, 3, 'user004', '2026-03-08 21:40:00', '2026-03-08 22:30:00', 'EXPIRED', 3, 1.25, 'FORFEITED', 25);

-- ----------------------------
-- Table structure for session
-- ----------------------------
DROP TABLE IF EXISTS `session`;
CREATE TABLE `session`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `billiards_table_id` bigint NOT NULL,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `start_date_time` datetime NOT NULL,
  `end_date_time` datetime NULL DEFAULT NULL,
  `table_id` bigint NOT NULL,
  `open_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `reservation_id` bigint NULL DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 88 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of session
-- ----------------------------
INSERT INTO `session` VALUES (86, 1, 'user001', '2026-03-04 20:40:46', '2026-03-04 20:50:00', 1, 'immediate', NULL, NULL);
INSERT INTO `session` VALUES (87, 1, 'user004', '2026-03-08 21:21:18', '2026-03-08 21:30:21', 1, 'immediate', NULL, NULL);

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `wallet_balance` decimal(38, 2) NOT NULL,
  `create_time` datetime(6) NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `update_time` datetime(6) NULL DEFAULT NULL,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `payment_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `account`(`account` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 38 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES (1, 'user001', '$2a$10$gyX20OmcWrA3Ps99m5Swq.otYSJxDvwGJXwWDIXUtlcil/YL4bjvO', 1810.00, NULL, '用户1', '12345678901', '2026-02-01 01:34:18.884000', '/uploads/e2601b95-4c0f-4f2a-946c-8847c0b43f48.png', 'e10adc3949ba59abbe56e057f20f883e');
INSERT INTO `user` VALUES (2, 'user002', '$2a$10$d8o7hRBRmutr/LBCxA6scu.pKlln38iJwvV.N7MmDmQMdtm5wLLKq', 902.25, NULL, NULL, NULL, '2026-01-31 18:24:20.459000', NULL, NULL);
INSERT INTO `user` VALUES (17, 'user004', '$2a$10$uuX3wdMzkigaaIjJeyebfurbSf6Kdw5tn3eDsg11ORc46UL1jt2Ci', 100.75, NULL, 'user004', '12345678904', NULL, NULL, 'e10adc3949ba59abbe56e057f20f883e');
INSERT INTO `user` VALUES (34, 'test001', '$2a$10$tfJw8.avu2eIdPCWn4vYAOOYzXYtFQXYGIxFoHRFT/XR4I9/E4Thm', 17.00, NULL, '测试用户1', '12345678911', NULL, NULL, 'e10adc3949ba59abbe56e057f20f883e');

SET FOREIGN_KEY_CHECKS = 1;
