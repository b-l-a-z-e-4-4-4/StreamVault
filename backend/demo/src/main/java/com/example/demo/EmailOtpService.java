
package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class EmailOtpService {

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${app.otp.email.from:onboarding@resend.dev}")
    private String fromEmail;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void sendOtp(String recipient, String otp) {

        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new IllegalStateException(
                    "RESEND_API_KEY is missing. Configure it in your environment."
            );
        }

        if (recipient == null || recipient.isBlank()) {
            throw new IllegalArgumentException(
                    "Recipient email address cannot be empty."
            );
        }

        if (otp == null || otp.isBlank()) {
            throw new IllegalArgumentException(
                    "OTP cannot be empty."
            );
        }

        try {
            String emailText =
                    "Your StreamVault verification code is: " + otp
                    + "\n\nThis code expires in 5 minutes."
                    + "\nIf you did not request this code, ignore this email.";

            Map<String, Object> payload = Map.of(
                    "from", fromEmail,
                    "to", new String[]{recipient.trim()},
                    "subject", "Your StreamVault verification code",
                    "text", emailText
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(java.time.Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200
                    || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Resend rejected the email. HTTP "
                        + response.statusCode()
                        + ". Response: " + response.body()
                );
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Sending the OTP email was interrupted.", e
            );

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Could not connect to Resend. Check network connectivity.",
                    e
            );
        }
    }
}
