import { useState, useRef, useEffect, useMemo } from 'react';
import './NotificationBell.css';

const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** Bell trigger icon shown when notifications exist. */
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 9.5a6 6 0 1 0-12 0c0 5-2.2 6.2-2.2 6.2h16.4S18 14.5 18 9.5z" />
    <path d="M10 19.3a2.2 2.2 0 0 0 4 0" />
  </svg>
);

/** Empty-state icon rendered when no notifications remain. */
const BellOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.2 5.3A6 6 0 0 1 18 9.5c0 4 1.4 5.4 1.9 5.9" />
    <path d="M6.3 7.7A9.8 9.8 0 0 1 6 9.5c0 5-2.2 6.2-2.2 6.2h13" />
    <path d="M10 19.3a2.2 2.2 0 0 0 4 0" />
    <path d="M3.5 3l17 17" />
  </svg>
);

/** Category icon for access-request notifications. */
const RequestsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8.5" cy="8" r="3.2" />
    <path d="M3.2 19.5v-1A4.6 4.6 0 0 1 7.8 14h1.4a4.6 4.6 0 0 1 4.6 4.5v1" />
    <path d="M15.5 4.5a3.2 3.2 0 0 1 0 6.4" />
    <path d="M17.8 14.2a4.6 4.6 0 0 1 3 4.3v1" />
  </svg>
);

/** Category icon for pending-test notifications. */
const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3h4" />
    <path d="M10 3v6l-4.7 8.2A2.4 2.4 0 0 0 7.3 21h9.4a2.4 2.4 0 0 0 2-3.8L14 9V3" />
    <path d="M8.5 15h7" />
  </svg>
);

/**
 * Describes a date relative to today for notification rows:
 * 'امروز', 'دیروز', or a full Persian calendar date for older items.
 *
 * @param {string} dateString - ISO-ish datetime string.
 * @returns {string} Relative label; '' when invalid or absent.
 */
const describeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);
  if (diffDays <= 0) return 'امروز';
  if (diffDays === 1) return 'دیروز';
  return new Intl.DateTimeFormat('fa-IR').format(date);
};

/** Tab definitions for the notification panel filter bar. */
const TABS = [
  { key: 'all', label: 'همه' },
  { key: 'requests', label: 'درخواست‌ها' },
  { key: 'tests', label: 'آزمایش‌ها' },
];

/**
 * Notification center aggregating pending access requests and tests
 * already available in dashboard state — no extra polling.
 *
 * Features tabbed filtering (all / requests / tests), a live unread badge
 * backed by dismissable read-keys, per-item approve/reject callbacks and
 * mark-all-as-read dismissal. Clicks outside or Escape close the dialog.
 *
 * @param {{pendingTests?: Array<object>, accessRequests?: Array<object>,
 *          onReviewTest?: Function, onRespondAccess?: Function}} props - Component props.
 * @param {Array<object>} [props.pendingTests] - Tests awaiting review.
 * @param {Array<object>} [props.accessRequests] - Access requests awaiting approval.
 * @param {Function} [props.onReviewTest] - Handler receiving (testId, 'approve'|'reject').
 * @param {Function} [props.onRespondAccess] - Handler receiving (requestId, 'approve'|'reject').
 * @returns {JSX.Element} Bell trigger plus conditional notification panel.
 */
const NotificationBell = ({
  pendingTests = [],
  accessRequests = [],
  onReviewTest,
  onRespondAccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [readKeys, setReadKeys] = useState(() => new Set());
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Aggregate notifications from existing dashboard state.
  const notifications = useMemo(() => {
    const items = [];

    accessRequests.forEach((req) => {
      items.push({
        key: `req-${req.id}`,
        category: 'requests',
        title: 'درخواست دسترسی جدید',
        description: `${req.requester_name} درخواست دسترسی به نتایج آزمایش‌های شما را دارد.`,
        timeLabel: '',
        actions: [
          { label: 'تایید', tone: 'approve', handler: () => onRespondAccess?.(req.id, 'approve') },
          { label: 'رد', tone: 'reject', handler: () => onRespondAccess?.(req.id, 'reject') },
        ],
      });
    });

    pendingTests.forEach((test) => {
      items.push({
        key: `test-${test.id}`,
        category: 'tests',
        title: 'آزمایش در انتظار تایید',
        description: `${test.test_type_name} با نتیجه ${test.result_value ?? test.result_text ?? '—'} — ثبت‌کننده: ${test.creator_name || 'نامشخص'}`,
        timeLabel: describeDate(test.test_date),
        actions: [
          { label: 'تایید', tone: 'approve', handler: () => onReviewTest?.(test.id, 'approve') },
          { label: 'رد', tone: 'reject', handler: () => onReviewTest?.(test.id, 'reject') },
        ],
      });
    });

    return items;
  }, [accessRequests, pendingTests, onRespondAccess, onReviewTest]);

  const unreadCount = notifications.filter((n) => !readKeys.has(n.key)).length;
  const visibleNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter((n) => n.category === activeTab);

  const tabCounts = useMemo(() => ({
    all: notifications.length,
    requests: notifications.filter((n) => n.category === 'requests').length,
    tests: notifications.filter((n) => n.category === 'tests').length,
  }), [notifications]);

  const markAllRead = () => {
    setReadKeys(new Set(notifications.map((n) => n.key)));
  };

  const markRead = (key) => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="nb" ref={rootRef}>
      <button
        type="button"
        className={`nb-trigger ${unreadCount > 0 ? 'nb-has-unread' : ''}`}
        onClick={() => setIsOpen((s) => !s)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`مرکز اعلانات${unreadCount > 0 ? `، ${toFaDigits(unreadCount)} اعلان خوانده نشده` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="nb-badge">{toFaDigits(unreadCount)}</span>
        )}
      </button>

      {isOpen && (
        <div className="nb-panel" role="dialog" aria-label="مرکز اعلانات">
          <div className="nb-head">
            <strong>مرکز اعلانات</strong>
            {unreadCount > 0 && (
              <span className="nb-count-pill">{toFaDigits(unreadCount)} جدید</span>
            )}
            <button
              type="button"
              className="nb-mark-all"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              علامت‌گذاری همه به عنوان خوانده‌شده
            </button>
          </div>

          <div className="nb-tabs" role="tablist" aria-label="دسته‌بندی اعلان‌ها">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`nb-tab ${activeTab === tab.key ? 'nb-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="nb-tab-count">{toFaDigits(tabCounts[tab.key])}</span>
              </button>
            ))}
          </div>

          <ul className="nb-list">
            {visibleNotifications.length === 0 ? (
              <li className="nb-empty">
                <BellOffIcon />
                هیچ اعلان جدیدی ندارید
              </li>
            ) : (
              visibleNotifications.map((item) => {
                const isRead = readKeys.has(item.key);
                return (
                  <li key={item.key} className={`nb-item ${isRead ? 'nb-item-read' : ''}`}>
                    <span className={`nb-cat-icon nb-cat-${item.category}`} aria-hidden="true">
                      {item.category === 'requests' ? <RequestsIcon /> : <FlaskIcon />}
                    </span>
                    <div className="nb-body">
                      <div className="nb-title-row">
                        <strong>{item.title}</strong>
                        {!isRead && <span className="nb-unread-dot" title="خوانده نشده" />}
                      </div>
                      <p>{item.description}</p>
                      {item.timeLabel && <span className="nb-time">{item.timeLabel}</span>}
                    </div>
                    <div className="nb-actions">
                      {item.actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className={`nb-action nb-action-${action.tone}`}
                          onClick={() => {
                            markRead(item.key);
                            action.handler();
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
