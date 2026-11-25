// src/components/Modal.jsx
// Pop-up form window, same look as the "New resume" window on the Resume page.
// Closes with the Close/Cancel buttons or the Esc key.
import { useEffect, useRef } from "react";
import "../css-styling/Modal.css";

export default function Modal({ title, titleId, onClose, onSubmit, footer, busy = false, children }) {
  const bodyRef = useRef(null);

  // Put the cursor in the first field when it opens
  useEffect(() => {
    bodyRef.current?.querySelector("input, select, textarea")?.focus();
  }, []);

  // Esc closes (not while saving, and not when Esc was used to close a dropdown)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  // Stop the page behind it from scrolling
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="modal-overlay">
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={onSubmit}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
        <div className="modal__body" ref={bodyRef}>
          {children}
        </div>
        <div className="modal__foot">{footer}</div>
      </form>
    </div>
  );
}
