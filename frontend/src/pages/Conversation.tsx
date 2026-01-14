import React, { useState } from "react";
import { ChatBubble } from "../components/ChatBubble";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const Conversation: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AI English tutor. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Mock: Add user message after recording
    const userMessage: Message = {
      id: messages.length + 1,
      text: "This is a sample user message from recording.",
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Mock: AI response after delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        text: "Great! Let me help you with that. Your pronunciation sounds good!",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="conversation-container">
      <h1>AI English Tutor</h1>

      <div
        className="chat-area"
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            text={message.text}
            sender={message.sender}
            timestamp={message.timestamp}
          />
        ))}
      </div>

      <div className="controls" style={{ textAlign: "center" }}>
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            style={{
              padding: "16px 32px",
              fontSize: "18px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
            }}
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            style={{
              padding: "16px 32px",
              fontSize: "18px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "50px",
              cursor: "pointer",
            }}
          >
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
};

export default Conversation;
