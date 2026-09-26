import React, { useState } from 'react';

export default function NovaChat() {
  const [message, setMessage] = useState('');
async function sendMessage() {
  const question = message.trim();
  if (!question) return;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        mode: 'Ask',
      }),
    });

    const data = await response.json();
    alert(data.text || data.error || 'No response received.');
  } catch (error) {
    alert('Nova could not connect to the AI.');
  }
}

  return (
    <section className="nova-chat">
      <div className="nova-chat-header">
        <div className="nova-avatar">N</div>
        <div>
          <strong>Nova</strong>
          <small>Learning & Building Assistant</small>
        </div>
      </div>

      <p>
        Hi! I’m Nova. Ask me to explain something, help you learn,
        or turn an idea into a project.
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Talk to Nova..."
        rows={3}
      />

      <button
        type="button"
onClick={() => sendMessage()}
        disabled={!message.trim()}
      >
        Ask Nova
      </button>
    </section>
  );
}