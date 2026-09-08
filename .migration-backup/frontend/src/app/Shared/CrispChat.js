"use client";
import { useEffect, useState } from "react";

const CrispChat = () => {
  const [crispReady, setCrispReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [buttonStyle, setButtonStyle] = useState({ bottom: "20px", right: "22px" });

  useEffect(() => {
  if (typeof window !== "undefined") {
    setTimeout(() => { // ⏳ Delay Crisp load by 5s
      // Update button position for mobile
      if (window.innerWidth < 768) {
        setButtonStyle({ bottom: "80px", right: "10px" });
      }

      if (!window.CRISP_WEBSITE_ID) {
        window.$crisp = window.$crisp || [];
        window.CRISP_WEBSITE_ID = "96d592bd-8911-4ce6-b2a0-40c901708912";

        const script = document.createElement("script");
        script.src = "https://client.crisp.chat/l.js";
        script.async = true;
        script.onload = () => {
          console.log("✅ Crisp Chat Loaded");
          waitForCrispReady();
        };
        document.head.appendChild(script);
      } else {
        waitForCrispReady();
      }
    }, 6000); // <--- ✅ Delay here
  }
  }, []);

  // Wait for Crisp to fully initialize
  const waitForCrispReady = () => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.$crisp?.push) {
        clearInterval(interval);
        setCrispReady(true);
        console.log("✅ Crisp Chat is Ready!");

        // Hide floating button initially
        window.$crisp.push(["do", "chat:hide"]);

        // Listen for Crisp chat closed event
        window.$crisp.push(["on", "chat:closed", () => {
          setChatOpen(false);
          window.$crisp.push(["do", "chat:hide"]); // Hide the widget on close
        }]);
      }
    }, 500);
  };

  // Toggle Crisp Chat
  const toggleCrispChat = () => {
    if (crispReady && typeof window !== "undefined" && window.$crisp) {
      if (chatOpen) {
        window.$crisp.push(["do", "chat:close"]);
        window.$crisp.push(["do", "chat:hide"]); // Ensure it hides when closing
      } else {
        window.$crisp.push(["do", "chat:show"]); // Show Crisp floating widget
        window.$crisp.push(["do", "chat:open"]); // Open the chat
      }
      setChatOpen(!chatOpen);
    } else {
      console.warn("❌ Crisp is not ready yet.");
    }
  };

  return (
    <>
      {/* Custom Floating Chat Button */}
      {!chatOpen && (
        <button
          className="custom-crisp-button"
          onClick={toggleCrispChat}
          style={{
            position: "fixed",
            backgroundColor: "#00947c",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            transition: "background-color 0.3s ease",
            zIndex: 9999,
            ...buttonStyle,
          }}
        >
          💬
        </button>
      )}
    </>
  );
};

export default CrispChat;
