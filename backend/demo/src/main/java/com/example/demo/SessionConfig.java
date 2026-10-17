package com.example.demo;

import org.mongodb.spring.session.config.annotation.web.http.EnableMongoHttpSession;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
@EnableMongoHttpSession(
    maxInactiveIntervalInSeconds = 60 * 60 * 24 * 30
)
public class SessionConfig {

    private static final int COOKIE_MAX_AGE_SECONDS =
            60 * 60 * 24 * 30;

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer =
                new DefaultCookieSerializer();

        serializer.setCookieName("STREAMVAULT_SESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(true);
        serializer.setSameSite("None");
        serializer.setCookieMaxAge(COOKIE_MAX_AGE_SECONDS);

        return serializer;
    }

    // Temporary diagnostic: reports the configured database name.
    @Bean
public CommandLineRunner checkMongoConnection(
        MongoOperations mongoOperations) {
    return args -> {
        System.out.println(
                "MongoOperations implementation: "
                        + mongoOperations.getClass().getName());
    };
}
}