package com.example.demo;

import jakarta.servlet.http.HttpSession;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/user-auth")
public class UserAuthController {

    private static final String USER_OTP_PREFIX = "streamvault-user:";

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^\\+?[0-9][0-9 ()-]{6,18}[0-9]$");

    private final OtpService otpService;
    private final EmailOtpService emailOtpService;
    private final UserRepository userRepository;
    private final String adminEmail;

    public UserAuthController(
            OtpService otpService,
            EmailOtpService emailOtpService,
            UserRepository userRepository,
            @Value("${app.admin.email}") String adminEmail) {
        this.otpService = otpService;
        this.emailOtpService = emailOtpService;
        this.userRepository = userRepository;
        this.adminEmail = adminEmail.trim().toLowerCase();
    }

    @PostMapping("/request-email-otp")
    public ResponseEntity<Map<String, String>> requestEmailOtp(
            @RequestBody Map<String, String> request) {

        String email = normalizeEmail(request.get("email"));
        String phone = normalizePhone(request.get("phoneNumber"));

        if (!validEmail(email)) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Enter a valid email address.")
            );
        }

        if (email.equals(adminEmail)) {
            return ResponseEntity.status(403).body(
                    Map.of(
                            "message",
                            "Use the separate administrator sign-in."
                    )
            );
        }

        if (!validPhone(phone)) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Enter a valid phone number including country code if needed."
                    )
            );
        }

        String otp = otpService.generateOtp(USER_OTP_PREFIX + email);

        try {
            emailOtpService.sendOtp(email, otp);
        } catch (Exception exception) {
            otpService.invalidateOtp(USER_OTP_PREFIX + email);

            System.err.println(
                    "USER OTP EMAIL ERROR: " + exception.getMessage()
            );

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "message",
                            "Unable to send OTP. Check email configuration."
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "If eligible, a sign-in code has been sent to your email."
                )
        );
    }

    @PostMapping("/verify-email-otp")
    public ResponseEntity<Map<String, String>> verifyEmailOtp(
        @RequestBody Map<String, String> request,
        HttpSession session,
        HttpServletRequest servletRequest) {
        String email = normalizeEmail(request.get("email"));
        String phone = normalizePhone(request.get("phoneNumber"));
        String code = request.get("otp");

        if (!validEmail(email)
                || !validPhone(phone)
                || code == null
                || !code.matches("\\d{6}")) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Enter a valid email, phone number, and six-digit code."
                    )
            );
        }

        if (email.equals(adminEmail)) {
            return ResponseEntity.status(403).body(
                    Map.of(
                            "message",
                            "Use the separate administrator sign-in."
                    )
            );
        }

        if (!otpService.verifyOtp(USER_OTP_PREFIX + email, code)) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "message",
                            "Invalid or expired verification code."
                    )
            );
        }

        UserAccount account =
                userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (account == null) {
            account = new UserAccount(email, phone);
        } else {
            // Email OTP is the authentication factor.
            // The phone number has not been SMS-verified.
            account.setPhoneNumber(phone);
            account.setPhoneVerified(false);
            account.setUpdatedAt(Instant.now());
        }

        account.setEmail(email);
        account = userRepository.save(account);

        // Prevent session fixation after sign-in.
        servletRequest.changeSessionId();

        // Remove administrator markers from this session.
        session.removeAttribute("STREAMVAULT_ADMIN");
        session.removeAttribute("STREAMVAULT_ADMIN_EMAIL");

        var authentication =
                new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(
                                new SimpleGrantedAuthority("ROLE_USER")
                        )
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        session.setAttribute(
                HttpSessionSecurityContextRepository
                        .SPRING_SECURITY_CONTEXT_KEY,
                context
        );

        session.setAttribute("STREAMVAULT_USER", true);
        session.setAttribute("STREAMVAULT_USER_ID", account.getId());
        session.setAttribute("STREAMVAULT_USER_EMAIL", account.getEmail());
        session.setAttribute(
                "STREAMVAULT_USER_PHONE",
                account.getPhoneNumber() == null
                        ? ""
                        : account.getPhoneNumber()
        );

        return ResponseEntity.ok(
                Map.of("message", "Sign-in successful.")
        );
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            HttpSession session) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        boolean hasUserRole =
                authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(
                        authority ->
                                "ROLE_USER".equals(authority.getAuthority())
                );

        boolean isUser =
                hasUserRole
                && Boolean.TRUE.equals(
                        session.getAttribute("STREAMVAULT_USER")
                );

        String email = isUser
                ? (String) session.getAttribute("STREAMVAULT_USER_EMAIL")
                : "";

        String phone = isUser
                ? (String) session.getAttribute("STREAMVAULT_USER_PHONE")
                : "";

        return ResponseEntity.ok(
                Map.of(
                        "isUser", isUser,
                        "email", email == null ? "" : email,
                        "phoneNumber", phone == null ? "" : phone
                )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpSession session) {

        session.invalidate();
        SecurityContextHolder.clearContext();

        return ResponseEntity.ok(
                Map.of("message", "Logged out.")
        );
    }

    private static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static String normalizePhone(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().replaceAll("[\\s()\\-]", "");
    }

    private static boolean validEmail(String email) {
        return EMAIL_PATTERN.matcher(email).matches();
    }

    private static boolean validPhone(String phone) {
        return PHONE_PATTERN.matcher(phone).matches();
    }
}