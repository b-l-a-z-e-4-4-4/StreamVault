
package com.example.demo;

import java.util.List;
import java.util.Map;

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
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "https://stream-vault-dun.vercel.app"
    },
    allowCredentials = "true"
)
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
        return videoRepository.findAll().stream()
                .filter(Video::isPublished)
                .toList();
    }

    @PostMapping("/demo")
    public ResponseEntity<?> addDemoVideo(
            @RequestBody Video video,
            HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Admin login required."));
        }

        return ResponseEntity.ok(videoRepository.save(video));
    }

    @PostMapping("/upload-metadata")
    public ResponseEntity<?> saveUploadedVideo(
            @RequestBody Video video,
            HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Admin login required."));
        }

        if (video.getTitle() == null
                || video.getTitle().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Video title is required."));
        }

        if (video.getVideoUrl() == null
                || !video.getVideoUrl().startsWith(
                    "https://res.cloudinary.com/")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid Cloudinary video URL."));
        }

        if (video.getPublicId() == null
                || video.getPublicId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cloudinary public ID is required."));
        }

        video.setId(null);
        video.setTitle(video.getTitle().trim());
        video.setPublished(true);

        Video savedVideo = videoRepository.save(video);
        return ResponseEntity.ok(savedVideo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVideo(
            @PathVariable String id,
            HttpSession session) {

        if (!adminSessionService.isAdmin(session)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Admin login required."));
        }

        if (!videoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        videoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
