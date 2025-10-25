import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Create socket instance
const socket = io("http://localhost:5000");

export default function App() {
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const recipientInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Socket event handlers
  useEffect(() => {
    // Handle incoming messages
    socket.on("newMessage", (data) => {
      setMessages(prev => [...prev, {
        from: data.from,
        to: username,
        text: data.text,
        time: data.time
      }]);
    });

    // Handle user joined notifications
    socket.on("userJoined", (newUser) => {
      setOnlineUsers(prev => [...prev, newUser]);
    });

    // Handle initial online users list
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
      // Set first other user as recipient if none selected
      if (!recipient && users.length > 0) {
        const otherUser = users.find(user => user !== username);
        if (otherUser) setRecipient(otherUser);
      }
    });

    // Handle user left notifications
    socket.on("userLeft", (leftUser) => {
      setOnlineUsers(prev => prev.filter(user => user !== leftUser));
    });

    return () => {
      socket.off("newMessage");
      socket.off("userJoined");
      socket.off("onlineUsers");
      socket.off("userLeft");
    };
  }, [username, recipient]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus recipient input when joining
  useEffect(() => {
    if (joined && recipientInputRef.current) {
      recipientInputRef.current.focus();
    }
  }, [joined]);

  const handleJoin = () => {
    if (username.trim()) {
      // Emit join event to server
      socket.emit("join", username.trim());
      setJoined(true);
      
      // Welcome message
      const notification = {
        from: "System",
        text: `Welcome ${username}! Connecting to chat...`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      };
      setMessages([notification]);
    }
  };

  const sendMessage = () => {
    if (message.trim() && recipient.trim()) {
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send message to server
      socket.emit("sendMessage", {
        to: recipient,
        message: message.trim()
      });

      // Add to local messages
      setMessages(prev => [...prev, {
        from: username,
        to: recipient,
        text: message.trim(),
        time
      }]);

      setMessage(""); // clear input
    }
  };

  return (
    <div className="chat-container">
      {!joined ? (
        <div className="login-box">
          <h2>Join Chat</h2>
          <input
            type="text"
            placeholder="Enter your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <div className="chat-box">
          <header>
            <h3>You: {username}</h3>
            <div className="recipient-box">
              <span>Chat with:</span>
              <select 
                ref={recipientInputRef}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="recipient-select"
              >
                <option value="">Choose someone...</option>
                {onlineUsers
                  .filter(user => user !== username)
                  .map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))
                }
              </select>
            </div>
          </header>

          <div className="messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.from === username ? "msg-sent" : "msg-received"}
              >
                <p>
                  {msg.text}
                </p>
                <span className="time">
                  {msg.from === "System" ? "" : 
                    msg.from === username ? 
                    `You → ${msg.to}` : 
                    `${msg.from} → You`
                  } {msg.time}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer>
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </footer>
        </div>
      )}
    </div>
  );
}