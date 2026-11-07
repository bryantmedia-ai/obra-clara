"use client";
import {MobileNavigationProvider,MobileMenuButton,MobileMenuClose} from "./mobile-navigation";
import {SupplierDirectory} from "./supplier-directory";
import {PurchaseTabs} from "./workspace-ui";
import {NotificationCenter} from "./notification-center";
import {CompanySettings} from "./company-settings";
import {ProductQuotes} from "./product-quotes";
import {HackaTwinLanding} from './hackatwin-landing';

import Link from "next/link";
import {ProviderApp} from "./provider-app";
import {RoleSelector,SharedSync,switchApp} from "./shared-demo";
import {BuyerOverview} from "./buyer-overview";
import {FujiEscrowBoard} from "./fuji-escrow-desk";
import {PurchasesWorkspace} from './purchases-workspace';
import {SharedOrders} from "./shared-orders";
import {BrickPage,BrickPopupHost} from "./brick-chat";
import {openBrick} from "./brick-store";
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
  faChartLine,
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
  ["dashboard", "Resumen", faChartLine],
  ["fondos", "Fondos", faWallet],
  ["compras", "Compras", faListCheck],
  ["proyectos", "Proyectos", faBuilding],
  ["proveedores", "Proveedores", faUsers],
  ["marketplace", "Marketplace", faStore],
] as const;

const orders = [
  { id: "OC-1042", project: "Torre Núñez", supplier: "Corralón Norte", item: "Cemento CPC40", total: "1.000.000 ARGt", state: "Entrega parcial", tone: "warn" },
  { id: "OC-1041", project: "Pilar Offices", supplier: "Aceros Delta", item: "Hierro del 8", total: "2.480.000 ARGt", state: "En tránsito", tone: "info" },
  { id: "OC-1039", project: "Torre Núñez", supplier: "Maderas Centro", item: "Fenólicos 18 mm", total: "875.000 ARGt", state: "Por aprobar", tone: "neutral" },
];

const routeTitles: Record<string, [string, string]> = {
  marketplace: ["Marketplace", "Materiales, proveedores y entregas para tu obra"],
  carrito: ["Carrito", "Compra de materiales"],
  proyectos: ["Proyectos", "Obras y destinos de entrega"],
  "mi-tienda": ["Mi tienda", "Cuenta proveedor"],
  dashboard: ["Resumen", "Operación de Constructora Madero SA"],
  compras: ["Compras", "Órdenes planificadas y urgentes"],
  "compras/cotizaciones": ["Compras", "Cotizaciones"],
  "compras/entregas": ["Compras", "Entregas"],
  "compras/inventario": ["Compras", "Inventario"],
  "compras/proyectos": ["Compras", "Proyectos"],
  "compras/nueva": ["Marketplace", "Creá una necesidad y compará soluciones"],
  "compras/oc-1042": ["Orden OC-1042", "Cemento para Torre Núñez"],
  entregas: ["Entregas", "Agenda y estado de recepciones"],
  "entregas/oc-1042": ["Confirmar entrega", "Orden OC-1042 · Torre Núñez"],
  inventario: ["Inventario", "Stock disponible entre obras y depósitos"],
  proveedores: ["Proveedores", "Red, precios y cumplimiento"],
  "proveedores/corralon-norte": ["Corralón Norte", "Ficha del proveedor"],
  fondos: ["Fondos", "Belo, ARGt y contratos activos"],
  agente: ["Brick", "Copiloto de compras y conciliación"],
  configuracion: ["Configuración", "Empresa, usuarios y reglas"],
  "hackatwin": ["Hacka Twin", "Obra Clara"],
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
  const icon = route==="transporte"?faTruckFast:nav.find(([href]) => href === section)?.[2] ?? (section === "agente" ? faRobot : section === "transporte" ? faTruckFast : section === "mi-tienda" ? faStore : section === "carrito" ? faCartShopping : section === "hackatwin" ? faShieldHalved : section === "configuracion" ? faGear : faHouse);
  return (
    <header className="topbar"><MobileMenuButton/>
      <div className="page-heading">
        <span className="page-heading-icon" aria-hidden="true"><Icon icon={icon} /></span>
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        <CartPopup key={route}/>
        <NotificationCenter/>
        <button className="icon-button agent-shortcut" type="button" onClick={onOpenAgent} aria-label="Abrir Brick" title="Brick"><Icon icon={faRobot} /></button>
      </div>
    </header>
  );
}

