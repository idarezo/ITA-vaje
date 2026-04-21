package com.ita.paymentservice.controller;

import com.ita.paymentservice.model.Payment;
import com.ita.paymentservice.model.PaymentRequest;
import com.ita.paymentservice.model.PaymentResponse;
import com.ita.paymentservice.service.PaymentService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     *  Plačilo najemnine za določeno nepremičnino in rezidenta
     */
    @PostMapping("/rent")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<PaymentResponse> createRentPayment(@Valid @RequestBody PaymentRequest request) {
        return paymentService.processRentPayment(request);
    }

    /**
     *  Pridobi plačilo po ID
     */
    @GetMapping("/{paymentId}")
    public Mono<Payment> getPaymentById(@PathVariable String paymentId) {
        return paymentService.getPaymentById(paymentId);
    }

    /**
     *  Vsa plačila za določenega rezidenta
     */
    @GetMapping("/residents/{residentId}")
    public Flux<Payment> getPaymentsByResident(@PathVariable Long residentId) {
        return paymentService.getPaymentsByResident(residentId);
    }

    /**
     *  Vsa plačila za določeno nepremičnino
     */
    @GetMapping("/properties/{propertyId}")
    public Flux<Payment> getPaymentsByProperty(@PathVariable Long propertyId) {
        return paymentService.getPaymentsByProperty(propertyId);
    }

    /**
     *  Preklic plačila (če še ni zaključeno)
     */
    @PostMapping("/{paymentId}/cancel")
    public Mono<PaymentResponse> cancelPayment(@PathVariable String paymentId) {
        return paymentService.cancelPayment(paymentId);
    }

    /**
     *  Ponovni poskus plačila (retry)
     */
    @PostMapping("/{paymentId}/retry")
    public Mono<PaymentResponse> retryPayment(@PathVariable String paymentId) {
        return paymentService.retryPayment(paymentId);
    }

    /**
     *  Plačaj račun (nastavi status na SUCCEEDED)
     */
    @PostMapping("/{paymentId}/pay")
    public Mono<PaymentResponse> payPayment(
            @PathVariable String paymentId,
            @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal paidAmount = null;
        if (body != null && body.get("amount") != null) {
            paidAmount = new BigDecimal(body.get("amount").toString());
        }
        return paymentService.payPayment(paymentId, paidAmount);
    }

    /**
     *  Izbriši vsa plačila rezidenta (kliče se ob brisanju rezidenta)
     */
    @DeleteMapping("/residents/{residentId}")
    public Mono<Void> deletePaymentsByResident(@PathVariable Long residentId) {
        return paymentService.deletePaymentsByResident(residentId);
    }

    /**
     *  Vsa plačila (admin endpoint)
     */
    @GetMapping
    public Flux<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }
}
