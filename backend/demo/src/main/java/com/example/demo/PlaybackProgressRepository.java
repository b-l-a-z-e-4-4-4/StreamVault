package com.example.demo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlaybackProgressRepository
        extends MongoRepository<PlaybackProgress, String> {

    Optional<PlaybackProgress> findByUserIdAndVideoId(
            String userId,
            String videoId
    );
}