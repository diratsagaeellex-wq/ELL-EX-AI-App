import React, { useState } from 'react';

export default function NovaChat() {
  const [message, setMessage] = useState('');

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
        disabled={!message.trim()}
      >
        Ask Nova
      </button>
    </section>
  );
}