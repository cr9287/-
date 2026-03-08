package com.unmanned.billiards.security;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, 
                        AuthenticationException authException) throws IOException {
        // 设置为 JSON 响应
        response.setContentType("application/json;charset=UTF-8");
        // 设置 401 状态码
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        // 不设置 WWW-Authenticate 响应头，避免浏览器弹出登录框
        // response.setHeader("WWW-Authenticate", "Basic realm=\"Realm\""); // 不要添加这行
        // 返回 JSON 格式的错误信息
        response.getWriter().write("{\"success\":false,\"message\":\"未授权访问，请先登录\"}");
    }
}