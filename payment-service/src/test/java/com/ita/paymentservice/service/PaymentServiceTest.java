package com.ita.paymentservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ita.paymentservice.messaging.PaymentEventPublisher;
import com.ita.paymentservice.model.Payment;
import com.ita.paymentservice.model.PaymentRequest;
import com.ita.paymentservice.model.PaymentResponse;
import com.ita.paymentservice.model.PaymentStatus;
import com.ita.paymentservice.repository.PaymentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentEventPublisher paymentEventPublisher;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, paymentEventPublisher);
    }

    @Test
    void processRentPaymentShouldSaveAndPublishEvent() {
        PaymentRequest request = new PaymentRequest();
        request.setPropertyId(10L);
        request.setResidentId(5L);
        request.setAmount(new BigDecimal("1200.00"));
        request.setCurrency("eur");
        request.setDescription("April rent");

        Payment saved = Payment.builder()
                .id("pay-1")
                .propertyId(10L)
                .residentId(5L)
                .amount(new BigDecimal("1200.00"))
                .currency("EUR")
                .status(PaymentStatus.PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(paymentRepository.save(any(Payment.class))).thenReturn(Mono.just(saved));
        when(paymentEventPublisher.publishPaymentEvent(any(Payment.class), eq("payment.created")))
                .thenReturn(Mono.empty());

        StepVerifier.create(paymentService.processRentPayment(request))
                .assertNext(response -> {
                    assertEquals("pay-1", response.getPaymentId());
                    assertEquals(PaymentStatus.PENDING, response.getStatus());
                    assertEquals("Rent payment registered", response.getMessage());
                })
                .verifyComplete();

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        Payment toSave = paymentCaptor.getValue();
        assertEquals("EUR", toSave.getCurrency());
        assertNotNull(toSave.getDueDate());
        assertEquals(PaymentStatus.PENDING, toSave.getStatus());

        verify(paymentEventPublisher).publishPaymentEvent(any(Payment.class), eq("payment.created"));
    }

    @Test
    void processRentPaymentShouldFailWhenAmountIsNotPositive() {
        PaymentRequest request = new PaymentRequest();
        request.setPropertyId(10L);
        request.setResidentId(5L);
        request.setAmount(BigDecimal.ZERO);
        request.setCurrency("EUR");

        StepVerifier.create(paymentService.processRentPayment(request))
                .expectErrorMatches(ex -> ex instanceof IllegalArgumentException
                        && ex.getMessage().equals("Amount must be positive"))
                .verify();

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void processRentPaymentShouldFailWhenCurrencyMissing() {
        PaymentRequest request = new PaymentRequest();
        request.setPropertyId(10L);
        request.setResidentId(5L);
        request.setAmount(new BigDecimal("1200.00"));
        request.setCurrency(" ");

        StepVerifier.create(paymentService.processRentPayment(request))
                .expectErrorMatches(ex -> ex instanceof IllegalArgumentException
                        && ex.getMessage().equals("Currency is required"))
                .verify();

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void cancelPaymentShouldUpdateStatusAndPublishEvent() {
        Payment existing = Payment.builder()
                .id("pay-2")
                .status(PaymentStatus.PENDING)
                .updatedAt(Instant.now())
                .build();

        when(paymentRepository.findById("pay-2")).thenReturn(Mono.just(existing));
        when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        when(paymentEventPublisher.publishPaymentEvent(any(Payment.class), eq("payment.cancelled")))
                .thenReturn(Mono.empty());

        StepVerifier.create(paymentService.cancelPayment("pay-2"))
                .assertNext(response -> {
                    assertEquals("pay-2", response.getPaymentId());
                    assertEquals(PaymentStatus.CANCELLED, response.getStatus());
                    assertEquals("Payment cancelled", response.getMessage());
                })
                .verifyComplete();

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertEquals(PaymentStatus.CANCELLED, paymentCaptor.getValue().getStatus());
    }

    @Test
    void retryPaymentShouldReturnErrorWhenPaymentDoesNotExist() {
        when(paymentRepository.findById("missing-id")).thenReturn(Mono.empty());

        StepVerifier.create(paymentService.retryPayment("missing-id"))
                .expectErrorMatches(ex -> ex instanceof IllegalArgumentException
                        && ex.getMessage().equals("Payment not found"))
                .verify();

        verify(paymentRepository, never()).save(any(Payment.class));
        verify(paymentEventPublisher, never()).publishPaymentEvent(any(Payment.class), any(String.class));
    }

    @Test
    void getPaymentsByResidentShouldDelegateToRepository() {
        Payment first = Payment.builder().id("p1").residentId(42L).build();
        Payment second = Payment.builder().id("p2").residentId(42L).build();

        when(paymentRepository.findByResidentId(42L)).thenReturn(Flux.just(first, second));

        StepVerifier.create(paymentService.getPaymentsByResident(42L))
                .expectNext(first)
                .expectNext(second)
                .verifyComplete();

        verify(paymentRepository).findByResidentId(42L);
    }
}
