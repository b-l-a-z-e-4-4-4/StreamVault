
package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailOtpService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailOtpService(
            JavaMailSender mailSender,
            @Value("${app.otp.email.from}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendOtp(String toEmail, String otp) {

        if (toEmail == null || toEmail.isBlank()
                || otp == null || otp.isBlank()) {
            throw new IllegalArgumentException(
                    "Recipient email and OTP are required");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("Your StreamVault OTP");
        message.setText(
                "Your StreamVault OTP is " + otp
                + ". Do not share this code with anyone."
        );

        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new IllegalStateException(
                    "Gmail SMTP failed to send the OTP email", e);
        }
    }
}
