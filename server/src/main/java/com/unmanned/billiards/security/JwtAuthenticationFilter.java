package com.unmanned.billiards.security;

import com.unmanned.billiards.utils.JwtUtils;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureException;
import io.jsonwebtoken.UnsupportedJwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null) {
                try {
                    // 先从token中获取用户名
                    String username = jwtUtils.getUsernameFromToken(jwt);
                    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        // 加载用户详情
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        // 验证token
                        if (userDetails != null && jwtUtils.validateToken(jwt, userDetails)) {
                            // 设置认证信息
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        }
                    }
                } catch (UsernameNotFoundException e) {
                    logger.warn("User not found: {}", e.getMessage());
                    // 用户不存在，继续执行但不设置认证
                } catch (ExpiredJwtException e) {
                    logger.warn("JWT token expired: {}", e.getMessage());
                    // Token过期，继续执行但不设置认证
                } catch (SignatureException | MalformedJwtException | UnsupportedJwtException e) {
                    logger.warn("Invalid JWT token: {}", e.getMessage());
                    // Token无效，继续执行但不设置认证
                } catch (Exception e) {
                    logger.error("Error processing JWT authentication: {}", e.getMessage());
                    // 其他异常，继续执行但不设置认证
                }
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e.getMessage());
            // 继续执行过滤器链
        }
        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}