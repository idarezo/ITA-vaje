package com.ita.paymentservice.service;

import com.ita.paymentservice.messaging.PaymentEventPublisher;
import com.ita.paymentservice.model.Payment;
import com.ita.paymentservice.model.PaymentRequest;
import com.ita.paymentservice.model.PaymentResponse;
import com.ita.paymentservice.model.PaymentStatus;
import com.ita.paymentservice.repository.PaymentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher paymentEventPublisher;

    public Mono<PaymentResponse> processRentPayment(PaymentRequest request) {
        if (request.getAmount() == null || request.getAmount().signum() <= 0) {
            return Mono.error(new IllegalArgumentException("Amount must be positive"));
        }

        if (!StringUtils.hasText(request.getCurrency())) {
            return Mono.error(new IllegalArgumentException("Currency is required"));
        }

        Instant now = Instant.now();
        Payment payment = Payment.builder()
                .propertyId(request.getPropertyId())
                .residentId(request.getResidentId())
                .amount(request.getAmount())
                .currency(request.getCurrency().toUpperCase(Locale.ROOT))
                .dueDate(request.getDueDate() != null ? request.getDueDate() : now)
                .description(request.getDescription())
                .status(PaymentStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return paymentRepository.save(payment)
            .flatMap(saved -> paymentEventPublisher.publishPaymentEvent(saved, "payment.created")
                .thenReturn(new PaymentResponse(saved.getId(), saved.getStatus(),
                    "Rent payment registered")));
    }

    public Mono<Payment> getPaymentById(String paymentId) {
        return paymentRepository.findById(paymentId);
    }

    public Flux<Payment> getPaymentsByResident(Long residentId) {
        return paymentRepository.findByResidentId(residentId);
    }

    public Flux<Payment> getPaymentsByProperty(Long propertyId) {
        return paymentRepository.findByPropertyId(propertyId);
    }

    public Flux<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public Mono<Void> deletePaymentsByResident(Long residentId) {
        return paymentRepository.findByResidentId(residentId)
                .flatMap(paymentRepository::delete)
                .then();
    }

    public Mono<PaymentResponse> cancelPayment(String paymentId) {
        return updateStatus(paymentId, PaymentStatus.CANCELLED, "Payment cancelled", "payment.cancelled");
    }

    public Mono<PaymentResponse> retryPayment(String paymentId) {
        return updateStatus(paymentId, PaymentStatus.PENDING, "Retry initiated", "payment.retry");
    }

    public Mono<PaymentResponse> payPayment(String paymentId, BigDecimal paidAmount) {
        return paymentRepository.findById(paymentId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Payment not found")))
                .flatMap(existing -> {
                    boolean isPartial = paidAmount != null
                            && paidAmount.compareTo(BigDecimal.ZERO) > 0
                            && paidAmount.compareTo(existing.getAmount()) < 0;
                    existing.setPaidAmount(paidAmount != null ? paidAmount : existing.getAmount());
                    existing.setStatus(isPartial ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.SUCCEEDED);
                    existing.setUpdatedAt(Instant.now());
                    return paymentRepository.save(existing);
                })
                .flatMap(saved -> paymentEventPublisher.publishPaymentEvent(saved, "payment.succeeded")
                        .thenReturn(new PaymentResponse(saved.getId(), saved.getStatus(), "Payment completed")))
                .doOnError(error -> log.warn("Failed to pay payment {}: {}", paymentId, error.getMessage()));
    }

    private Mono<PaymentResponse> updateStatus(String paymentId, PaymentStatus newStatus, String message,
            String eventType) {
        return paymentRepository.findById(paymentId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Payment not found")))
                .flatMap(existing -> {
                    existing.setStatus(newStatus);
                    existing.setUpdatedAt(Instant.now());
                    return paymentRepository.save(existing);
                })
                .flatMap(saved -> paymentEventPublisher.publishPaymentEvent(saved,
                                eventType != null ? eventType : "payment.status-changed")
                        .thenReturn(new PaymentResponse(saved.getId(), saved.getStatus(), message)))
                .doOnError(error -> log.warn("Failed to update payment {}: {}", paymentId, error.getMessage()));
    }
}
