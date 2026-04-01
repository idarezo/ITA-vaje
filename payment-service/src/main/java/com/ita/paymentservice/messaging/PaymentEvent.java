package com.ita.paymentservice.messaging;

import com.ita.paymentservice.model.PaymentStatus;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PaymentEvent implements Serializable {

    String eventType;
    String paymentId;
    PaymentStatus status;
    Long propertyId;
    Long residentId;
    BigDecimal amount;
    String currency;
    Instant updatedAt;
}
