package com.ita.paymentservice.model;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Data;

@Data
public class PaymentRequest {

	@NotNull
	private Long propertyId;

	@NotNull
	private Long residentId;

	@NotNull
	@Positive
	private BigDecimal amount;

	@NotNull
	@Size(min = 3, max = 3)
	private String currency;

	private Instant dueDate;

	@Size(max = 500)
	private String description;
}
