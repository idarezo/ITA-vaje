package com.ita.paymentservice.config;

import com.ita.paymentservice.model.Payment;
import com.ita.paymentservice.model.PaymentStatus;
import com.ita.paymentservice.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final PaymentRepository paymentRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void seedData() {
        paymentRepository.count()
                .flatMap(count -> {
                    if (count > 0) {
                        log.info("Database already has {} payments, skipping seed.", count);
                        return reactor.core.publisher.Mono.empty();
                    }
                    log.info("Seeding payment data...");
                    Instant now = Instant.now();

                    // Residents seed order: Bine Novak=1→prop2, Cvetka Horvat=2→prop3, Ana Kovač=3→prop1
                    List<Payment> payments = List.of(
                            // --- Property 1: Riverside Loft (Ana Kovač, residentId=3) ---
                            Payment.builder()
                                    .propertyId(1L).residentId(3L)
                                    .amount(new BigDecimal("950.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(90, ChronoUnit.DAYS))
                                    .description("Najemnina - Januar 2025")
                                    .createdAt(now.minus(95, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(88, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(1L).residentId(3L)
                                    .amount(new BigDecimal("950.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(60, ChronoUnit.DAYS))
                                    .description("Najemnina - Februar 2025")
                                    .createdAt(now.minus(65, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(58, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(1L).residentId(3L)
                                    .amount(new BigDecimal("950.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(30, ChronoUnit.DAYS))
                                    .description("Najemnina - Marec 2025")
                                    .createdAt(now.minus(35, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(28, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(1L).residentId(3L)
                                    .amount(new BigDecimal("950.00")).currency("EUR")
                                    .status(PaymentStatus.PENDING)
                                    .dueDate(now.plus(5, ChronoUnit.DAYS))
                                    .description("Najemnina - April 2025")
                                    .createdAt(now.minus(2, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(2, ChronoUnit.DAYS))
                                    .build(),

                            // --- Property 2: Old Town Studio (Bine Novak, residentId=1) ---
                            Payment.builder()
                                    .propertyId(2L).residentId(1L)
                                    .amount(new BigDecimal("720.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(60, ChronoUnit.DAYS))
                                    .description("Najemnina - Februar 2025")
                                    .createdAt(now.minus(65, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(58, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(2L).residentId(1L)
                                    .amount(new BigDecimal("720.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(30, ChronoUnit.DAYS))
                                    .description("Najemnina - Marec 2025")
                                    .createdAt(now.minus(35, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(28, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(2L).residentId(1L)
                                    .amount(new BigDecimal("720.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.plus(3, ChronoUnit.DAYS))
                                    .description("Najemnina - April 2025")
                                    .createdAt(now.minus(1, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(1, ChronoUnit.DAYS))
                                    .build(),

                            // --- Property 3: Sunny Garden Duplex (Cvetka Horvat, residentId=2) ---
                            Payment.builder()
                                    .propertyId(3L).residentId(2L)
                                    .amount(new BigDecimal("1350.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(60, ChronoUnit.DAYS))
                                    .description("Najemnina - Februar 2025")
                                    .createdAt(now.minus(65, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(58, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(3L).residentId(2L)
                                    .amount(new BigDecimal("1350.00")).currency("EUR")
                                    .status(PaymentStatus.SUCCEEDED)
                                    .dueDate(now.minus(30, ChronoUnit.DAYS))
                                    .description("Najemnina - Marec 2025")
                                    .createdAt(now.minus(35, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(28, ChronoUnit.DAYS))
                                    .build(),
                            Payment.builder()
                                    .propertyId(3L).residentId(2L)
                                    .amount(new BigDecimal("1350.00")).currency("EUR")
                                    .status(PaymentStatus.FAILED)
                                    .dueDate(now.minus(5, ChronoUnit.DAYS))
                                    .description("Najemnina - April 2025")
                                    .createdAt(now.minus(7, ChronoUnit.DAYS))
                                    .updatedAt(now.minus(5, ChronoUnit.DAYS))
                                    .build()
                    );
                    return paymentRepository.saveAll(payments).then();
                })
                .doOnSuccess(v -> log.info("Payment seed completed."))
                .doOnError(e -> log.error("Payment seed failed: {}", e.getMessage()))
                .subscribe();
    }
}
