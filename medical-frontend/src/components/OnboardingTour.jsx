import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './OnboardingTour.css';

/* ---------- Geometry helpers ---------- */

/** Overlay padding added around each highlighted step target. */
const PAD = 8;
/** Corner radius of the cutout ring drawn around targets. */
const RADIUS = 14;
/** Fixed popover width used in clamp calculations. */
const POPOVER_WIDTH = 330;
/** Rough popover height estimate for above/below placement decisions. */
const POPOVER_EST_HEIGHT = 205;

/**
 * Builds a closed SVG path for a rounded rectangle using arc commands;
 * radius is clamped so tiny rects still render valid geometry.
 *
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {number} w - Width.
 * @param {number} h - Height.
 * @param {number} r - Requested corner radius.
 * @returns {string} SVG path data string.
 */
const roundedRectPath = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + rr} ${y}`,
    `h ${w - rr * 2}`,
    `a ${rr} ${rr} 0 0 1 ${rr} ${rr}`,
    `v ${h - rr * 2}`,
    `a ${rr} ${rr} 0 0 1 ${-rr} ${rr}`,
    `h ${-(w - rr * 2)}`,
    `a ${rr} ${rr} 0 0 1 ${-rr} ${-rr}`,
    `v ${-(h - rr * 2)}`,
    `a ${rr} ${rr} 0 0 1 ${rr} ${-rr}`,
    'z',
  ].join(' ');
};

/**
 * Lightweight pure-React guided tour with an SVG even-odd cutout overlay.
 * Each step measures its `.selector` element (resized on scroll/resize via
 * rAF throttling), positions the popover below/above depending on available
 * space, and supports keyboard flow: Escape finishes, ←/→ navigate steps in
 * RTL order.
 *
 * @param {{steps?: Array<{selector:string,title:string,description:string}>,
 *          active?: boolean, onFinish?: Function}} props - Tour configuration.
 * @param {Array<{selector:string,title:string,description:string}>} [props.steps] - Ordered tour steps.
 * @param {boolean} [props.active] - Whether the tour overlay is shown.
 * @param {Function} [props.onFinish] - Invoked on completion, skip or Escape.
 * @returns {JSX.Element|null} Overlay with ring + popover, or null when inactive.
 */
const OnboardingTour = ({ steps = [], active, onFinish }) => {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const rafRef = useRef(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  /* Measure the target element position */
  useLayoutEffect(() => {
    if (!active) return undefined;

    const measure = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const el = step?.selector ? document.querySelector(step.selector) : null;
      if (!el) {
        setTargetRect(null);
        return;
      }

      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        setTargetRect(null);
        return;
      }

      setTargetRect({
        x: box.left - PAD,
        y: box.top - PAD,
        w: box.width + PAD * 2,
        h: box.height + PAD * 2,
      });
    };

    const scheduleMeasure = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    measure();

    const el = step?.selector ? document.querySelector(step.selector) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(document.documentElement);
      if (el) resizeObserver.observe(el);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
      resizeObserver?.disconnect();
    };
  }, [active, index, step]);

  const goNext = () => {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  };

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  /* Keyboard navigation: Escape closes, Left/Right arrows change steps */
  useEffect(() => {
    if (!active) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onFinish();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goPrev();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  if (!active || !step) return null;

  /* ---------- Popover positioning ---------- */

  const vw = viewport.width;
  const vh = viewport.height;

  let cutoutPath = '';
  let ringGeometry = null;
  if (targetRect) {
    const { x, y, w, h } = targetRect;
    cutoutPath = `${roundedRectPath(0, 0, vw, vh, 0)} ${roundedRectPath(x, y, w, h, RADIUS)}`;
    ringGeometry = { x, y, w, h };
  }

  let popoverStyle;
  if (targetRect) {
    /* Mirrors the CSS width: min(330px, calc(100vw - 24px)) so the JS
       clamp math matches what actually gets rendered on narrow viewports. */
    const popoverWidth = Math.min(POPOVER_WIDTH, vw - 24);
    const fitsBelow = targetRect.y + targetRect.h + POPOVER_EST_HEIGHT + 20 < vh;
    const rawLeft = Math.min(
      Math.max(12, targetRect.x + targetRect.w / 2 - popoverWidth / 2),
      vw - popoverWidth - 12
    );
    popoverStyle = {
      top: fitsBelow ? targetRect.y + targetRect.h + 14 : undefined,
      bottom: fitsBelow ? undefined : vh - targetRect.y + 14,
      left: Math.max(12, rawLeft),
    };
  } else {
    popoverStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return createPortal(
    <div className="ot" role="dialog" aria-modal="true" aria-label="راهنمای تعاملی سلامت‌یار">
      <svg className="ot-overlay" width={vw} height={vh}>
        <path
          d={`${cutoutPath} Z`}
          fillRule="evenodd"
          className="ot-scrim"
        />
        {ringGeometry && (
          <rect
            x={ringGeometry.x}
            y={ringGeometry.y}
            width={ringGeometry.w}
            height={ringGeometry.h}
            rx={RADIUS}
            className="ot-ring"
          />
        )}
      </svg>

      <div className="ot-popover" style={popoverStyle}>
        <header className="ot-pop-head">
          <span className="ot-step-chip">گام {toFa(index + 1)} از {toFa(steps.length)}</span>
          <button type="button" className="ot-skip" onClick={onFinish}>رد کردن</button>
        </header>

        <h2 className="ot-title">{step.title}</h2>
        <p className="ot-desc">{step.description}</p>

        <footer className="ot-footer">
          <div className="ot-dots" aria-hidden="true">
            {steps.map((_, dotIndex) => (
              <span
                key={dotIndex}
                className={`ot-dot ${dotIndex === index ? 'ot-dot-active' : ''}`}
              />
            ))}
          </div>
          <div className="ot-nav">
            <button type="button" className="ot-prev" onClick={goPrev} disabled={index === 0}>
              قبلی
            </button>
            <button type="button" className={`ot-next ${isLast ? 'ot-next-finish' : ''}`} onClick={goNext} autoFocus>
              {isLast ? 'پایان 🎉' : 'بعدی'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
};

/** Converts Western digits inside any value to Persian digits (step counter). */
const toFa = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export default OnboardingTour;