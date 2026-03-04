import { useState } from 'react';
import type { FormEvent } from 'react';

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  expectedText: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal = ({
  title,
  description,
  confirmLabel,
  expectedText,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const [value, setValue] = useState('');

  const canConfirm = value.trim() === expectedText;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConfirm) {
      return;
    }

    onConfirm();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <p className="modal-confirm-hint">
          Escribe <strong>{expectedText}</strong> para confirmar.
        </p>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            className="input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={expectedText}
            autoFocus
          />

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="button button-danger" disabled={!canConfirm}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
