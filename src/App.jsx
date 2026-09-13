import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from 'react';
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import "./App.css";
import rhiaBank from "./data/Professor-LUCY-RHIA-Question-Bank.json";
import cpcBank from "./data/Professor-LUCY-CPC-Study-Bank.json";
import ccsBank from "./data/Professor-LUCY-CCS-App-Bank.json";
const MONTHLY_PRODUCT_ID = 'com.thelovelycoder.professorlucy.monthly'
// import StreamingAvatar, { AvatarQuality } from "@heygen/streaming-avatar";
function findCurriculumReferences(searchQuestion) {
  const searchWords = searchQuestion
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const curriculum = [
    ...(rhiaBank.questions || []).map((item) => ({
      type: "RHIA",
      title: item.domainName || `Domain ${item.domain}`,
      question: item.question,
      answer: item.answer,
      rationale: item.rationale || "",
    })),

    ...(cpcBank.questions || []).map((item) => ({
      type: "CPC",
      title: item.category || "CPC",
      question: item.question,
      options: item.options || {},
      answer: item.answer,
      rationale: item.rationale || "",
    })),

    ...(ccsBank.cases || []).map((item) => ({
      type: "CCS",
      title: item.topic || "CCS Case Study",
      question: `${item.case || ""} ${item.question || ""}`,
      answer: item.answer,
      rationale: item.rationale || "",
    })),
  ];

  return curriculum
    .map((item) => {
      const searchableText = JSON.stringify(item).toLowerCase();

      const score = searchWords.reduce(
        (total, word) =>
          total + (searchableText.includes(word) ? 1 : 0),
        0
      );

      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...item }) => item);
}
function getPracticeQuestions(bankType) {
  if (bankType === "CPC") {
    return (cpcBank.questions || []).map((item) => ({
      ...item,
      bankType: "CPC",
      topic: item.category || "CPC General Coding",
      answerMode: "multiple-choice",
    }));
  }

  if (bankType === "RHIA") {
    return (rhiaBank.questions || []).map((item) => ({
      ...item,
      bankType: "RHIA",
      topic: item.domainName || `Domain ${item.domain}`,
      answerMode: "self-review",
    }));
  }

  if (bankType === "CCS") {
    return (ccsBank.cases || []).map((item) => ({
      ...item,
      bankType: "CCS",
      topic: item.topic || "CCS Case Study",
      answerMode: "self-review",
    }));
  }

  return [];
}
function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function App() {
const [learnerName, setLearnerName] = useState(
  () => localStorage.getItem("lucyLearnerName") || ""
);


 const [isLaunched, setIsLaunched] = useState(false)

const [isPracticeMode, setIsPracticeMode] = useState(false);
const [practiceBank, setPracticeBank] = useState("");
const [practiceQuestions, setPracticeQuestions] = useState([]);
const [practiceIndex, setPracticeIndex] = useState(0);
const [selectedAnswer, setSelectedAnswer] = useState("");
const [answerRevealed, setAnswerRevealed] = useState(false);
const [practiceFeedback, setPracticeFeedback] = useState("");

const [practiceHistory, setPracticeHistory] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("lucyPracticeHistory") || "[]"
    );
  } catch {
    return [];
  }
});


const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
    const [isListening, setIsListening] = useState(false);
