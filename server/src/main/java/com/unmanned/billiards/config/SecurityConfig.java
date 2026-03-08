package com.unmanned.billiards.config;

import com.unmanned.billiards.security.JwtAuthenticationEntryPoint;
import com.unmanned.billiards.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Autowired
    private JwtAuthenticationEntryPoint unauthorizedHandler;

    @Autowired
    @Lazy
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        // 使用BCryptPasswordEncoder，支持BCrypt加密密码
        // 同时配置默认密码编码器为NoOpPasswordEncoder用于匹配
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 限制允许的来源，避免使用通配符
        configuration.setAllowedOrigins(Arrays.asList("http://localhost", "http://127.0.0.1"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 禁用 CSRF，因为我们是无状态的 JWT 认证
            .csrf().disable()
            // 配置 CORS
            .cors().configurationSource(corsConfigurationSource()).and()
            // 配置异常处理
            .exceptionHandling()
                .authenticationEntryPoint(unauthorizedHandler)
                .and()
            // 禁用 Session，使用 JWT
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
            // 配置授权规则
            .authorizeRequests()
                // 允许公开访问的接口
                .antMatchers("/api/tables/**").permitAll()
                .antMatchers("/api/reservations/**").permitAll()
                .antMatchers("/api/user/login").permitAll()
                .antMatchers("/api/user/register").permitAll()
                .antMatchers("/api/user/reset-password").permitAll()
                .antMatchers("/api/admin/login").permitAll()
                // 管理员接口需要认证
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                // 其他用户接口需要认证
                .antMatchers("/api/user/**").authenticated()
                // 其他所有请求允许访问（用于静态资源等）
                .anyRequest().permitAll();

        // 禁用 HTTP Basic 认证，避免弹出登录框
        http.httpBasic().disable();
        
        // 添加 JWT 过滤器
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}