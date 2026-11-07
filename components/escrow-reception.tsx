"use client";

import {useEffect, useRef, useState, type PointerEvent} from "react";
import type {SharedOrder} from "../lib/demo-model";

export type ReceptionEvidence = {name: string; quantity: number; signature: string};

export function EscrowReception({order, onConfirm, ready, connect, autoOpen}: {
  order: SharedOrder;
  onConfirm: (evidence: ReceptionEvidence) => void;
  ready: boolean;
  autoOpen?: boolean;
  connect: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {if (autoOpen && !dialog.current?.open) dialog.current?.showModal();}, [autoOpen]);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const ordered = Number(order.escrow?.quantity);
  const units = Number(quantity);
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - bounds.left) * 480 / bounds.width, (event.clientY - bounds.top) * 144 / bounds.height] as const;
  }
  return <>
    <button className="button primary" onClick={() => dialog.current?.showModal()}>Registrar recepción</button>
    <dialog ref={dialog} style={{width: "min(520px, 94vw)", padding: 24, borderRadius: 16, border: "1px solid #ddd"}}>
      <form onSubmit={event => {
        event.preventDefault();
        if (!ready || !signed || !canvas.current || name.trim().split(/\s+/).length < 2) return;
        if (quantity === "" || !Number.isInteger(units) || units < 0 || units > ordered) return;
        onConfirm({name: name.trim(), quantity: units, signature: canvas.current.toDataURL("image/png")});
        dialog.current?.close();
      }}>
        <h2>Recepción en obra</h2>
        <p>{order.project.name} · {order.id}</p>
        <p>{ordered} × {order.lines[0]?.name}</p>
        <label>Nombre y apellido<input required maxLength={100} value={name} onChange={event => setName(event.target.value)}/></label>
        <label>Bolsas recibidas<input required type="number" min={0} max={ordered} step={1} value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
        <p id="escrow-signature">Firmá el remito en el recuadro</p>
        <canvas ref={canvas} width={480} height={144} aria-labelledby="escrow-signature" style={{width: "100%", border: "1px solid #bbb", background: "#fff", touchAction: "none"}}
          onPointerDown={event => {
            if (drawing.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            const context = event.currentTarget.getContext("2d");
            if (!context) return;
            drawing.current = true;
            context.beginPath();
            context.moveTo(...point(event));
            context.lineWidth = 2;
            context.lineCap = "round";
          }}
          onPointerMove={event => {
            if (!drawing.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const context = event.currentTarget.getContext("2d");
            context?.lineTo(...point(event));
            context?.stroke();
            setSigned(true);
          }}
          onPointerUp={() => {drawing.current = false;}}
          onPointerCancel={() => {drawing.current = false;}}
        />
        <p>Core te va a pedir la firma de la wallet autorizada para liquidar la orden.</p>
        <button type="button" className="button secondary" onClick={() => {canvas.current?.getContext("2d")?.clearRect(0, 0, 480, 144); setSigned(false);}}>Borrar firma</button>
        <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Cerrar</button>
        {!ready && <button type="button" className="button secondary" onClick={connect}>Conectar Core</button>}
        <button className="button primary" disabled={!ready || !signed || name.trim().split(/\s+/).length < 2 || quantity === "" || !Number.isInteger(units) || units < 0 || units > ordered}>Confirmar en Core</button>
      </form>
    </dialog>
  </>;
}
