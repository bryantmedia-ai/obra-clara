"use client";
import {ProtectionLanding} from './protection-landing';

import Link from "next/link";
import {ProviderApp} from "./provider-app";
import {RoleSelector,SharedSync,switchApp} from "./shared-demo";
import {BuyerOverview} from "./buyer-overview";
import {PurchasesWorkspace} from './purchases-workspace';
import {SharedOrders} from "./shared-orders";
import {BrickPage,BrickPopupHost} from "./brick-chat";
import {openBrick} from "./brick-store";
import {TransportCatalog} from "./transport-catalog";
import {CartPage} from "./cart-page";
import {CartPopup} from "./cart-popup";
import {ProductDetail} from "./product-detail";
import {useProviders} from "./provider-store";
import {SupplierAccount} from "./supplier-account";
import {ProjectsPage} from "./projects-page";
import {useProjects} from "./project-store";
import {projectReady} from "./project-data";
import {useCart,updateCart} from "./cart-store";
import { CementMarketplace, CementSuppliers, CementSupplierProfile, cementSuppliers } from "./cement-catalog";
import {
  faArrowLeft,
  faArrowRight,
  faBell,
  faBoxesStacked,
  faBuilding,
  faCheck,
  faChevronDown,
  faCircleCheck,
  faCircleQuestion,
  faClock,
  faCopy,
  faDownload,
  faFilePdf,
  faGear,
  faHouse,
  faLink,
  faListCheck,
  faLocationDot,
  faStore,
  faLock,
  faMagnifyingGlass,
  faPaperPlane,
  faPlus,
  faRobot,
  faRotateLeft,
  faShieldHalved,
  faTruck,
  faTruckFast,
  faCartShopping,
  faUser,
  faUsers,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";

type Route = string;

const nav = [
  ["dashboard", "Resumen", faHouse],
  ["fondos", "Fondos", faWallet],
  ["compras", "Compras", faListCheck],
  ["proyectos", "Proyectos", faBuilding],
  ["proveedores", "Proveedores", faUsers],
  ["marketplace", "Marketplace", faStore],
] as const;

const orders = [
  { id: "OC-1042", project: "Torre Núñez", supplier: "Corralón Norte", item: "Cemento CPC40", total: "1.000.000 ARGt", state: "Entrega parcial", tone: "warn" },
  { id: "OC-1041", project: "Pilar Offices", supplier: "Aceros Delta", item: "Hierro del 8", total: "2.480.000 ARGt", state: "En tránsito", tone: "info" },
  { id: "OC-1040", project: "Casa Olivos", supplier: "Sanitarios Norte", item: "Cañería PVC", total: "640.000 ARGt", state: "Completada", tone: "ok" },
  { id: "OC-1039", project: "Torre Núñez", supplier: "Maderas Centro", item: "Fenólicos 18 mm", total: "875.000 ARGt", state: "Por aprobar", tone: "neutral" },
];

const routeTitles: Record<string, [string, string]> = {
  marketplace: ["Marketplace", "Materiales, proveedores y entregas para tu obra"],
  transporte: ["Transporte y entrega", "Logística de obra"],
  carrito: ["Carrito", "Compra y transporte"],
  proyectos: ["Proyectos", "Obras y destinos de entrega"],
  "mi-tienda": ["Mi tienda", "Cuenta proveedor"],
  dashboard: ["Resumen", "Operación de Constructora Madero SA"],
  compras: ["Compras", "Órdenes planificadas y urgentes"],
  "compras/entregas": ["Compras", "Entregas"],
  "compras/inventario": ["Compras", "Inventario"],
  "compras/proyectos": ["Compras", "Proyectos"],
  "compras/nueva": ["Nueva compra", "Creá una necesidad y compará soluciones"],
  "compras/oc-1042": ["Orden OC-1042", "Cemento para Torre Núñez"],
  entregas: ["Entregas", "Agenda y estado de recepciones"],
  "entregas/oc-1042": ["Confirmar entrega", "Orden OC-1042 · Torre Núñez"],
  inventario: ["Inventario", "Stock disponible entre obras y depósitos"],
  proveedores: ["Proveedores", "Red, precios y cumplimiento"],
  "proveedores/corralon-norte": ["Corralón Norte", "Ficha del proveedor"],
  fondos: ["Fondos", "Belo, ARGt y contratos activos"],
  agente: ["Brick", "Copiloto de compras y conciliación"],
  configuracion: ["Configuración", "Empresa, usuarios y reglas"],
  "quienes-somos": ["¿Quiénes somos?", "Obra Clara"],
  "como-funciona": ["¿Cómo funciona?", "Obra Clara"],
};

function Icon({ icon }: { icon: typeof faHouse }) {
  return <FontAwesomeIcon icon={icon} />;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Header({ route, onOpenAgent }: { route: Route; onOpenAgent:()=>void }) {
  const providers=useProviders();
  const supplier = providers.find(s => route === `proveedores/${s.slug}`);
  const title = supplier?.name ?? routeTitles[route]?.[0] ?? (route.startsWith("productos/")?"Producto":"Obra Clara");
  const section = route.startsWith("productos/")||route==="transporte"?"marketplace":["entregas","inventario"].includes(route)?"compras":route.split("/")[0];
  const icon = route==="transporte"?faTruckFast:nav.find(([href]) => href === section)?.[2] ?? (section === "agente" ? faRobot : section === "transporte" ? faTruckFast : section === "mi-tienda" ? faStore : section === "carrito" ? faCartShopping : section === "quienes-somos" ? faUsers : section === "como-funciona" ? faCircleQuestion : section === "configuracion" ? faGear : faHouse);
  return (
    <header className="topbar">
      <div className="page-heading">
        <span className="page-heading-icon" aria-hidden="true"><Icon icon={icon} /></span>
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        <CartPopup key={route}/>
        <button className="icon-button" aria-label="Notificaciones"><Icon icon={faBell} /></button>
        <button className="icon-button agent-shortcut" type="button" onClick={onOpenAgent} aria-label="Abrir Brick" title="Brick"><Icon icon={faRobot} /></button>
      </div>
    </header>
  );
}

function Sidebar({ route }: { route: Route }) {
  const section = route.startsWith("productos/")||route==="transporte"?"marketplace":["entregas","inventario"].includes(route)?"compras":route.split("/")[0];
  return (
    <aside className="sidebar">
      <Link href="/" className="brand brand-approved" aria-label="Obra Clara"><span className="approved-logo-crop" aria-hidden="true"><img className="approved-isotype" src="/brand/obra-clara-isotype-official.png" alt=""/><span className="approved-wordmark"><img src="/brand/obra-clara-brand-sample.png" alt=""/></span></span></Link>
      <RoleSelector/>
      <nav aria-label="Menú principal">
        {nav.map(([href, label, icon]) => (
          <Link key={href} href={href === "dashboard" ? "/dashboard" : `/${href}`} className={`${section === href ? "active" : ""} ${href === "marketplace" ? "marketplace-nav-link" : ""}`}>
            <Icon icon={icon} /> {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-agent"><Link href="/agente" className={section==="agente"?"active":""}><Icon icon={faRobot}/> Brick</Link></div>
      <div className="sidebar-foot">
        <div className="sidebar-info-links">
          <Link href="/quienes-somos" className={`about-nav-link ${section === "quienes-somos" ? "active" : ""}`} aria-current={section === "quienes-somos" ? "page" : undefined}><Icon icon={faUsers}/> ¿Quiénes somos?</Link>
          <Link href="/como-funciona" className={`about-nav-link ${section === "como-funciona" ? "active" : ""}`} aria-current={section === "como-funciona" ? "page" : undefined}><Icon icon={faCircleQuestion}/> ¿Cómo funciona?</Link>
        </div>
        <Link href="/configuracion" className="profile"><span>JM</span><div><strong>Jazmín M.</strong><small>Administración</small></div><Icon icon={faGear} /></Link>
      </div>
    </aside>
  );
}

function Agent(){return <BrickPage/>;}

function Settings() { return <section className="settings-grid"><aside className="panel"><button className="active">Empresa</button><button>Usuarios y roles</button><button>Aprobaciones</button><button>Integraciones</button><button>Notificaciones</button></aside><article className="panel settings-form"><p className="eyebrow">Perfil empresarial</p><h2>Constructora Madero SA</h2><div className="form-grid"><label>Razón social<div className="input">Constructora Madero SA</div></label><label>CUIT<div className="input">30-71234567-9</div></label><label>Industria<div className="input">Construcción</div></label><label>Moneda principal<div className="input">ARGt · Peso argentino digital</div></label></div><h3>Integraciones de cuenta</h3><div className="integration"><div className="belo-status"><i/><span><strong>Belo</strong><small>Cuenta empresa sin vincular</small></span></div><Badge tone="neutral">Pendiente</Badge></div><button className="button primary">Guardar cambios</button></article></section> }

function AboutUs() {
  return <div className="about-page"><section className="about-intro"><div><h2>Construimos claridad.<br/><span>Para que vos construyas más.</span></h2><p>Obra Clara nace para proteger el dinero de las obras: reservarlo en un smart contract, liberarlo contra la entrega conformada y devolver el saldo que corresponde cuando no se cumple. Conectamos a constructoras y proveedores alrededor de reglas claras para cobrar y pagar.</p><Link className="button primary" href="/marketplace">Explorar el marketplace <Icon icon={faArrowRight}/></Link></div><aside className="about-promise"><Icon icon={faBuilding}/><strong>Una obra conectada,<br/>de principio a fin.</strong><p>Compras · Logística · Inventario · Pagos</p></aside></section><section className="about-story panel"><h2>Nacemos de un problema de obra real</h2><p>Materiales que faltan a último momento, pedidos repartidos entre mensajes, entregas parciales y administración sin visibilidad de lo que llegó. Cuando esa información está desconectada, la obra pierde tiempo.</p><p>Queremos reunir a quienes compran, proveen y reciben los materiales en un flujo compartido: desde la necesidad inicial hasta la recepción y la conciliación del pago.</p></section><section className="three-col about-pillars"><article className="panel"><Icon icon={faListCheck}/><h3>Todo lo que necesitás</h3><p>Un marketplace para abastecer cada etapa de la obra: corralón, ferretería, electricidad, herramientas y equipamiento.</p></article><article className="panel"><Icon icon={faTruck}/><h3>Cada entrega, visible</h3><p>Pedidos, responsables, cantidades recibidas y documentación reunidos para que todos trabajen con la misma información.</p></article><article className="panel"><Icon icon={faShieldHalved}/><h3>Reglas claras para pagar</h3><p>Diseñamos pagos en ARGt con reservas de fondos, liberaciones por entrega y devolución del saldo según las condiciones pactadas.</p></article></section><section className="about-technology panel"><div><Icon icon={faRobot}/><h2>Tecnología al servicio de la obra</h2><p>El agente OC está pensado para ayudarte a encontrar productos, preparar compras y seguir entregas. Belo y ARGt forman parte de la integración financiera prevista para conectar las operaciones con sus pagos.</p></div></section><section className="about-closing"><h2>Menos incertidumbre. <span>Más obra.</span></h2><p>Ese es el futuro que estamos construyendo con Obra Clara.</p><Link href="/marketplace" className="button primary">Conocer los productos <Icon icon={faArrowRight}/></Link></section></div>;
}

function ProviderGateway(){return <section className="panel"><h2>Tu cuenta proveedora</h2><p>Administrá productos, stock y órdenes en la app de proveedores.</p><button className="button primary" onClick={()=>void switchApp("provider")}>Abrir cuenta proveedora →</button></section>;}


function Page({ route }: { route: Route }) {
  if (route === "mi-tienda") return <ProviderGateway/>;
  if (route.startsWith("productos/")) return <ProductDetail id={route.slice(10)}/>;
  if (route === "proyectos") return <ProjectsPage/>;
  if (route === "transporte") return <TransportCatalog/>;
  if (route === "carrito") return <CartPage/>;
  if (route === "como-funciona") return <ProtectionLanding/>;
  if (route === "quienes-somos") return <AboutUs/>;
  if (route === "marketplace") return <CementMarketplace/>;
  if (route === "dashboard") return <BuyerOverview/>;
  if (route === "compras") return <PurchasesWorkspace key="orders"/>;
  if (route === "compras/entregas") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "compras/inventario") return <PurchasesWorkspace key="inventory" tab="inventory"/>;
  if (route === "compras/nueva") return <CementMarketplace/>;
  if (route === "compras/oc-1042") return <PurchasesWorkspace key="orders"/>;
  if (route === "entregas") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "entregas/oc-1042") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "inventario") return <PurchasesWorkspace key="inventory" tab="inventory"/>;
  if (route === "proveedores") return <CementSuppliers/>;
  if (route.startsWith("proveedores/")) return <CementSupplierProfile slug={route.split("/")[1]}/>;
  if (route === "fondos") return <BuyerOverview funds/>;
  if (route === "agente") return <Agent/>;
  if (route === "configuracion") return <Settings/>;
  return <BuyerOverview/>;
}

export function SaasApp({ route }: { route: Route }) {
  const normalized = useMemo(() => route.toLowerCase(), [route]);
  if(process.env.NEXT_PUBLIC_OC_ROLE==="provider")return <ProviderApp route={normalized==="dashboard"?"":normalized}/>;
  return <div className="app-shell"><SharedSync/><Sidebar route={normalized}/><main><Header route={normalized} onOpenAgent={openBrick}/><div className="page-content"><Page route={normalized}/></div></main><BrickPopupHost pageOpen={normalized==="agente"}/></div>;
}
