package com.ita.paymentservice.repository;

import com.ita.paymentservice.model.Payment;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface PaymentRepository extends ReactiveCrudRepository<Payment, String> {

    Flux<Payment> findByResidentId(Long residentId);

    Flux<Payment> findByPropertyId(Long propertyId);
}
