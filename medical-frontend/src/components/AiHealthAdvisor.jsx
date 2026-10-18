import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import API from '../api';
import { toast } from 'react-toastify';
import './AiHealthAdvisor.css';

const QUICK_PROMPTS = [
  'تحلیل و تفسیر آخرین آزمایش‌های ثبت‌شده من',
  'آیا بین داروهای مصرفی و آلرژی‌های من تداخلی وجود دارد؟',
  'توصیه‌های تغذیه‌ای و سبک زندگی مناسب برای وضعیت فعلی من چیست؟',
  'اصطلاحات تخصصی پرونده بالینی‌ام را به زبان ساده توضیح بده',
];

const AiHealthAdvisor = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let ignore = false;

    const loadSessions = async () => {
      try {
        const res = await API.get('ai/sessions/');
        if (!ignore) {
          setSessions(res.data);
          if (res.data.length > 0) {
            setActiveSessionId((prev) => prev || res.data[0].id);
          }
        }
      } catch {
        if (!ignore) {
          toast.error('خطا در دریافت لیست گفتگوها');
        }
      } finally {
        if (!ignore) {
          setIsLoadingSessions(false);
        }
      }
    };

    loadSessions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    let ignore = false;

    const loadMessages = async () => {
      await Promise.resolve();
      if (ignore) return;
      setIsLoadingMessages(true);
      try {
        const res = await API.get(`ai/sessions/${activeSessionId}/messages/`);
        if (!ignore) {
          setMessages(res.data);
        }
      } catch {
        if (!ignore) {
          toast.error('خطا در بارگذاری پیام‌ها');
        }
      } finally {
        if (!ignore) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleCreateSession = async () => {
    try {
      const res = await API.post('ai/sessions/', { title: 'گفتگوی جدید' });
      setSessions((prev) => [res.data, ...prev]);
      setActiveSessionId(res.data.id);
    } catch {
      toast.error('خطا در ایجاد گفتگوی تازه');
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این گفتگو اطمینان دارید؟')) return;

    try {
      await API.delete(`ai/sessions/${sessionId}/`);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        const nextId = updated.length > 0 ? updated[0].id : null;
        setActiveSessionId(nextId);
        if (!nextId) {
          setMessages([]);
        }
      }
      toast.info('گفتگو حذف شد');
    } catch {
      toast.error('خطا در حذف گفتگو');
    }
  };

  const handleSendMessage = useCallback(async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    let targetSessionId = activeSessionId;

    if (!targetSessionId) {
      try {
        const res = await API.post('ai/sessions/', { title: text.slice(0, 30) });
        setSessions((prev) => [res.data, ...prev]);
        targetSessionId = res.data.id;
        setActiveSessionId(targetSessionId);
      } catch {
        toast.error('ایجاد نشست گفتگو ناموفق بود');
        return;
      }
    }

    // اضافه کردن موقت پیام کاربر در UI
    const tempId = Date.now();
    const tempIso = new Date().toISOString();
    const tempUserMsg = {
      id: tempId,
      role: 'user',
      content: text,
      created_at: tempIso,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await API.post(`ai/sessions/${targetSessionId}/send/`, {
        content: text,
      });

      // جایگزینی پیام‌ها با داده‌های ذخیره‌شده از سرور
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.data.user_message,
        res.data.assistant_message,
      ]);

      // به‌روزرسانی عنوان نشست در لیست
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId && s.title === 'گفتگوی جدید'
            ? { ...s, title: text.slice(0, 30) }
            : s
        )
      );
    } catch {
      toast.error('ارسال پیام با خطا مواجه شد');
    } finally {
      setIsSending(false);
    }
  }, [activeSessionId, inputText, isSending]);

  return (
    <div className="ai-layout" dir="rtl">
      {/* سایدبار تاریخچه چت‌ها */}
      <aside className="ai-sidebar">
        <button
          type="button"
          className="ai-new-btn"
          onClick={handleCreateSession}
        >
          <span>➕</span>
          <span>گفتگوی جدید</span>
        </button>

        <div className="ai-sessions-list">
          {isLoadingSessions ? (
            <div className="ai-muted-text">در حال دریافت تاریخچه...</div>
          ) : sessions.length === 0 ? (
            <div className="ai-muted-text">گفتگویی یافت نشد.</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`ai-session-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <span className="ai-session-title">{s.title}</span>
                <button
                  type="button"
                  className="ai-delete-session-btn"
                  title="حذف گفتگو"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* بخش اصلی پنجره چت */}
      <main className="ai-chat-area">
        {/* نوار هشدار بالینی و سلب مسئولیت */}
        <div className="ai-disclaimer-banner">
          ⚠️ <strong>یادآوری مهم:</strong> این دستیار مبتنی بر هوش مصنوعی بوده و صرفاً نقش راهنما و تحلیل‌گر کمکی پرونده را دارد. پیشنهادات ارائه شده جایگزین تشخیص و دستورات پزشک معالج نیست.
        </div>

        <div className="ai-messages-container">
          {isLoadingMessages ? (
            <div className="ai-loading-state">در حال بارگذاری پیام‌ها...</div>
          ) : messages.length === 0 ? (
            <div className="ai-empty-chat">
              <div className="ai-welcome-badge">🤖 دستیار هوشمند سلامت‌یار</div>
              <h2>چطور می‌توانم به تحلیل پرونده سلامت شما کمک کنم؟</h2>
              <p>یکی از گزینه‌های پیشنهادی زیر را انتخاب کنید یا سوال خود را بنویسید:</p>

              <div className="ai-quick-prompts">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-quick-btn"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`ai-msg-row ${m.role === 'user' ? 'msg-user' : 'msg-ai'}`}
              >
                <div className="ai-avatar">
                  {m.role === 'user' ? '👤' : '🩺'}
                </div>
                <div className="ai-bubble">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="ai-msg-row msg-ai">
              <div className="ai-avatar">🩺</div>
              <div className="ai-bubble ai-typing-indicator">
                <span>دستیار در حال بررسی سوابق و پاسخ‌گویی است...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* فیلد ورودی پیام */}
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="ai-input"
            placeholder="پرسش خود را بنویسید (مثلاً: وضعیت قند خون من در آخرین آزمایش چطور بود؟)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
          />
          <button
            type="submit"
            className="ai-send-btn"
            disabled={isSending || !inputText.trim()}
          >
            {isSending ? '...' : 'ارسال'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default AiHealthAdvisor;