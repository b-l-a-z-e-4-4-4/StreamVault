
package com.example.demo;

import java.util.List;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "https://stream-vault-dun.vercel.app"
})
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoRepository videoRepository;
    private final AdminSessionService adminSessionService;

    public VideoController(
            VideoRepository videoRepository,
            AdminSessionService adminSessionService) {
        this.videoRepository = videoRepository;
        this.adminSessionService = adminSessionService;
    }

    @GetMapping
    public List<Video> getVideos() {
        return videoRepository.findAll();
    }

    @PostMapping("/demo")
    public ResponseEntity<?> addDemoVideo(
            @RequestBody Video video,
            HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body("Admin login required.");
        }

        Video savedVideo = videoRepository.save(video);
        return ResponseEntity.ok(savedVideo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVideo(
            @PathVariable String id,
            HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body("Admin login required.");
        }

        if (!videoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        videoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
