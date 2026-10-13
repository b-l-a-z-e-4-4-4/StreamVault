package com.example.demo;

import jakarta.servlet.http.HttpSession;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class PlaybackProgressController {

    private final PlaybackProgressRepository progressRepository;
    private final VideoRepository videoRepository;

    public PlaybackProgressController(
            PlaybackProgressRepository progressRepository,
            VideoRepository videoRepository) {
        this.progressRepository = progressRepository;
        this.videoRepository = videoRepository;
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<?> getProgress(
            @PathVariable String videoId,
            HttpSession session) {

        String userId = verifiedUserId(session);

        if (userId == null) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "User sign-in required.")
            );
        }

        var video = videoRepository.findById(videoId).orElse(null);

        if (video == null || !video.isPublished()) {
            return ResponseEntity.notFound().build();
        }

        PlaybackProgress saved =
                progressRepository.findByUserIdAndVideoId(
                        userId, videoId
                ).orElse(null);

        if (saved == null) {
            return ResponseEntity.ok(
                    Map.of(
                            "positionSeconds", 0,
                            "durationSeconds", 0,
                            "completed", false
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "positionSeconds", saved.getPositionSeconds(),
                        "durationSeconds", saved.getDurationSeconds(),
                        "completed", saved.isCompleted()
                )
        );
    }

    @PutMapping("/{videoId}")
    public ResponseEntity<?> saveProgress(
            @PathVariable String videoId,
            @RequestBody Map<String, Number> request,
            HttpSession session) {

        String userId = verifiedUserId(session);

        if (userId == null) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "User sign-in required.")
            );
        }

        var video = videoRepository.findById(videoId).orElse(null);

        if (video == null || !video.isPublished()) {
            return ResponseEntity.notFound().build();
        }

        Number positionNumber = request.get("positionSeconds");
        Number durationNumber = request.get("durationSeconds");

        if (positionNumber == null || durationNumber == null) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Position and duration are required."
                    )
            );
        }

        double duration = durationNumber.doubleValue();
        double position = positionNumber.doubleValue();

        if (!Double.isFinite(duration)
                || !Double.isFinite(position)
                || duration <= 0
                || position < 0
                || position > duration + 2) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Invalid playback position.")
            );
        }

        position = Math.min(position, duration);

        PlaybackProgress progress =
                progressRepository.findByUserIdAndVideoId(
                        userId, videoId
                ).orElseGet(() -> {
                    PlaybackProgress created = new PlaybackProgress();
                    created.setId(userId + ":" + videoId);
                    created.setUserId(userId);
                    created.setVideoId(videoId);
                    return created;
                });

        progress.setPositionSeconds(position);
        progress.setDurationSeconds(duration);
        progress.setCompleted(duration - position <= 10);
        progress.setUpdatedAt(Instant.now());

        progressRepository.save(progress);

        return ResponseEntity.noContent().build();
    }

    private String verifiedUserId(HttpSession session) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        boolean hasUserRole =
                authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(
                        authority ->
                                "ROLE_USER".equals(authority.getAuthority())
                );

        if (!hasUserRole
                || !Boolean.TRUE.equals(
                        session.getAttribute("STREAMVAULT_USER")
                )) {
            return null;
        }

        Object userId = session.getAttribute("STREAMVAULT_USER_ID");

        return userId instanceof String value && !value.isBlank()
                ? value
                : null;
    }
}