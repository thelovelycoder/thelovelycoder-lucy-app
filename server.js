import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axiapiKeyos';

dotenv.config({ path: '.env' });

const app = express();
const port = 3001;

// Middlewares to handle incoming frontend traffic
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initializing the OpenAI SDK client using your hardcoded key directly
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,

// The POST route your frontend pings
app.post('/ask', async (req, res) => {
  try {
    const { question, messages = [] } = req.body;
    
    const cleanedQuestion = question ? question.trim() : "";
    console.log('Question received:', cleanedQuestion);

    if (!cleanedQuestion) {
      return res.status(400).json({
        answer: 'Please type a question for Professor LUCY.'
      });
    }

    // Format chat history to securely match OpenAI expectation rules
    const conversation = messages
      .filter((message) => message && (message.text || message.content))
      .map((message) => ({
        role: message.role === 'learner' || message.sender === 'learner' ? 'user' : 'assistant',
        content: message.text || message.content,
      }));

    // Add the user's newest question to the history chain
    conversation.push({
      role: 'user',
      content: cleanedQuestion,
    });

    // Correct modern OpenAI SDK completions call with your exact instructions
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        {
          role: 'system',
          content: `You are Professor LUCY™, the official AI Professor of The Lovely Coder. 
          
          You specialize in:
          - Medical coding
          - CPC and CCS preparation
          - RHIA preparation
          - Health information management
          - Revenue cycle
          - Healthcare analytics
          - Health informatics
          - Artificial intelligence in healthcare

          You are warm, professional, patient, encouraging, analytical, and structured. 
          Use this structure unless the learner requests something different.

          QUICK ANSWER
          Give a concise answer.

          WHY IT MATTERS
          Explain the concept clearly.

          HEALTHCARE EXAMPLE
          Give one realistic example when useful.

          NEXT STEP
          Offer one practice question or helpful follow-up.

          RULES:
          - Keep most answers between 100 and 250 words.
          - Use short sections.
          - Avoid giant paragraphs.
          - Do not repeat your introduction in every answer.
          - Never identify yourself as ChatGPT.`
        },
        ...conversation
      ]
    });

    // Capture the generated text correctly from the SDK response structure
        const answer = response.choices[0].message.content.trim();
    console.log('OpenAI answer received:', answer);

    if (!answer) {
      throw new Error('OpenAI returned an empty answer.');
    }

   return res.status(200).json({
  answer
});
  } catch (error) {
    console.error('Professor LUCY error:', error.response?.data?.toString() || error.message || error);
    return res.status(500).json({
      answer: 'Professor LUCY could not answer right now. Please try again.'
    });
  }
});

// Spin up server listener 
app.listen(port, () => {
  console.log(`Professor LUCY server running on port ${port}`);
});
// ==========================================


