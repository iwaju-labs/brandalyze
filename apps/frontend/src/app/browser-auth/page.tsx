"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { authenticatedFetch } from "../../../lib/api";

export default function BrowserAuthPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    const handleBrowserAuth = async () => {
      // Wait for user data to load
      if (!isLoaded) return;

      // Check if user is signed in
      if (!isSignedIn) {
        // Redirect to sign in with return URL
        const currentUrl = encodeURIComponent(globalThis.location.href);
        globalThis.location.href = `/sign-in?redirect_url=${currentUrl}`;
        return;
      }

      try {
        const response = await authenticatedFetch(
          "/extension/auth/create/",
          getToken,
          { method: "POST" }
        );

        if (response.data?.auth_code) {
          // Show success message with auth code that extension can detect
          document.body.innerHTML = `
            <div style="
              min-height: 100vh;
              background: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              <div style="
                max-width: 400px;
                width: 90%;
                background: white;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
              ">
                <div style="
                  width: 64px;
                  height: 64px;
                  margin: 0 auto 1rem;
                  background: #10b981;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h1 style="
                  font-size: 1.5rem;
                  font-weight: 600;
                  color: #10b981;
                  margin-bottom: 0.5rem;
                ">
                  Connection Successful!
                </h1>
                <p style="
                  color: #6b7280;
                  margin-bottom: 1rem;
                  line-height: 1.5;
                ">
                  Your browser extension is now connected to your account. This tab will close automatically.
                </p>
                <div style="
                  font-size: 0.75rem;
                  color: #9ca3af;
                  margin-bottom: 1rem;
                  padding: 0.5rem;
                  background: #f3f4f6;
                  border-radius: 6px;
                  font-family: monospace;
                ">
                  Auth Code: ${response.data.auth_code}
                </div>
                <button onclick="globalThis.close()" style="
                  background: #10b981;
                  color: white;
                  padding: 0.5rem 1rem;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-weight: 500;
                ">
                  Close Tab
                </button>
              </div>
            </div>
          `;

          // Auto-close after 5 seconds
          setTimeout(() => {
            globalThis.close();
          }, 5000);
        } else {
          console.error("No auth code received:", response);
          // Show error message to user
          document.body.innerHTML = `
            <div style="
              min-height: 100vh;
              background: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              <div style="
                max-width: 400px;
                width: 90%;
                background: white;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
              ">
                <h1 style="
                  font-size: 1.5rem;
                  font-weight: 600;
                  color: #ef4444;
                  margin-bottom: 0.5rem;
                ">
                  Connection Failed
                </h1>
                <p style="
                  color: #6b7280;
                  margin-bottom: 1rem;
                  line-height: 1.5;
                ">
                  Unable to connect to the browser extension. Please try again.
                </p>
                <button onclick="globalThis.close()" style="
                  background: #3b82f6;
                  color: white;
                  padding: 0.5rem 1rem;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-weight: 500;
                ">
                  Close
                </button>
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error("Browser auth failed:", error);
        // Show error message to user
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to connect to browser extension. Please ensure you have a Pro or Enterprise subscription.";
        
        document.body.innerHTML = `
          <div style="
            min-height: 100vh;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              max-width: 400px;
              width: 90%;
              background: white;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              border-radius: 12px;
              padding: 2rem;
              text-align: center;
            ">
              <h1 style="
                font-size: 1.5rem;
                font-weight: 600;
                color: #ef4444;
                margin-bottom: 0.5rem;
              ">
                Connection Error
              </h1>
              <p style="
                color: #6b7280;
                margin-bottom: 1rem;
                line-height: 1.5;
              ">
                ${errorMessage}
              </p>
              <button onclick="globalThis.close()" style="
                background: #3b82f6;
                color: white;
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
              ">
                Close
              </button>
            </div>
          </div>
        `;
      }
    };

    handleBrowserAuth();
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "90%",
        background: "white",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        borderRadius: "12px",
        padding: "2rem",
        textAlign: "center"
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          margin: "0 auto 1rem",
          border: "4px solid #3b82f6",
          borderTop: "4px solid transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "0.5rem"
        }}>
          Connecting Browser Extension
        </h1>
        <p style={{
          color: "#6b7280",
          lineHeight: "1.5"
        }}>
          Please wait while we link your account to the browser extension...
        </p>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
