const functions = require("firebase-functions");
const axios = require("axios");

// Load OpenAI API key from Firebase Config
const OPENAI_API_KEY = functions.config().openai.key;

exports.chatWithGPT = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");

  try {
    console.log("Received request from client:", req.body);

    if (!req.body || !req.body.message) {
      console.error("Error: Missing 'message' field in request");
      return res.status(400).json({error: "Missing 'message' field in request"});
    }

    const userMessage = req.body.message;
    console.log("Sending request to OpenAI with message:", userMessage);

    // Запрос к OpenAI API с таймаутом 10 секунд
    const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4-turbo",
          messages: [
            {role: "system", content: "You are a helpful assistant."},
            {role: "user", content: userMessage},
          ],
          max_tokens: 1000,
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 40000, // Таймаут 10 секунд
        },
    );

    console.log("Full OpenAI Response:", JSON.stringify(response.data, null, 2));

    const fullResponse = response.data.choices[0].message.content;

    // Разбиваем длинный текст на части, если он слишком большой
    const chunkSize = 500;
    const chunks = fullResponse.match(new RegExp(`.{1,${chunkSize}}`, "g"));

    return res.status(200).json({result: chunks});
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.error("Request timed out:", error.message);
      return res.status(408).json({error: "Request timed out"});
    }

    console.error("Error while requesting OpenAI:", error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: "Server error",
      details: error.response ? error.response.data : error.message,
    });
  }
});


