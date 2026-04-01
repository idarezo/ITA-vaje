package com.ita.paymentservice.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class HealthController {

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> health() {
        // Reactive health response with timestamp for easier monitoring
        return Mono.just(
                Map.of(
                        "status", "healthy",
                        "service", "payment-service",
                        "timestamp", Instant.now().toString()));
    }
}
