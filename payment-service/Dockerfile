# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/payment-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 3004
ENV MONGODB_URI=mongodb://payment-mongo:27017/payment-service
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
