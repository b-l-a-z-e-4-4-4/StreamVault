
package com.example.demo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "videos")
public class Video {

    @Id
    private String id;

    private String title;
    private String category;
    private String type;
    private String description;

    // Video storage and playback
    private String videoUrl;
    private String publicId;
    private boolean published = true;

    // Optional quality-specific video URLs
    private String url360p;
    private String url480p;
    private String url720p;
    private String url1080p;

    public Video() {
    }

    public Video(String title, String category, String type,
                 String description) {
        this.title = title;
        this.category = category;
        this.type = type;
        this.description = description;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public boolean isPublished() { return published; }
    public void setPublished(boolean published) {
        this.published = published;
    }

    public String getUrl360p() { return url360p; }
    public void setUrl360p(String url360p) {
        this.url360p = url360p;
    }

    public String getUrl480p() { return url480p; }
    public void setUrl480p(String url480p) {
        this.url480p = url480p;
    }

    public String getUrl720p() { return url720p; }
    public void setUrl720p(String url720p) {
        this.url720p = url720p;
    }

    public String getUrl1080p() { return url1080p; }
    public void setUrl1080p(String url1080p) {
        this.url1080p = url1080p;
    }
}
