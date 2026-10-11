
package com.example.demo;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class OtpController {

    private final OtpService otpService;
    private final EmailOtpService emailOtpService;
    private final String adminEmail;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    public OtpController(
            OtpService otpService,
            EmailOtpService emailOtpService,
            @Value("${app.admin.email}") String adminEmail) {
        this.otpService = otpService;
        this.emailOtpService = emailOtpService;
        this.adminEmail = adminEmail.trim();
    }

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/request-email-otp")
    public ResponseEntity<Map<String, String>> requestEmailOtp(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");

        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Enter a valid email address."));
        }

        if (!email.trim().equalsIgnoreCase(adminEmail)) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "This account is not authorized."));
        }

        String otp = otpService.generateOtp(email.trim());

        try {
            emailOtpService.sendOtp(email.trim(), otp);
        } catch (Exception exception) {
            otpService.invalidateOtp(email.trim());
            return ResponseEntity.internalServerError().body(
                    Map.of("message",
                            "Unable to send OTP. Check email configuration."));
        }

        return ResponseEntity.ok(
                Map.of("message",
                        "If eligible, a verification code has been sent."));
    }

    @PostMapping("/verify-email-otp")
    public ResponseEntity<Map<String, String>> verifyEmailOtp(
            @RequestBody Map<String, String> request,
            HttpSession session) {

        String email = request.get("email");
        String code = request.get("otp");

        if (email == null || code == null
                || !EMAIL_PATTERN.matcher(email).matches()
                || !code.matches("\\d{6}")) {
            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Enter a valid email and six-digit code."));
        }

        if (!email.trim().equalsIgnoreCase(adminEmail)) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "This account is not authorized."));
        }

        if (!otpService.verifyOtp(email.trim(), code)) {
            return ResponseEntity.status(401).body(
                    Map.of("message",
                            "Invalid or expired verification code."));
        }

        var authentication = new UsernamePasswordAuthenticationToken(
                adminEmail,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        session.setAttribute(
                HttpSessionSecurityContextRepository
                        .SPRING_SECURITY_CONTEXT_KEY,
                context);

        session.setAttribute("STREAMVAULT_ADMIN", true);
        session.setAttribute("STREAMVAULT_ADMIN_EMAIL", adminEmail);

        return ResponseEntity.ok(
                Map.of("message", "Admin verification successful."));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpSession session) {
        session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out."));
    }
    @GetMapping("/status")
public ResponseEntity<Map<String, Object>> status(HttpSession session) {
    boolean isAdmin = Boolean.TRUE.equals(
            session.getAttribute("STREAMVAULT_ADMIN"));

    return ResponseEntity.ok(Map.of("isAdmin", isAdmin));
}
}
