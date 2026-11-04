import type { Metadata } from "next";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import "./provider-app.css";
import "./catalog.css";
import "./agent-popup.css";
import "./about.css";
import "./alignment.css";
import "./how-it-works.css";
import "./transport.css";
import "./cart-popup.css";
import "./projects.css";
import "./retail-marketplace.css";
import "./navigation.css";
import "./brick.css";
import "./overview.css";
import "./funds.css";
import "./purchases.css";
import "./pricing.css";
import "./supplier-directory.css";
import "./workspace-ui.css";
import "./mobile.css";

export const metadata: Metadata = {
  title: "Obra Clara",
  description: "Compras y pagos programables para la construcción",
  icons: { icon: "/brand/obra-clara-symbol.png", apple: "/brand/obra-clara-symbol.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
