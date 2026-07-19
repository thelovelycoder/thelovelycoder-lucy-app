import { useEffect, useRef, useState } from 'react';
import './App.css';
import StreamingAvatar, { AvatarQuality } from "@heygen/streaming-avatar";


function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function App() {
  const [isLaunched, setIsLaunched] = useState(false)
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
    const [isListening, setIsListening] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'lucy',
      text: 'Hello, learner! What would you like to learn today?',
      time: getCurrentTime(),
    },
  ])

  const chatBottomRef = useRef(null)
const videoRef = useRef(null);
const [avatarSession, setAvatarSession] = useState(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  useEffect(() => {
  async function initLucyStreaming() {
    try {
      const tokenResponse = await fetch('http://localhost:5000/api/get-heygen-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await tokenResponse.json();
      if (!data.token) return;

      const avatar = new StreamingAvatar({ token: data.token });
      await avatar.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: "0992d595d3334c63903997daa835a856", 
      });
      setAvatarSession(avatar);

      if (videoRef.current && avatar.stream) {
        videoRef.current.srcObject = avatar.stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    } catch (err) {
      console.error("Failed to map live avatar streaming channel:", err);
    }
  }
  initLucyStreaming();
  return () => { if (avatarSession) avatarSession.stopAvatar(); };
}, []);

  function speakText(text) {
    if (!voiceEnabled || !text) {
      return
    }

    window.speechSynthesis.cancel()

    
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel()
  }function playLucyVoice(audioSource) {
  if (!audioSource) {
    return
  }

  window.speechSynthesis?.cancel()

  const audio = new Audio(audioSource)

  audio.play().catch((error) => {
    console.error('LUCY voice playback error:', error)
  })
}
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please try Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

       recognition.onresult = (event) => {
      // Corrected double-array indexing to extract the raw text string properly
      const speechToText = event.results[0][0].transcript;
      setQuestion(speechToText);
      
      // Automatically triggers your handleSend function after a short 300ms pause
      setTimeout(() => {
        handleSend();
      }, 300);
    };


    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  async function handleSend() {
    const questionString = typeof question === 'string' ? question : '';
  const cleanedQuestion = questionString.trim();

  if (!cleanedQuestion || isLoading) {
    return;
  }

    stopSpeaking()

    const learnerMessage = {
      id: Date.now(),
      role: 'learner',
      text: cleanedQuestion,
      time: getCurrentTime(),
    }

    const conversationBeforeQuestion = [...messages]

    setMessages((currentMessages) => [
      ...currentMessages,
      learnerMessage,
    ])

    setQuestion('')
    setIsLoading(true)

    try {
              const response = await fetch('http://localhost:3001/ask', {


        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: cleanedQuestion,
          messages: conversationBeforeQuestion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.answer || 'Professor LUCY could not answer.'
        )
      }

      const lucyMessage = {
        id: Date.now() + 1,
        role: 'lucy',
        text: data.answer,
        time: getCurrentTime(),
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        lucyMessage,
      ])
      playLucyVoice(data.audio)
     
    } catch (error) {
      console.error('Professor LUCY connection error:', error)

      const errorMessage =
        "I couldn't connect right now. Please make sure both servers are running and try again."

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'lucy',
          text: errorMessage,
          time: getCurrentTime(),
        },
      ])

     
    } finally {
      setIsLoading(false)
    }
  }

  function returnHome() {
    stopSpeaking()

    setIsLaunched(false)
    setQuestion('')
    setIsLoading(false)

    setMessages([
      {
        id: Date.now(),
        role: 'lucy',
        text: 'Hello, learner! What would you like to learn today?',
        time: getCurrentTime(),
      },
    ])
  }

  if (isLaunched) {
    return (
      <main className="lucy-page">
        <section className="lucy-card chat-card">
          <p className="eyebrow">
            The Lovely Coder Academy®
          </p>

          <div className="lucy-avatar-wrap">
            <img
              src="/lucy-avatar.png"
              alt="Professor LUCY"
              className="lucy-avatar"
            />
          </div>

          <h1>Professor LUCY™</h1>

          <p className="intro">
            Your AI professor for medical coding, health
            informatics, revenue cycle, healthcare analytics,
            and artificial intelligence.
          </p>

          <div className="voice-controls">
            <button
              type="button"
              onClick={() => setVoiceEnabled((current) => !current)}
            >
              {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>

            <button
              type="button"
              onClick={stopSpeaking}
            >
              ⏹ Stop Voice
            </button>
          </div>

          <div className="chat-window">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row ${message.role}`}
              >
                <div
                  className={`message-bubble ${message.role}`}
                >
                  <strong>
                    {message.role === 'lucy'
                      ? 'Professor LUCY™'
                      : 'Learner'}
                  </strong>

                  <p>{message.text}</p>

                  
                  

                  <span className="message-time">
                    {message.time}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row lucy">
                <div className="message-bubble lucy thinking-bubble">
                  <strong>Professor LUCY™</strong>

                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          <div className="chat-controls">
            <input
              type="text"
              placeholder="Ask Professor LUCY a question..."
                       value={question || ''}

              disabled={isLoading}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  handleSend()
                }
              }}
            />
          <button 
            type="button" 
            onClick={startSpeechRecognition} 
            className={`mic-button ${isListening ? 'listening' : ''}`}
            disabled={isLoading}
            style={{
              backgroundColor: isListening ? '#ff4d4d' : '#8a2be2',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              marginRight: '8px',
              transition: 'background-color 0.3s ease'
            }}
          >
            {isListening ? '🛑 Listening...' : '🎙️'}
          </button>

            <button
              type="button"
              onClick={handleSend}
                        disabled={isLoading || !String(question || '').trim()}

            >
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={returnHome}
          >
            Back to Home
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="lucy-page">
      <section className="lucy-card">
        <p className="eyebrow">
          The Lovely Coder Academy®
        </p>

        <div className="lucy-avatar-wrap">
          <img
            src="/lucy-avatar.png"
            alt="Professor LUCY"
            className="lucy-avatar"
          />
        </div>

        <h1>Professor LUCY™</h1>
        <h2>The Lovely Coder AI Professor</h2>

        <p className="intro">
          Your virtual professor for medical coding, health
          informatics, revenue cycle, healthcare analytics,
          and artificial intelligence.
        </p>

        <div className="subjects">
          <span>Medical Coding</span>
          <span>RHIA</span>
          <span>Health Informatics</span>
          <span>Revenue Cycle</span>
          <span>Healthcare Analytics</span>
          <span>Artificial Intelligence</span>
        </div>

        <button
          type="button"
          onClick={() => setIsLaunched(true)}
        >
          Launch Professor LUCY
        </button>
      </section>
    </main>
  )
}

export default App