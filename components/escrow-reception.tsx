"use client";

import {useEffect, useRef, useState, type PointerEvent} from "react";
import type {SharedOrder} from "../lib/demo-model";

export type ReceptionEvidence = {name: string; quantity: number; signature: string};

export function EscrowReception({order, onConfirm, ready, connect, autoOpen, walletNotice}: {
  order: SharedOrder;
  onConfirm: (evidence: ReceptionEvidence) => void;
  ready: boolean;
  autoOpen?: boolean;
  connect?: () => void;
  walletNotice?: string;
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
  const validQuantity = quantity !== "" && Number.isInteger(units) && units >= 0 && units <= ordered;
  const symbol = order.escrow?.symbol;
  const sellerAmount = Number(order.escrow?.wholeTokens) * units / ordered;
  const refund = Number(order.escrow?.wholeTokens) - sellerAmount;
  const format = (value: number) => new Intl.NumberFormat("es-AR", {maximumFractionDigits: 2}).format(value) + " " + symbol;
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - bounds.left) * 480 / bounds.width, (event.clientY - bounds.top) * 144 / bounds.height] as const;
  }
  return <>
    <button className="button primary" onClick={() => dialog.current?.showModal()}>Registrar recepción</button>
    <dialog ref={dialog} className="oc-receipt-dialog" aria-labelledby="oc-receipt-title">
      <form onSubmit={event => {
        event.preventDefault();
        if (!ready || !signed || !canvas.current || name.trim().split(/\s+/).length < 2) return;
        if (quantity === "" || !Number.isInteger(units) || units < 0 || units > ordered) return;
        onConfirm({name: name.trim(), quantity: units, signature: canvas.current.toDataURL("image/png")});
        dialog.current?.close();
      }}>
        <header><span className="fn-eyebrow">{order.project.name}</span>
        <h2 id="oc-receipt-title">Confirmá la recepción</h2>
        <p>{ordered} bolsas pedidas · {order.supplier}</p></header>
        <div className="oc-receipt-fields">
        <label>Nombre y apellido<input required maxLength={100} value={name} onChange={event => setName(event.target.value)}/></label>
        <label>Bolsas recibidas<input required type="number" min={0} max={ordered} step={1} value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
        </div>
        {validQuantity && <dl className="oc-receipt-split"><div><dt>Pago al proveedor</dt><dd>{format(sellerAmount)}</dd></div><div><dt>Devolución al comprador</dt><dd>{format(refund)}</dd></div></dl>}
        <div className="oc-receipt-signature"><label id="escrow-signature">Firma en el remito</label>
        <canvas ref={canvas} width={480} height={144} aria-labelledby="escrow-signature"
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
        <button type="button" className="button secondary" onClick={() => {canvas.current?.getContext("2d")?.clearRect(0, 0, 480, 144); setSigned(false);}}>Borrar firma</button></div>
        {walletNotice && <p className="oc-escrow-balance" role="status">{walletNotice}</p>}
        <footer className="oc-escrow-actions"><button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Cerrar</button>
        {connect && <button type="button" className="button secondary" onClick={connect}>Conectar Core</button>}
        <button className="button primary" disabled={!ready || !signed || name.trim().split(/\s+/).length < 2 || quantity === "" || !Number.isInteger(units) || units < 0 || units > ordered}>Confirmar en Core</button></footer>
      </form>
    </dialog>
  </>;
}
