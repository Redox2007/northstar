'use client'

import React from 'react'

export type FieldDef = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'number'
  step?: string
}

type ModalProps = {
  title: string
  fields: FieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onSave: () => void
  onClose: () => void
  saving?: boolean
}

export default function Modal({ title, fields, values, onChange, onSave, onClose, saving }: ModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="rowbtwn" style={{ marginBottom: 24 }}>
          <span className="head" style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
          <button className="delx" onClick={onClose} style={{ fontSize: 20 }}>×</button>
        </div>

        {fields.map(f => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input
              className="inp"
              type={f.type ?? 'text'}
              step={f.step}
              placeholder={f.placeholder ?? ''}
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button className="btn" onClick={onSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
