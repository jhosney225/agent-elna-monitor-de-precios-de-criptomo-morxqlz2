
```javascript
import Anthropic from "@anthropic-ai/sdk";
import readline from "readline";

const client = new Anthropic();

// Simulated cryptocurrency data store
const cryptoPrices = {
  BTC: 45230.5,
  ETH: 2850.75,
  XRP: 2.15,
  ADA: 0.98,
  SOL: 198.45,
};

const priceAlerts = {}; // Store user's price alerts

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Simulate price update (in real app, would fetch from API)
function updatePrices() {
  for (const symbol in cryptoPrices) {
    const change = (Math.random() - 0.5) * 200;
    cryptoPrices[symbol] = Math.max(0.01, cryptoPrices[symbol] + change);
  }
}

// Check if any alerts should be triggered
function checkAlerts() {
  const triggeredAlerts = [];

  for (const symbol in priceAlerts) {
    const alert = priceAlerts[symbol];
    const currentPrice = cryptoPrices[symbol];

    if (currentPrice !== undefined) {
      if (alert.type === "above" && currentPrice > alert.price) {
        triggeredAlerts.push(
          `🔔 ALERT: ${symbol} is now $${currentPrice.toFixed(2)} (above your $${alert.price} threshold)`
        );
      } else if (alert.type === "below" && currentPrice < alert.price) {
        triggeredAlerts.push(
          `🔔 ALERT: ${symbol} is now $${currentPrice.toFixed(2)} (below your $${alert.price} threshold)`
        );
      }
    }
  }

  return triggeredAlerts;
}

async function chat(userMessage, conversationHistory) {
  // Add user message to history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Create a system prompt for the crypto price monitor
  const systemPrompt = `You are a cryptocurrency price monitoring assistant. You help users:
1. Check current cryptocurrency prices
2. Set price alerts (above/below thresholds)
3. View their alerts
4. Remove alerts

Current cryptocurrency prices:
${Object.entries(cryptoPrices)
  .map(([symbol, price]) => `- ${symbol}: $${price.toFixed(2)}`)
  .join("\n")}

User's current alerts:
${
  Object.entries(priceAlerts).length > 0
    ? Object.entries(priceAlerts)
        .map(
          ([symbol, alert]) =>
            `- ${symbol}: Alert when price goes ${alert.type} $${alert.price}`
        )
        .join("\n")
    : "No alerts set"
}

When user wants to:
- Check prices: List the current prices
- Set alert: Respond with format "SET_ALERT:SYMBOL:above/below:PRICE"
- View alerts: List their current alerts
- Remove alert: Respond with format "REMOVE_ALERT:SYMBOL"

Always be helpful and provide context about market movements.`;

  // Call Claude API
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const assistantMessage = response.content[0].text;

  // Add assistant response to history
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  // Parse commands from response
  if (assistantMessage.includes("SET_ALERT:")) {
    const alertMatch = assistantMessage.match(
      /SET_ALERT:([A-Z]+):(above|below):([0-9.]+)/
    );
    if (alertMatch) {
      const [, symbol, type, price] = alertMatch;
      priceAlerts[symbol] = { type, price: parseFloat(price) };
    }
  }

  if (assistantMessage.includes("REMOVE_ALERT:")) {
    const removeMatch = assistantMessage.match(/REMOVE_ALERT:([A-Z]+)/);
    if (removeMatch) {
      delete priceAlerts[removeMatch[1]];
    }
  }

  return assistantMessage;
}

async function main() {
  console.log("🚀 Cryptocurrency Price Monitor with AI Assistant");
  console.log("================================================\n");
  console.log("Available commands:");
  console.log("- Check prices");
  console.log("- Set alert for [SYMBOL] above/below [PRICE]");
  console.log("- View my alerts");
  console.log("- Remove alert for [SYMBOL]");
  console.log("- Type 'exit' to quit\n");

  const conversationHistory = [];

  // Initial greeting
  const greeting = await chat(
    "Hello! Can you show me the current cryptocurrency prices?",
    conversationHistory
  );
  console.log("Assistant: " + greeting + "\n");

  while (true) {
    // Simulate price updates every few interactions
    if (Math.random() > 0.7) {
      updatePrices();
      const alerts = checkAlerts();
      if (alerts.length > 0) {
        console.log(alerts.join("\n") + "\n");
      }
    }

    const userInput = await question("You: ");

    if (userInput.toLowerCase() === "exit") {
      console.log("Goodbye!");
      rl.close();
      break;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      const response = await chat(userInput, conversationHistory);
      console.log("Assistant: " +