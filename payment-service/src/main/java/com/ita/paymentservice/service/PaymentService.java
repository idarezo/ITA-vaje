package com.ita.paymentservice.service;

import com.ita.paymentservice.model.Payment;
import com.ita.paymentservice.model.PaymentRequest;
import com.ita.paymentservice.model.PaymentResponse;
import com.ita.paymentservice.model.PaymentStatus;
import com.ita.paymentservice.repository.PaymentRepository;
import java.time.Instant;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

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
                .map(saved -> new PaymentResponse(saved.getId(), saved.getStatus(),
                        "Rent payment registered"));
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

    public Mono<PaymentResponse> cancelPayment(String paymentId) {
        return updateStatus(paymentId, PaymentStatus.CANCELLED, "Payment cancelled");
    }

    public Mono<PaymentResponse> retryPayment(String paymentId) {
        return updateStatus(paymentId, PaymentStatus.PENDING, "Retry initiated");
    }

    private Mono<PaymentResponse> updateStatus(String paymentId, PaymentStatus newStatus, String message) {
        return paymentRepository.findById(paymentId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Payment not found")))
                .flatMap(existing -> {
                    existing.setStatus(newStatus);
                    existing.setUpdatedAt(Instant.now());
                    return paymentRepository.save(existing);
                })
                .map(saved -> new PaymentResponse(saved.getId(), saved.getStatus(), message));
    }
}
