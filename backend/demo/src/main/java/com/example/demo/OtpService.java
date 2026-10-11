
package com.example.demo;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class OtpService {

    private static final int OTP_EXPIRY_SECONDS = 300;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom secureRandom = new SecureRandom();

    private final ConcurrentMap<String, OtpRecord> otpStore =
            new ConcurrentHashMap<>();

    public String generateOtp(String identity) {
        String normalizedIdentity = normalize(identity);

        String code = String.format(
                "%06d", secureRandom.nextInt(1_000_000));

        otpStore.put(normalizedIdentity,
                new OtpRecord(code, Instant.now().plusSeconds(
                        OTP_EXPIRY_SECONDS)));

        return code;
    }

    public boolean verifyOtp(String identity, String submittedCode) {
        if (identity == null || submittedCode == null) {
            return false;
        }

        String normalizedIdentity = normalize(identity);
        OtpRecord record = otpStore.get(normalizedIdentity);

        if (record == null) {
            return false;
        }

        if (Instant.now().isAfter(record.expiresAt)
                || record.attempts >= MAX_ATTEMPTS) {
            otpStore.remove(normalizedIdentity, record);
            return false;
        }

        record.attempts++;

        if (record.code.equals(submittedCode)) {
            otpStore.remove(normalizedIdentity, record);
            return true;
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            otpStore.remove(normalizedIdentity, record);
        }

        return false;
    }

    public void invalidateOtp(String identity) {
        if (identity != null) {
            otpStore.remove(normalize(identity));
        }
    }

    private String normalize(String identity) {
        return identity.trim().toLowerCase();
    }

    private static class OtpRecord {
        private final String code;
        private final Instant expiresAt;
        private int attempts;

        private OtpRecord(String code, Instant expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.attempts = 0;
        }
    }
}
