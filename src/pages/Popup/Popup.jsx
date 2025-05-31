import React, { useState, useEffect } from 'react';
import './Popup.css';

// --- API Simulation Functions ---

async function verifyTokenAPI(token) {
  // TODO: Replace with actual API call to verify SHA256 token from www.alphabench.in
  // This function should:
  // 1. Send the `token` (which is expected to be a SHA256 hash of the original user token)
  //    to an endpoint like `https://www.alphabench.in/api/verify-token`.
  // 2. The request method should likely be POST.
  // 3. The payload should be JSON, e.g., { "token": "sha256_hashed_token_value" }.
  // 4. Headers should include 'Content-Type': 'application/json'.
  // 5. The backend at www.alphabench.in would then:
  //    a. Find the user associated with this SHA256 hash.
  //    b. If found and valid, respond with user details (e.g., userId, original token for Supabase).
  //    c. If not found or invalid, respond with an error.
  // 6. The response structure for success might be: { success: true, userId: "user-uuid", supabaseToken: "actual-supabase-jwt" }
  // 7. The response structure for failure might be: { success: false, message: "Invalid token" }

  console.log(`Simulating API call to verify token: ${token}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => { // Simulate network delay
      if (token === 'VALID_TOKEN') {
        resolve({ success: true, userId: 'simulatedUser123', supabaseToken: 'simulatedSupabaseJWT' });
      } else {
        reject(new Error('Invalid token from simulation'));
      }
    }, 500);
  });
}

async function addToKnowledgeBaseAPI(kbEntry, authToken) {
  // TODO: Replace with actual API call to Supabase or your backend that proxies to Supabase.
  // This function should:
  // 1. Send the `kbEntry` data to your Supabase table.
  //    Endpoint: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/rest/v1/<YOUR_TABLE_NAME>`
  // 2. Method: POST
  // 3. Headers:
  //    - 'apikey': '<YOUR_SUPABASE_ANON_KEY>' (public anon key)
  //    - 'Authorization': `Bearer ${authToken}` (the `supabaseToken` obtained during login)
  //    - 'Content-Type': 'application/json'
  //    - 'Prefer': 'return=minimal' (or 'return=representation' if you want the inserted data back)
  // 4. Body: JSON.stringify(kbEntry). `kbEntry` should include:
  //    - url: The URL of the page.
  //    - title: The title of the page.
  //    - content: The extracted page content (or a summary/embedding).
  //    - user_id: The `userId` obtained during login to associate the entry with the user.
  //    - (Potentially other metadata: e.g., crawled_at, tags)
  // 5. Error Handling: Check `response.ok`. If not, throw an error with details from `response.statusText` or response body.

  console.log("Simulating API call to add to knowledge base:", kbEntry, "using token:", authToken);
  return new Promise((resolve, reject) => {
    setTimeout(() => { // Simulate network delay
      if (authToken) { // Simulate auth check
        resolve({ success: true, message: "Entry added successfully" });
      } else {
        reject(new Error("Authentication token not provided for KB addition."));
      }
    }, 500);
  });
}

// --- React Component ---

const Popup = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  // No need to store userId in component state if it's only used for API calls,
  // it can be read from chrome.storage.local when needed.

  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['authToken', 'userId'], (result) => {
        if (result.authToken && result.userId) {
          setIsLoggedIn(true);
          console.log('User previously logged in. UID:', result.userId);
        } else {
          setIsLoggedIn(false); // Ensure clean state if one is missing
        }
      });
    } else {
      console.warn('chrome.storage.local is not available.');
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogin = async () => {
    setMessage({ text: '', type: '' });
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setMessage({ text: 'Please enter a token.', type: 'error' });
      return;
    }

    try {
      const response = await verifyTokenAPI(trimmedToken); // Call the refactored API function
      if (response.success && response.userId && response.supabaseToken) {
        // Store the Supabase JWT and userId. The input token (VALID_TOKEN) is a one-time use for verification.
        chrome.storage.local.set({ authToken: response.supabaseToken, userId: response.userId }, () => {
          setIsLoggedIn(true);
          setMessage({ text: 'Login successful!', type: 'success' });
          console.log('Supabase token and userId stored. User ID:', response.userId);
        });
      } else {
        // This case might not be reached if verifyTokenAPI throws an error for non-success
        setMessage({ text: 'Token verification failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Login API error:', error);
      setMessage({ text: error.message || 'Login failed. Please try again.', type: 'error' });
    }
    setTokenInput('');
  };

  const handleLogout = () => {
    if (chrome.storage && chrome.storage.local) {
      // Remove both authToken (Supabase JWT) and userId
      chrome.storage.local.remove(['authToken', 'userId'], () => {
        setIsLoggedIn(false);
        setMessage({ text: 'You have been logged out.', type: 'info' });
        console.log('Auth token and userId removed.');
      });
    } else {
      setIsLoggedIn(false);
      setMessage({ text: 'Logged out (storage API not available).', type: 'info' });
    }
  };

  const handleAddToKB = async () => {
    setMessage({ text: '', type: '' });

    if (!(chrome.tabs && chrome.tabs.query && chrome.storage && chrome.storage.local)) {
      setMessage({ text: 'Required Chrome APIs are not available.', type: 'error' });
      return;
    }

    chrome.storage.local.get(['authToken', 'userId'], async (storageResult) => {
      if (!storageResult.authToken || !storageResult.userId) {
        setMessage({ text: 'You must be logged in to add to Knowledge Base.', type: 'error' });
        setIsLoggedIn(false); // Correct state if storage is inconsistent
        return;
      }

      const { authToken, userId } = storageResult;

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) {
          setMessage({ text: 'Could not find active tab.', type: 'error' });
          return;
        }

        const tab = tabs[0];
        const url = tab.url;
        const title = tab.title;

        if (!url || url.startsWith('chrome://') || url.startsWith('about:')) {
          setMessage({ text: 'Cannot add this page. Invalid URL type.', type: 'error' });
          return;
        }

        const pageContent = "Simulated page content for: " + title; // Keep simulation for now
        const kbEntry = { url, title, content: pageContent, userId };

        try {
          const response = await addToKnowledgeBaseAPI(kbEntry, authToken); // Call refactored API
          if (response.success) {
            setMessage({ text: 'Page added to Knowledge Base!', type: 'success' });
          } else {
            // This case might not be reached if addToKnowledgeBaseAPI throws for non-success
            setMessage({ text: 'Failed to add to Knowledge Base.', type: 'error' });
          }
        } catch (error) {
          console.error('Add to KB API error:', error);
          setMessage({ text: error.message || 'Failed to add page.', type: 'error' });
        }
      });
    });
  };

  return (
    <div className="popup-container">
      <h1>Knowledge Base Extension</h1>
      {isLoggedIn ? (
        <div>
          <p>You are logged in.</p>
          <button id="add-to-kb-btn" onClick={handleAddToKB}>
            Add to Knowledge Base
          </button>
          <button id="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div>
          <p>Please log in at <a href="http://www.alphabench.in" target="_blank" rel="noopener noreferrer">www.alphabench.in</a> to get your token, then enter it below.</p>
          <input
            type="text"
            id="token-input"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter your token (e.g., VALID_TOKEN)"
          />
          <button id="login-btn" onClick={handleLogin}>
            Login
          </button>
        </div>
      )}
      {message.text && (
        <p id="message-area" className={`message-area ${message.type}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default Popup;
