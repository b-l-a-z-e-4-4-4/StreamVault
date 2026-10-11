
package com.example.demo;

import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AdminSessionService {

    public boolean isAdmin(HttpSession session) {
        if (session == null) {
            return false;
        }

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                    .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority()))
                && Boolean.TRUE.equals(
                    session.getAttribute("STREAMVAULT_ADMIN"));
    }
}
