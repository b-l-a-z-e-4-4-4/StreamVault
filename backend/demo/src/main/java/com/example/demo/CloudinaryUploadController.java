
package com.example.demo;

import com.cloudinary.Cloudinary;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cloudinary")
public class CloudinaryUploadController {

    private final Cloudinary cloudinary;
    private final AdminSessionService adminSessionService;

    public CloudinaryUploadController(
            Cloudinary cloudinary,
            AdminSessionService adminSessionService) {
        this.cloudinary = cloudinary;
        this.adminSessionService = adminSessionService;
    }

    @GetMapping("/signature")
    public ResponseEntity<?> getUploadSignature(HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Admin login required"));
        }

        long timestamp = System.currentTimeMillis() / 1000L;

        Map<String, Object> params = new HashMap<>();
        params.put("timestamp", timestamp);
        params.put("folder", "streamvault/videos");

        
       String signature = cloudinary.apiSignRequest(
              params,
              System.getenv("CLOUDINARY_API_SECRET"),
              0
    );


        Map<String, Object> response = new HashMap<>();
        response.put("cloudName", System.getenv("CLOUDINARY_CLOUD_NAME"));
        response.put("apiKey", System.getenv("CLOUDINARY_API_KEY"));
        response.put("timestamp", timestamp);
        response.put("folder", "streamvault/videos");
        response.put("signature", signature);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