const [subscriptionPrice, setSubscriptionPrice] = useState('$24.99/month')
const [purchaseMessage, setPurchaseMessage] = useState('')
const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'lucy',
    text: "Hi! I'm Professor LUCY. What is your name?",
      time: getCurrentTime(),
    },
  ])

  const chatBottomRef = useRef(null)


  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, isLoading])
  useEffect(() => {
  localStorage.setItem(
    "lucyPracticeHistory",
    JSON.stringify(practiceHistory)
  );
}, [practiceHistory]);
useEffect(() => {
  
  const initializePurchases = async () => {
    if (!window.CdvPurchase) {
      setPurchaseMessage('Purchases are available inside the mobile app.')
      return
    }

    const { store, ProductType, Platform } = window.CdvPurchase

    store.register([
      {
        id: MONTHLY_PRODUCT_ID,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
    ])

    store.when().productUpdated((product) => {
      if (product.id === MONTHLY_PRODUCT_ID) {
        const offer = product.getOffer()
        const price = offer?.pricingPhases?.[0]?.price

        if (price) {
          setSubscriptionPrice(`${price}/month`)
        }
      }
    })
   store.when().receiptUpdated(() => {
  const product = store.get(
    MONTHLY_PRODUCT_ID,
    Platform.APPLE_APPSTORE
  );

  if (store.owned(product)) {
    setSubscriptionActive(true);
    setPurchaseMessage("Subscription active!");
  }
}); 
store.when().approved((transaction) => {
  transaction.verify();
});

store.when().verified((receipt) => {
  setSubscriptionActive(true);
  setPurchaseMessage("Subscription active!");
  receipt.finish();

});
    store.error((error) => {
      setPurchaseMessage(error.message || 'Unable to load subscription.')
    })

    await store.initialize([Platform.APPLE_APPSTORE])
  }

  if (window.CdvPurchase) {
    initializePurchases()
  } else {
    document.addEventListener('deviceready', initializePurchases, {
      once: true,
    })
  }

  return () => {
    document.removeEventListener('deviceready', initializePurchases)
  }
}, [])

async function subscribeMonthly() {
  if (!window.CdvPurchase) {
    setPurchaseMessage("Subscriptions are only available in the mobile app.");
    return;
  }
  const { store, Platform } = window.CdvPurchase
  const product = store.get(
    MONTHLY_PRODUCT_ID,
    Platform.APPLE_APPSTORE
  )
  const offer = product?.getOffer()

  if (!offer) {
    setPurchaseMessage('The monthly subscription is not available yet.')
    return
  }

  setPurchaseMessage('Opening Apple purchase…')

  const error = await offer.order()

  if (error) {
    setPurchaseMessage(error.message || 'The purchase could not be completed.')
  }
}


async function restoreSubscription() {
  if (!window.CdvPurchase) {
    setPurchaseMessage(
      "Restore purchases is only available in the mobile app."
    );
    return;
  }

  try {
    setPurchaseMessage("Restoring subscription...");

    const { store } = window.CdvPurchase;
    await store.restorePurchases();

    setPurchaseMessage("Purchase history restored.");
  } catch (error) {
    setPurchaseMessage(
      error.message || "Unable to restore purchases."
    );
  }
}


  function speakText(text) {
    if (!voiceEnabled || !text) {
      return
    }

    window.speechSynthesis?.cancel();

    
  }

  function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
function playLucyVoice(audioSource) {
  if (!audioSource) {
    return;
  }

  window.speechSynthesis?.cancel();

  const audio = new Audio(audioSource);

  audio.play().catch((error) => {
    console.error("LUCY voice playback error:", error);
  });
}
 
const startSpeechRecognition = async () => {
  try {
    setIsListening(true);
    setQuestion("");

    await SpeechRecognition.removeAllListeners();

    const permissions = await SpeechRecognition.requestPermissions();

if (permissions.speechRecognition !== "granted") {
  console.error("Speech recognition permission not granted:", permissions);
  setIsListening(false);
  return;
}

    await SpeechRecognition.addListener("partialResults", (data) => {
      if (data.matches && data.matches.length > 0) {
        setQuestion(data.matches[0]);
      }
    });

    await SpeechRecognition.start({
      language: "en-US",
      partialResults: true,
      popup: false,
    });
  } catch (error) {
    console.error("Speech recognition failed to start:", error);
    setIsListening(false);
  }
};

const stopListening = async () => {
  try {
    await SpeechRecognition.stop();
  } catch (error) {
    console.log("Speech stop error:", error);
  } finally {
    setIsListening(false);
  }
};
function startPractice(bankType) {
  const availableQuestions = getPracticeQuestions(bankType);

  const randomizedQuestions = [...availableQuestions].sort(
    () => Math.random() - 0.5
  );

  setPracticeBank(bankType);
  setPracticeQuestions(randomizedQuestions);
  setPracticeIndex(0);
  setSelectedAnswer("");
  setAnswerRevealed(false);
  setPracticeFeedback("");
  setIsLaunched(false);
  setIsPracticeMode(true);
}
function savePracticeResult(result) {
  const currentQuestion = practiceQuestions[practiceIndex];

  if (!currentQuestion) {
    return;
  }

  const resultRecord = {
    id: Date.now(),
    questionId: currentQuestion.id,
    bankType: currentQuestion.bankType,
    topic: currentQuestion.topic,
    question: currentQuestion.question,
    result,
    selectedAnswer,
    correctAnswer: currentQuestion.answer,
    completedAt: new Date().toISOString(),
  };

  setPracticeHistory((currentHistory) => [
    ...currentHistory,
    resultRecord,
  ]);

  setPracticeFeedback(
    result === "correct"
      ? "Great work! You mastered this question."
      : "This topic has been saved for additional review."
  );

  setAnswerRevealed(true);
}

function checkCpcAnswer() {
  const currentQuestion = practiceQuestions[practiceIndex];

  if (!selectedAnswer) {
    setPracticeFeedback("Choose an answer before submitting.");
    return;
  }

  const isCorrect =
    selectedAnswer.toUpperCase() ===
    String(currentQuestion.answer).trim().toUpperCase();

  savePracticeResult(isCorrect ? "correct" : "review");
}

function goToNextPracticeQuestion() {
  if (practiceIndex >= practiceQuestions.length - 1) {
    setPracticeIndex(0);
  } else {
    setPracticeIndex((currentIndex) => currentIndex + 1);
  }

  setSelectedAnswer("");
  setAnswerRevealed(false);
  setPracticeFeedback("");
}
  async function handleSend() {
    console.log("handlesend fire");
    const questionString = typeof question === 'string' ? question : '';
  const cleanedQuestion = questionString.trim();

  if (!cleanedQuestion || isLoading) {
    return;
  }

  if (!learnerName) {
  const savedName = cleanedQuestion;

  localStorage.setItem("lucyLearnerName", savedName);
  setLearnerName(savedName);

  setMessages((currentMessages) => [
    ...currentMessages,
    {
      id: Date.now(),
      role: "learner",
      text: savedName,
      time: getCurrentTime(),
    },
    {
      id: Date.now() + 1,
      role: "lucy",
      text: `Hello, ${savedName}! What would you like to learn today?`,
      time: getCurrentTime(),
    },
  ]);

  setQuestion("");
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

    const curriculumMatches =
  findCurriculumReferences(cleanedQuestion);

const curriculumContext =
  curriculumMatches.length > 0
    ? JSON.stringify(curriculumMatches, null, 2)
    : "";

    try {
              const response = await fetch('https://thelovelycoder-lucy-app.onrender.com/ask', {


        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: cleanedQuestion,
          messages: conversationBeforeQuestion,
          learnerName: learnerName,
          curriculumContext: curriculumContext,
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
       text: "Hi! I'm Professor LUCY. 😊 What's your name?",
        time: getCurrentTime(),
      },
    ])
  }
  const currentPracticeQuestion =
    practiceQuestions[practiceIndex];

    if (isPracticeMode && currentPracticeQuestion) {
    return (
      <main className="lucy-page">
        <section className="lucy-card practice-card">
          <p className="eyebrow">
            Professor LUCY™ Practice Mode
          </p>

          <h1>{practiceBank} Practice</h1>

          <p>
            Question {practiceIndex + 1} of{" "}
            {practiceQuestions.length}
          </p>

          <article className="practice-question">
            <p className="practice-topic">
              {currentPracticeQuestion.topic}
            </p>

            {currentPracticeQuestion.case && (
              <p className="practice-case">
                {currentPracticeQuestion.case}
              </p>
            )}

            <h2>{currentPracticeQuestion.question}</h2>
            {currentPracticeQuestion.answerMode ===
  "multiple-choice" && (
  <div className="practice-options">
    {Object.entries(
      currentPracticeQuestion.options || {}
    )
      .sort(([firstLetter], [secondLetter]) =>
        firstLetter.localeCompare(secondLetter)
      )
      .map(([letter, optionText]) => (
        <button
          type="button"
          key={letter}
          className={
            selectedAnswer === letter
              ? "practice-option selected"
              : "practice-option"
          }
          disabled={answerRevealed}
          onClick={() => setSelectedAnswer(letter)}
        >
          <strong>{letter}.</strong> {optionText}
        </button>
      ))}
  </div>
)}

{currentPracticeQuestion.answerMode ===
  "multiple-choice" &&
  !answerRevealed && (
    <button
      type="button"
      className="practice-action"
      onClick={checkCpcAnswer}
    >
      Submit Answer
    </button>
  )}

{currentPracticeQuestion.answerMode ===
  "self-review" &&
  !answerRevealed && (
    <button
      type="button"
      className="practice-action"
      onClick={() => setAnswerRevealed(true)}
    >
      Reveal Answer
    </button>
  )}

{answerRevealed && (
  <div className="practice-answer">
    <strong>Correct Answer</strong>
    <p>{currentPracticeQuestion.answer}</p>

    {currentPracticeQuestion.rationale && (
      <>
        <strong>Why It Matters</strong>
        <p>{currentPracticeQuestion.rationale}</p>
      </>
    )}
  </div>
)}

{currentPracticeQuestion.answerMode ===
  "self-review" &&
  answerRevealed &&
  !practiceFeedback && (
    <div className="self-review-actions">
      <button
        type="button"
        onClick={() => savePracticeResult("correct")}
      >
        Got It
      </button>

      <button
        type="button"
        onClick={() => savePracticeResult("review")}
      >
        Review Again
      </button>
    </div>
  )}

{practiceFeedback && (
  <p className="practice-feedback">
    {practiceFeedback}
  </p>
)}

{answerRevealed && practiceFeedback && (
  <button
    type="button"
    className="practice-action"
    onClick={goToNextPracticeQuestion}
  >
    Next Question
  </button>
)}
          </article>

          <button
            type="button"
            className="back-button"
            onClick={() => setIsPracticeMode(false)}
          >
            Back to Home
          </button>
        </section>
      </main>
    );
  }
  

  
  if (isLaunched) {
    return (
      <main className="lucy-page">
        <section className="lucy-card chat-card">
          <p className="eyebrow">
            The Lovely Coder Academy®
          </p>

          <div
  className="lucy-avatar-wrap"
  style={{
    width: "280px",
    maxWidth: "calc(100vw - 32px)",
    height: "190px",
    margin: "12px auto 16px",
    overflow: "hidden",
    borderRadius: "24px",
  }}
>
  <img
    src="/lucy-avatar.png"
    alt="Professor LUCY"
    className="lucy-avatar"
    style={{
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      objectPosition: "center 25%",
    }}
  />
</div>
          <h1>Professor LUCY™</h1>

        

          
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
                      : learnerName || "Learner"}
                  </strong>

                  <ReactMarkdown>{message.text}</ReactMarkdown>

                  
                  

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

       <div
  className="lucy-avatar-wrap"
  style={{
    width: "280px",
    maxWidth: "calc(100vw - 32px)",
    height: "190px",
    margin: "12px auto 16px",
    overflow: "hidden",
    borderRadius: "24px",
  }}
>
  <img
    src="/lucy-avatar.png"
    alt="Professor LUCY"
    className="lucy-avatar"
    style={{
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      objectPosition: "center 25%",
    }}
  />
</div>

        <h1>Professor LUCY™</h1>
        <h2>The Lovely Coder AI Professor</h2>

       

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
<div className="practice-launch">
  <h2>Practice With Professor LUCY</h2>
  <p>Choose your certification area:</p>

  <button
    type="button"
    onClick={() => startPractice("RHIA")}
  >
    Start RHIA Practice
  </button>

  <button
    type="button"
    onClick={() => startPractice("CPC")}
  >
    Start CPC Practice
  </button>

  <button
    type="button"
    onClick={() => startPractice("CCS")}
  >
    Start CCS Practice
  </button>
</div>
<p>
  Professor LUCY Monthly Access — {subscriptionPrice} 
</p>

<div className="subscription-details">
  <p>
    <strong>
      $24.99 per month includes unlimited access to Professor LUCY's
      AI-assisted tutoring.
    </strong>
  </p>

  <p>
    Subscribers receive personalized explanations, study support, and
    practice guidance for medical coding, health information management,
    health informatics, revenue cycle, healthcare analytics, and healthcare AI.
  </p>

  <p>
    The subscription automatically renews monthly until canceled.
  </p>
</div>

<button
  type="button"
  onClick={subscribeMonthly}
  disabled={subscriptionActive}
>
  {subscriptionActive ? "Subscription Active" : "Subscribe"}
</button>



<button
  type="button"
  onClick={restoreSubscription}
>
  Restore Purchases
</button>
<p>
  <a
    href="https://www.the-lovely-coder.com/professor-lucy-privacy-policy"
    target="_blank"
    rel="noreferrer"
  >
    Privacy Policy
  </a>
</p>
{purchaseMessage && <p>{purchaseMessage}</p>}
<p>
  <a
    href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
    target="_blank"
    rel="noreferrer"
  >
    Terms of Use
  </a>
</p>

      </section>
    </main>
  )
}

export default App
