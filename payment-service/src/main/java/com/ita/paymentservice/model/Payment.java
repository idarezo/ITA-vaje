package com.ita.paymentservice.model;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
public class Payment {

	@Id
	private String id;
	private Long propertyId;
	private Long residentId;
	private BigDecimal amount;
	private String currency;
	private PaymentStatus status;
	private Instant dueDate;
	private Instant createdAt;
	private Instant updatedAt;
	private String description;
}