function Sidebar({ route }: { route: Route }) {
  const section = route.startsWith("productos/")||route==="transporte"?"marketplace":["entregas","inventario"].includes(route)?"compras":route.split("/")[0];
  return (
    <aside className="sidebar" id="main-navigation"><MobileMenuClose/>
      <Link href="/" className="brand brand-approved" aria-label="Obra Clara"><span className="approved-logo-crop" aria-hidden="true"><img className="approved-isotype" src="/brand/obra-clara-isotype-official.png" alt=""/><span className="approved-wordmark"><img src="/brand/obra-clara-brand-sample.png" alt=""/></span></span></Link>
      <RoleSelector/>
      <nav aria-label="Menú principal">
        {nav.map(([href, label, icon]) => (
          <Link key={href} href={href === "dashboard" ? "/dashboard" : `/${href}`} className={`${section === href ? "active" : ""} ${href === "marketplace" ? "marketplace-nav-link" : ""}`}>
            <Icon icon={icon} /> {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-agent"><Link href="/agente" className={section==="agente"?"active":""}><Icon icon={faRobot}/> Chats</Link></div>
      <div className="sidebar-foot">
        <div className="sidebar-info-links">
          <Link href="/hackatwin" className={`about-nav-link ${section === "hackatwin" ? "active" : ""}`} aria-current={section === "hackatwin" ? "page" : undefined}><Icon icon={faShieldHalved}/> Hacka Twin</Link>
        </div>
        <Link href="/configuracion" className="profile" aria-label="Perfil de José, contratista"><span>J</span><div><strong>José</strong><small>Contratista</small></div><Icon icon={faGear} /></Link>
      </div>
    </aside>
  );
}

function Agent(){return <BrickPage/>;}

function Settings(){return <CompanySettings/>;}

function ProviderGateway(){return <section className="panel"><h2>Tu cuenta proveedora</h2><p>Administrá productos, stock y órdenes en la app de proveedores.</p><button className="button primary" onClick={()=>void switchApp("provider")}>Abrir cuenta proveedora →</button></section>;}


function Page({ route }: { route: Route }) {
  if (route === "mi-tienda") return <ProviderGateway/>;
  if (route.startsWith("productos/")) return <ProductDetail id={route.slice(10)}/>;
  if (route === "proyectos") return <ProjectsPage/>;
  if (route === "carrito") return <CartPage/>;
  if (route === "hackatwin") return <HackaTwinLanding/>;
  if (route === "marketplace") return <CementMarketplace/>;
  if (route === "dashboard") return <BuyerOverview/>;
  if (route === "compras/cotizaciones") return <div className="purchases-workspace"><PurchaseTabs active="quotes"/><ProductQuotes/></div>;
  if (route === "compras") return <div className="purchases-workspace"><FujiEscrowBoard role="Compras"/><PurchasesWorkspace key="orders"/></div>;
  if (route.startsWith("recepcion/")) return <FujiEscrowBoard role="Compras" focus={decodeURIComponent(route.slice("recepcion/".length))}/>;
  if (route === "compras/entregas") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "compras/inventario") return <PurchasesWorkspace key="inventory" tab="inventory"/>;
  if (route === "compras/nueva") return <CementMarketplace/>;
  if (route === "compras/oc-1042") return <PurchasesWorkspace key="orders"/>;
  if (route === "entregas") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "entregas/oc-1042") return <PurchasesWorkspace key="deliveries" tab="deliveries"/>;
  if (route === "inventario") return <PurchasesWorkspace key="inventory" tab="inventory"/>;
  if (route === "proveedores") return <SupplierDirectory/>;
  if (route.startsWith("proveedores/")) return <CementSupplierProfile slug={route.split("/")[1]}/>;
  if (route === "fondos") return <BuyerOverview funds/>;
  if (route === "agente") return <Agent/>;
  if (route === "configuracion") return <Settings/>;
  return <BuyerOverview/>;
}

export function SaasApp({ route }: { route: Route }) {
  const normalized = useMemo(() => route.toLowerCase(), [route]);
  if(process.env.NEXT_PUBLIC_OC_ROLE==="provider")return <MobileNavigationProvider><ProviderApp route={normalized==="dashboard"?"":normalized}/></MobileNavigationProvider>;
  return <MobileNavigationProvider><div className="app-shell"><SharedSync/><Sidebar route={normalized}/><main><Header route={normalized} onOpenAgent={openBrick}/><div className="page-content"><Page route={normalized}/></div></main><BrickPopupHost pageOpen={normalized==="agente"}/></div></MobileNavigationProvider>;
}
