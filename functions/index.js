const functions = require("firebase-functions");
const axios = require("axios");

// Load OpenAI API key from Firebase Config
const OPENAI_API_KEY = functions.config().openai.key;

exports.chatWithGPT = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.set("Access-Control-Allow-Methods", "GET, POST");

  try {
    console.log("Received request from client:", req.body);

    // Validate request
    if (!req.body || !req.body.message) {
      console.error("Error: Missing 'message' field in request");
      return res.status(400).json({error: "Missing 'message' field in request"});
    }

    const userMessage = req.body.message;

    console.log("Sending request to OpenAI with message:", userMessage);

    // Send request to OpenAI API
    const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo", // ✅ Use a correct model
          messages: [
            {role: "system", content: "You are a helpful assistant."},
            {role: "user", content: userMessage},
          ],
          max_tokens: 100,
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
    );

    console.log("Response from OpenAI:", response.data);

    // Send the response back to the Android app
    return res.status(200).json({result: response.data.choices[0].message.content});
  } catch (error) {
    console.error("Error while requesting OpenAI:", error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: "Server error",
      details: error.response ? error.response.data : error.message,
    });
  }
});


