

package com.example.demo;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailOtpService {

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${app.otp.email.from:onboarding@resend.dev}")
    private String fromEmail;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public void sendOtp(String toEmail, String otp) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new IllegalStateException("RESEND_API_KEY is not configured");
        }

        String json = "{"
                + "\"from\":\"" + escapeJson(fromEmail) + "\","
                + "\"to\":[\"" + escapeJson(toEmail) + "\"],"
                + "\"subject\":\"Your StreamVault OTP\","
                + "\"text\":\"Your StreamVault OTP is " + escapeJson(otp)
                + ". Do not share this code with anyone.\""
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + resendApiKey.trim())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Resend email request failed with HTTP "
                                + response.statusCode() + ": " + response.body()
                );
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Email sending was interrupted", e);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Could not connect to Resend", e);
        }
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
