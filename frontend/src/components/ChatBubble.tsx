import React from "react";

interface ChatBubbleProps {
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  sender,
  timestamp,
}) => {
  const isUser = sender === "user";

  const bubbleStyle: React.CSSProperties = {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "16px",
    marginBottom: "8px",
    backgroundColor: isUser ? "#007bff" : "#e9ecef",
    color: isUser ? "white" : "black",
    marginLeft: isUser ? "auto" : "0",
    marginRight: isUser ? "0" : "auto",
  };

  const timeStyle: React.CSSProperties = {
    fontSize: "12px",
    color: isUser ? "rgba(255,255,255,0.7)" : "#666",
    marginTop: "4px",
  };

  return (
    <div style={bubbleStyle}>
      <p style={{ margin: 0 }}>{text}</p>
      <span style={timeStyle}>
        {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
};
