const functions = require("firebase-functions");
const axios = require("axios");

// Load OpenAI API key from Firebase Config
const OPENAI_API_KEY = functions.config().openai.key;

// Храним историю сообщений в памяти (если нет Firebase для этого)
const conversationHistory = [];

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
    console.log("User message:", userMessage);

    // Добавляем сообщение пользователя в историю
    conversationHistory.push({role: "user", content: userMessage});

    // Ограничиваем длину истории (например, 10 последних сообщений)
    if (conversationHistory.length > 10) {
      conversationHistory.shift(); // Удаляем самое старое сообщение
    }

    // Запрос к OpenAI API
    const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "Ты персональный AI-ассистент. Помогаешь пользователю в программировании, личной продуктивности и других вопросах. Отвечай понятно, но с деталями. Если нужно код — объясни, прежде чем давать пример.",
            },
            ...conversationHistory, // Добавляем историю
          ],
          max_tokens: 1000,
          temperature: 0.8, // Чуть более креативные ответы
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.4,
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 40000,
        },
    );

    console.log("Full OpenAI Response:", JSON.stringify(response.data, null, 2));

    const fullResponse = response.data.choices[0].message.content;

    // Добавляем ответ бота в историю диалога
    conversationHistory.push({role: "assistant", content: fullResponse});

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
