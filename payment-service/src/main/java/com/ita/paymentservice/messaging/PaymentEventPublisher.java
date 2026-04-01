package com.ita.paymentservice.messaging;

import com.ita.paymentservice.model.Payment;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Component
@RequiredArgsConstructor
public class PaymentEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventPublisher.class);

    private final JmsTemplate jmsTemplate;

    @Value("${messaging.payment-events-queue:payment.events}")
    private String paymentEventsQueue;

    public Mono<Void> publishPaymentEvent(Payment payment, String eventType) {
        PaymentEvent event = PaymentEvent.builder()
                .eventType(eventType)
                .paymentId(payment.getId())
                .status(payment.getStatus())
                .propertyId(payment.getPropertyId())
                .residentId(payment.getResidentId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .updatedAt(payment.getUpdatedAt() != null ? payment.getUpdatedAt() : Instant.now())
                .build();

        return Mono.fromRunnable(() -> {
                    jmsTemplate.convertAndSend(paymentEventsQueue, event);
                    log.debug("Published payment event {} for payment {}", eventType, payment.getId());
                })
                .subscribeOn(Schedulers.boundedElastic())
                .then()
                .onErrorResume(ex -> {
                    log.warn("Failed to publish payment event {}: {}", eventType, ex.getMessage());
                    return Mono.empty();
                });
    }
}
