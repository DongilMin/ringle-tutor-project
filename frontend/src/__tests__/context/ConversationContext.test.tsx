import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ConversationProvider, useConversation } from "../../context/ConversationContext";

// Mock crypto.randomUUID
beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-123" });
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

describe("ConversationContext", () => {
  it("initializes with empty state", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.conversationState).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("adds a message", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.addMessage({ text: "Hello", sender: "user" });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe("Hello");
    expect(result.current.messages[0].sender).toBe("user");
    expect(result.current.messages[0].id).toBe("test-uuid-123");
  });

  it("sets conversation state", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.setConversationState("recording");
    });

    expect(result.current.conversationState).toBe("recording");
  });

  it("sets loading state", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("sets error", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.setError("Something went wrong");
    });

    expect(result.current.error).toBe("Something went wrong");
  });

  it("clears messages", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.addMessage({ text: "Hello", sender: "user" });
      result.current.addMessage({ text: "Hi", sender: "ai" });
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("removes a specific message", () => {
    const { result } = renderHook(() => useConversation(), { wrapper });

    act(() => {
      result.current.addMessage({ text: "Hello", sender: "user" });
    });

    const messageId = result.current.messages[0].id;

    act(() => {
      result.current.removeMessage(messageId);
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useConversation());
    }).toThrow("useConversation must be used within a ConversationProvider");
  });
});
