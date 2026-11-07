import {buyerProfile} from "../lib/buyer-profile";

export function BuyerIdentity({compact = false}: {compact?: boolean}) {
  return <div className={compact ? "buyer-identity is-compact" : "buyer-identity"}>
    <span className="buyer-identity-mark" aria-hidden="true">{buyerProfile.initials}</span>
    <div>
      <strong>{buyerProfile.name}</strong>
      <small>{buyerProfile.role}</small>
      {!compact && <>
        <p>Empresa, CUIT, email y dirección: pendientes. No hay otro dato personal verificado.</p>
        <p>Belo: origen informado de {buyerProfile.beloOriginArs.toLocaleString("es-AR")} ARS. No es saldo del escrow y no prueba control de una wallet Core.</p>
        <p>Wallet firmante: sin asignar. Hay que conectarla aparte. Si falta, este perfil no controla los fondos on-chain.</p>
      </>}
    </div>
  </div>;
}
