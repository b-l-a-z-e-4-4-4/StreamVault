
package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailOtpService {

    private final JavaMailSender mailSender;

    @Value("${app.otp.email.from}")
    private String fromEmail;

    public EmailOtpService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String recipient, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipient);
        message.setSubject("Your StreamVault verification code");
        message.setText(
                "Your StreamVault verification code is: " + otp
                + "\n\nThis code expires in 5 minutes."
                + "\nIf you did not request this code, ignore this email."
        );

        mailSender.send(message);
    }
}
