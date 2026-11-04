import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects(){return [{source:"/entregas",destination:"/compras/entregas",permanent:false},{source:"/inventario",destination:"/compras/inventario",permanent:false},{source:"/compras/proyectos",destination:"/proyectos",permanent:false}];},
};

export default nextConfig;
