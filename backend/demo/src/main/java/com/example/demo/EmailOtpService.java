
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

    private final String apiKey;
    private final String fromEmail;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public EmailOtpService(
            @Value("${RESEND_API_KEY:}") String apiKey,
            @Value("${app.otp.email.from:onboarding@resend.dev}")
            String fromEmail) {

        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    public void sendOtp(String toEmail, String otp) {

        if (toEmail == null || toEmail.isBlank()
                || otp == null || otp.isBlank()) {
            throw new IllegalArgumentException(
                    "Recipient email and OTP are required");
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "RESEND_API_KEY is not configured");
        }

        try {
            Map<String, Object> payload = Map.of(
                    "from", "StreamVault <" + fromEmail + ">",
                    "to", new String[]{toEmail},
                    "subject", "Your StreamVault OTP",
                    "text", "Your StreamVault OTP is " + otp
                            + ". Do not share this code with anyone."
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200
                    || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Resend email API returned HTTP "
                                + response.statusCode()
                                + ": " + response.body());
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Resend email request was interrupted", e);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Could not communicate with Resend email API", e);
        }
    }
}
