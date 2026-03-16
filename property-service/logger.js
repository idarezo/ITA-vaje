import amqp from "amqplib";

let channel;
let connection;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";
const EXCHANGE_NAME = "logs";
const QUEUE_NAME = "property-service-logs";

// Inicializiraj RabbitMQ konekcijo
export async function initLogger() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Ustvari exchange
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // Ustvari queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind queue na exchange
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "property-service.*");

    console.log("Logger connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to initialize logger:", error);
    setTimeout(initLogger, 5000); // Retry after 5 seconds
  }
}

// Funkcija za pošiljanje logov
export async function sendLog(level, message, data = {}) {
  try {
    if (!channel) {
      console.log(`[${level}] ${message}`, data);
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      service: "property-service",
    };

    const routingKey = `property-service.${level}`;

    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(logEntry)),
      { persistent: true },
    );

    // Tudi v konzolo
    console.log(`[${level}] ${message}`, data);
  } catch (error) {
    console.error("Error sending log:", error);
  }
}

// Convenience funkcije
export const logger = {
  info: (message, data) => sendLog("info", message, data),
  error: (message, data) => sendLog("error", message, data),
  warn: (message, data) => sendLog("warn", message, data),
  debug: (message, data) => sendLog("debug", message, data),
};

// Zaustavi logger
export async function closeLogger() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log("Logger connection closed");
  } catch (error) {
    console.error("Error closing logger:", error);
  }
}
