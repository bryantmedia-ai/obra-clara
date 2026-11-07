"use client";
import {MobileFilters} from "./mobile-filters";

import Link from "next/link";
import {QuoteRequest} from "./quote-request";
import {directPriceIssue,saleMode,priceExpired} from "../lib/pricing-model";
import {priceDate} from "./pricing-ui";
import {useRouter,useSearchParams} from "next/navigation";
import {saleUnits as formatSaleUnits,shortSaleLabel,cartSaleUnits} from "./sale-units";
import {productQuantityState,quantityDraft} from "./product-quantity";
import {productContent,productDimensions} from "./product-facets";
import {marketplaceListings,deliveryRank,productCount} from "./marketplace-model";
import {useProviders,businessTypes,companySizes} from "./provider-store";
import {useSupplierOffers} from "./supplier-offers";
import {productImage} from "./product-images";
import {MarketStorefront} from "./market-storefront";
import {catalogDepartments,departmentMatches} from "./catalog-departments";
import {ProductComparison} from "./product-comparison";
import {addCartProduct,cartProductLineId} from "./cart-store";
import {marketplaceHref,readMarketFilters,defaultMarketFilters,type MarketLocation} from "./catalog-links";
import {SupplierProductIndex} from "./supplier-product-index";
import {FavoriteButton} from "./favorite-button";
import {useFavorites} from "./favorites-store";
import {CatalogGrid} from "./catalog-grid";
import {Suspense,useId,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCartPlus} from "@fortawesome/free-solid-svg-icons/faCartPlus";

export {cementSuppliers,cementProducts} from "./marketplace-data";
import {cementSuppliers,cementProducts,marketplaceProducts,completeMarketplaceCatalog,getSupplierProducts,getMarketplaceCatalog,productCategories,filterMarketplaceProducts,type Product} from "./marketplace-data";

const money = (amount:number)=>`${amount.toLocaleString("es-AR")} ARGt`;

export function ProductCard({product,offerCount=1,compared,compareDisabled,onCompare}:{product:Product;offerCount?:number;compared?:boolean;compareDisabled?:boolean;onCompare?:(id:string)=>void}) {
 const quantityId=useId();
 const [quantity,setQuantity]=useState(String(product.minimumOrder??1));
 const [added,setAdded]=useState<number|null>(null);
 const minimumOrder=product.minimumOrder??1;const unavailable=product.stock<minimumOrder;
 const priceIssue=directPriceIssue(product);const needsQuote=!!priceIssue||unavailable;const [quoteOpen,setQuoteOpen]=useState(false);
 const maxQuantity=needsQuote?9999:Math.min(9999,product.stock);
 const rawSelection=productQuantityState(quantity,maxQuantity);
 const selection={...rawSelection,valid:rawSelection.valid&&rawSelection.quantity>=minimumOrder,message:rawSelection.quantity>0&&rawSelection.quantity<minimumOrder?`Compra mínima: ${minimumOrder}`:rawSelection.message};
 const selectedQuantity=selection.quantity;
 function changeQuantity(value:string){if(quantityDraft(value)){setQuantity(value);setAdded(null);}}
 const format=product.format??`${product.kg} kg`;
 const sale=product.saleLabel??`${product.pack} U`;
 const saleUnits=formatSaleUnits(product.pack,sale,product.unit);
 const presentation=product.unit.replace(/\bunidad(?:es)?\b/gi,"U").replace(/\bbolsas?\b/gi,"B").replace(/\bpaquetes?\b/gi,"P");
 function addToCart(){
  if(!selection.valid||needsQuote)return;
  setQuantity(String(selectedQuantity));
  const count=addCartProduct({id:product.id,priceRevision:product.priceRevision,name:product.name,supplier:product.supplier.name,supplierSlug:product.supplier.slug,minimumOrder,depositPercent:product.depositPercent??0,pickup:`Depósito ${product.supplier.name} · ${product.supplier.address}`,quantity:selectedQuantity,unitPrice:product.price,kg:product.kg,shippingIncluded:product.shippingIncluded,image:product.image,unit:product.unit,saleLabel:sale},{maxQuantity});
  setAdded(count);
 }
 return <article className="product-card cement-card">
  {onCompare&&<label className="retail-compare-checkbox"><input type="checkbox" checked={compared} disabled={compareDisabled} aria-label={`Comparar ${product.name}`} onChange={()=>onCompare(product.id)}/>Comparar</label>}
  <FavoriteButton itemId={`product:${product.id}`} name={product.name}/>
  {offerCount>1&&<Link className="product-vendor-count" href={`/productos/${product.id}#ofertas`}>{offerCount} vendedores · Comparar →</Link>}
  <Link href={`/productos/${product.id}`} className="cement-photo"><img src={productImage(product.image)} alt={product.imageAlt??product.name} loading="lazy" onError={e=>{if(e.currentTarget.getAttribute("src")!=="/products/product-placeholder.svg")e.currentTarget.src="/products/product-placeholder.svg";}}/></Link>
  <div className="product-sale-format" aria-label={`Presentación incluida en el precio: ${format}, ${sale}`}><span className="sale-weight" title={format}>{format}</span><span className="sale-units">{saleUnits}</span></div>
  <div className={`product-shipping ${product.shippingIncluded?"":"shipping-excluded"}`}>{product.shippingIncluded?"Incluye envío":"No incluye envío"}</div>
  <div className="product-body"><Link className="cement-seller" href={`/proveedores/${product.supplier.slug}`}>Vendido por {product.supplier.name} ↗</Link>
   <h3 title={product.name}><Link href={`/productos/${product.id}`}>{product.name}</Link></h3><p className="product-specifications" title={`Modelo / especificación: ${product.model} · ${presentation}`}><span>{presentation}</span></p><small title={product.use}>{product.use}</small>
   <div className="product-rating"><span>★ {product.supplier.score}</span><small>{product.stock} {product.stockUnit??(product.pack>1?"packs":"bolsas")} disponibles</small></div>
   <div className="product-offer-block"><div className="product-price-mode"><span className={"price-status "+(needsQuote?"blue":"green")}>{unavailable?"Consultar stock":saleMode(product)==="quote"?"A cotizar":priceExpired(product)?"Precio vencido":"Compra directa"}</span><small>{needsQuote?"El proveedor confirma precio y disponibilidad":`Vigente hasta ${priceDate(product.priceValidUntil)}`}</small></div>
   <div className="product-price"><strong title={needsQuote?"Solicitar cotización":money(product.price)}>{!needsQuote&&offerCount>1&&<span className="offer-from">Desde</span>}{needsQuote?"Precio a confirmar":<><span className="product-price-value">{product.price.toLocaleString("es-AR")}</span><span className="product-price-currency">ARGt</span></>}</strong>{!needsQuote&&<span className="cement-unit-price">Precio por {shortSaleLabel(sale.replace(/^1 /,""))}</span>}</div></div>
   <span className={`badge ${product.supplier.arrival.startsWith("Hoy")?"ok":"neutral"}`}>{product.supplier.arrival}</span>
   <div className={`product-purchase${needsQuote?" quote-only":""}`}><label htmlFor={quantityId}>{minimumOrder>1?`Cantidad · mínimo ${minimumOrder}`:"Cantidad"}</label><div className="product-purchase-controls">
    <div className="quantity-stepper"><button type="button" aria-label={`Restar cantidad de ${product.name}`} disabled={selectedQuantity<=minimumOrder} onClick={()=>changeQuantity(String(selectedQuantity-1))}>−</button><input id={quantityId} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} aria-invalid={!selection.valid} aria-describedby={`${quantityId}-feedback`} aria-label={`Cantidad de ${product.name}`} value={quantity} onChange={e=>changeQuantity(e.target.value)} onFocus={e=>e.currentTarget.select()} onBlur={()=>{if(!quantity)setQuantity(String(minimumOrder));}}/><button type="button" aria-label={`Sumar cantidad de ${product.name}`} disabled={selectedQuantity>=maxQuantity} onClick={()=>changeQuantity(String(selectedQuantity+1))}>+</button></div>
    <button type="button" className="product-add-cart" disabled={!selection.valid||needsQuote} aria-label={`Agregar ${selectedQuantity} al carrito: ${product.name}`} title="Agregar al carrito" onClick={()=>addToCart()}><FontAwesomeIcon icon={faCartPlus} aria-hidden="true"/><span className="mobile-add-label">Agregar</span></button>
   </div><div id={`${quantityId}-feedback`} className={`product-add-feedback${!selection.valid?" quantity-error":""}`} role="status">{!selection.valid?selection.message:added!==null?<>{added>0?`${added} ${added===1?"presentación agregada":"presentaciones agregadas"}`:"Alcanzaste el stock disponible"} · <Link href="/carrito">Ver carrito</Link></>:needsQuote?<>Precio final sujeto a la cotización del proveedor.</>:<>Total por {cartSaleUnits(selectedQuantity,sale,product.unit)}: <strong>{money(selectedQuantity*product.price)}</strong></>}</div></div>
   <button type="button" className={`button ${needsQuote?"primary":"secondary"} full product-quote-action`} disabled={!selection.valid} onClick={()=>setQuoteOpen(true)}>Solicitar cotización</button>
   {quoteOpen&&<QuoteRequest product={product} quantity={selectedQuantity} onClose={()=>setQuoteOpen(false)}/>}

  </div></article>;
}

export function CementMarketplace(){return <Suspense fallback={<section className="panel" role="status">Cargando productos…</section>}><MarketplaceContent/></Suspense>;}
function MarketplaceContent(){
 const [comparison,setComparison]=useState<string[]>([]);
 const [compareOpen,setCompareOpen]=useState(false);
 const params=useSearchParams();
 const filters=readMarketFilters(params);
 const {categories:selectedCategories,query,supplier,brand,format:size,today,shippingIncludedOnly,sort,favoritesOnly,productType,model,productId,referenceId}=filters;
 const favorites=useFavorites();
 const catalogProducts=useSupplierOffers();
 const providers=useProviders();
 const categories=[...new Set([...productCategories,...catalogProducts.map(p=>p.category??"Corralón")])];
 const favoriteProductIds=favorites.filter(id=>id.startsWith("product:")).map(id=>id.slice(8));
 const favoriteProductCount=productCount(catalogProducts.filter(p=>favoriteProductIds.includes(p.id)));
 const favoriteCount=favoriteProductCount;
 function updateFilters(patch:Partial<MarketLocation>,replace=false){
  const next={...filters,...patch};
  if(replace)window.history.replaceState(null,"",marketplaceHref(next));
  else window.history.pushState(null,"",marketplaceHref(next));
 }
 const setQuery=(value:string)=>updateFilters({query:value},true);
 const setSupplier=(value:string)=>updateFilters({supplier:value});
 const setBrand=(value:string)=>updateFilters({brand:value,model:"",productId:"",referenceId:""});
 const setSize=(value:string)=>updateFilters({format:value});
 const setToday=(value:boolean)=>updateFilters({today:value});
 const setShippingIncludedOnly=(value:boolean)=>updateFilters({shippingIncludedOnly:value});
 const setSort=(value:string)=>updateFilters({sort:value});
 const setFavoritesOnly=(value:boolean)=>updateFilters({favoritesOnly:value});
 const categoryProducts=catalogProducts.filter(p=>(!supplier||p.supplier.slug===supplier)&&departmentMatches(p,filters.department));
 const category=selectedCategories.length?selectedCategories.join(", "):"Todos los productos";
 const showProducts=true;
 const scoped=categoryProducts.filter(p=>(!favoritesOnly||favoriteProductIds.includes(p.id))&&(!selectedCategories.length||selectedCategories.includes(p.category??"Corralón")));
 const brands=[...new Set(scoped.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,"es"));
 const contents=[...new Set(scoped.map(productContent).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 const dimensions=[...new Set(scoped.map(productDimensions).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 const colors=[...new Set(scoped.map(p=>p.color??"").filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 const formats=[...new Set(scoped.map(p=>p.format??`${p.kg} kg`))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 const types=[...new Set(scoped.filter(p=>!brand||p.brand===brand).map(p=>p.productType))].sort((a,b)=>a.localeCompare(b,"es"));
 const models=[...new Set(scoped.filter(p=>(!brand||p.brand===brand)&&(!productType||p.productType===productType)).map(p=>p.model))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 const filtered=filterMarketplaceProducts({...filters,favoriteIds:favoritesOnly?favoriteProductIds:undefined},catalogProducts);
 const listings=marketplaceListings(filtered).sort((a,b)=>sort==="price"?a.offer.price-b.offer.price:sort==="price-desc"?b.offer.price-a.offer.price:deliveryRank(a.offer.supplier.arrival)-deliveryRank(b.offer.supplier.arrival));
 function toggleCategory(c:string){updateFilters({categories:selectedCategories.includes(c)?selectedCategories.filter(item=>item!==c):[...selectedCategories,c],brand:"",format:"",productType:"",model:"",productId:"",referenceId:""});}
 function clearFilters(){window.history.pushState(null,"",marketplaceHref(defaultMarketFilters));}
 return <div className="retail-marketplace">
  <MarketStorefront filters={filters} products={catalogProducts} onFilter={patch=>updateFilters(patch,Object.keys(patch).length===1&&"query" in patch)}/>
  {(query||brand||size||today||shippingIncludedOnly||favoritesOnly||selectedCategories.length>0||filters.purchaseMode||supplier||filters.content||filters.dimensions||filters.color||filters.sellerType||filters.companySize||filters.department||filters.minPrice||filters.maxPrice||productType||model||productId||referenceId||filters.completeCatalog)&&<div className="active-catalog-filters" aria-label="Filtros aplicados">
   {query&&<button onClick={()=>updateFilters({query:""})}>Búsqueda: {query} ×</button>}{brand&&<button onClick={()=>setBrand("")}>{brand} ×</button>}{size&&<button onClick={()=>setSize("")}>{size} ×</button>}{selectedCategories.map(c=><button key={c} onClick={()=>toggleCategory(c)}>{c} ×</button>)}{filters.purchaseMode&&<button onClick={()=>updateFilters({purchaseMode:""})}>{filters.purchaseMode==="direct"?"Compra directa":"Solicitar cotización"} ×</button>}{today&&<button onClick={()=>setToday(false)}>Llega hoy ×</button>}{shippingIncludedOnly&&<button onClick={()=>setShippingIncludedOnly(false)}>Incluye envío ×</button>}{favoritesOnly&&<button onClick={()=>setFavoritesOnly(false)}>Favoritos ×</button>}
   {filters.content&&<button onClick={()=>updateFilters({content:""})}>{filters.content} ×</button>}{filters.dimensions&&<button onClick={()=>updateFilters({dimensions:""})}>{filters.dimensions} ×</button>}{filters.color&&<button onClick={()=>updateFilters({color:""})}>{filters.color} ×</button>}
   {filters.department&&<button onClick={()=>updateFilters({department:"",query:""})}>{catalogDepartments.find(d=>d.id===filters.department)?.name} ×</button>}
   {filters.completeCatalog&&<span>Catálogo de proveedores</span>}
   {supplier&&<button onClick={()=>updateFilters({supplier:""})}>{providers.find(s=>s.slug===supplier)?.name??supplier} ×</button>}
   {productType&&<button onClick={()=>updateFilters({productType:""})}>{productType} ×</button>}
   {model&&<button title={model} onClick={()=>updateFilters({model:""})}>{model} ×</button>}
   {(productId||referenceId)&&<button title={catalogProducts.find(p=>productId?p.id===productId:p.referenceId===referenceId)?.name} onClick={()=>updateFilters({productId:"",referenceId:""})}>{catalogProducts.find(p=>productId?p.id===productId:p.referenceId===referenceId)?.name??"Producto seleccionado"} ×</button>}
   <button onClick={clearFilters}>Limpiar filtros</button>
  </div>}
  <section className="market-layout"><MobileFilters id="mobile-product-filters" label="Filtrar productos"><aside className="market-filters panel"><div><label className="favorites-filter"><input type="checkbox" aria-label="Mostrar solo favoritos" checked={favoritesOnly} onChange={e=>setFavoritesOnly(e.target.checked)}/><span aria-hidden="true">♥</span>Favoritos<span className="filter-count">{favoriteCount}</span></label></div><div><h3>Departamentos</h3><select aria-label="Filtrar departamento" value={filters.department??""} onChange={e=>updateFilters({department:e.target.value,categories:[],query:"",brand:"",productType:"",model:""})}><option value="">Todos los departamentos</option>{catalogDepartments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div><div><h3>Categorías</h3><label><input type="checkbox" checked={!selectedCategories.length} onChange={()=>updateFilters({categories:[],brand:"",format:"",productType:"",model:"",productId:"",referenceId:""})}/>Todas las categorías<span className="filter-count">{productCount(categoryProducts)}</span></label>
   {categories.map(c=><label key={c}><input type="checkbox" checked={selectedCategories.includes(c)} onChange={()=>toggleCategory(c)}/>{c}<span className="filter-count">{productCount(categoryProducts.filter(p=>p.category===c))}</span></label>)}</div>
   {showProducts&&<><div><h3>Modalidad de compra</h3><select aria-label="Modalidad de compra" value={filters.purchaseMode??""} onChange={e=>updateFilters({purchaseMode:e.target.value})}><option value="">Todas las modalidades</option><option value="direct">Compra directa</option><option value="quote">Solicitar cotización</option></select></div><div><h3>Marca</h3><select aria-label="Filtrar marca" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Todas las marcas</option>{brands.map(b=><option key={b}>{b}</option>)}</select></div>
   <div><h3>Precio (ARGt)</h3><div className="retail-price-filter"><label>Desde<input type="number" min="0" value={filters.minPrice??""} onChange={e=>updateFilters({minPrice:e.target.value})}/></label><label>Hasta<input type="number" min="0" value={filters.maxPrice??""} onChange={e=>updateFilters({maxPrice:e.target.value})}/></label></div></div>
   <div><h3>Proveedor</h3><select aria-label="Filtrar proveedor" value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Todos los proveedores</option>{providers.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></div>
   <div><h3>Quién vende</h3><select aria-label="Tipo de vendedor" value={filters.sellerType??""} onChange={e=>updateFilters({sellerType:e.target.value})}><option value="">Todos los vendedores</option>{businessTypes.map(type=><option key={type}>{type}</option>)}</select></div><div><h3>Tamaño de empresa</h3><select aria-label="Tamaño de empresa vendedora" value={filters.companySize??""} onChange={e=>updateFilters({companySize:e.target.value})}><option value="">Todos los tamaños</option>{companySizes.map(size=><option key={size}>{size}</option>)}</select></div>
   <div><h3>Tipo de producto</h3><select aria-label="Filtrar tipo de producto" value={productType} onChange={e=>updateFilters({productType:e.target.value,model:"",productId:"",referenceId:""})}><option value="">Todos los tipos</option>{types.map(type=><option key={type}>{type}</option>)}</select></div>
   <div><h3>Modelo / especificación</h3><select aria-label="Filtrar modelo de producto" value={model} onChange={e=>updateFilters({model:e.target.value,productId:"",referenceId:""})}><option value="">Todos los modelos</option>{models.map(value=><option key={value}>{value}</option>)}</select></div>
   {contents.length>0&&<div><h3>Contenido / medida de venta</h3><select aria-label="Filtrar contenido" value={filters.content??""} onChange={e=>updateFilters({content:e.target.value})}><option value="">Todos los contenidos</option>{contents.map(v=><option key={v}>{v}</option>)}</select></div>}{dimensions.length>0&&<div><h3>Dimensiones</h3><select aria-label="Filtrar dimensiones" value={filters.dimensions??""} onChange={e=>updateFilters({dimensions:e.target.value})}><option value="">Todas las dimensiones</option>{dimensions.map(v=><option key={v}>{v}</option>)}</select></div>}{colors.length>0&&<div><h3>Color</h3><select aria-label="Filtrar color" value={filters.color??""} onChange={e=>updateFilters({color:e.target.value})}><option value="">Todos los colores</option>{colors.map(v=><option key={v}>{v}</option>)}</select></div>}
   <div><h3>Presentación</h3><select aria-label="Filtrar presentación" value={size} onChange={e=>setSize(e.target.value)}><option value="">Todas las presentaciones</option>{formats.map(f=><option key={f}>{f}</option>)}</select></div>
   <div><h3>Entrega</h3><label><input type="checkbox" checked={today} onChange={e=>setToday(e.target.checked)}/>Llega hoy</label><label><input type="checkbox" checked={shippingIncludedOnly} onChange={e=>setShippingIncludedOnly(e.target.checked)}/>Incluye envío</label></div></>}
   <div><h3>Pago protegido</h3><p className="muted">Reservá ARGt y pagá según la entrega confirmada.</p><Link href="/fondos" className="text-link">Ver fondos y pagos →</Link></div><div><button className="button secondary" onClick={clearFilters}>Limpiar filtros</button></div></aside></MobileFilters>
   <div className="market-results" id="cement-results">{showProducts&&<><div className="results-head"><div><p className="eyebrow">{favoritesOnly?`Favoritos · ${category}`:catalogDepartments.find(d=>d.id===filters.department)?.name??category}{supplier&&` · ${providers.find(s=>s.slug===supplier)?.name??supplier}`}</p><h2>{listings.length} {listings.length===1?"producto":"productos"}</h2></div><select aria-label="Ordenar productos" value={sort} onChange={e=>setSort(e.target.value)}><option value="arrival">Entrega más rápida</option><option value="price">Menor precio</option><option value="price-desc">Mayor precio</option></select></div>
   <CatalogGrid resetKey={JSON.stringify([filters.purchaseMode,filters.content,filters.dimensions,filters.color,filters.sellerType,filters.companySize,filters.department,filters.minPrice,filters.maxPrice,selectedCategories,query,supplier,brand,size,today,shippingIncludedOnly,sort,favoritesOnly,productType,model,productId,referenceId])} items={listings.map(({offer:p,offers})=><ProductCard key={p.referenceId} product={p} offerCount={offers.length} compared={comparison.includes(p.id)} compareDisabled={comparison.length>=3&&!comparison.includes(p.id)} onCompare={id=>setComparison(current=>current.includes(id)?current.filter(x=>x!==id):current.length<3?[...current,id]:current)}/>)}/>
   {filtered.length===0&&<div className="panel"><h3>{favoritesOnly&&!favoriteCount?"Todavía no tenés favoritos":"No encontramos productos con estos filtros."}</h3><p className="muted">{favoritesOnly&&!favoriteCount?"Tocá el corazón de un producto para guardarlo acá.":"Probá otra búsqueda, marca, presentación o proveedor."}</p><button className="button secondary" onClick={clearFilters}>Limpiar filtros</button></div>}</>}
</div></section>{comparison.length>0&&<aside className="retail-compare-tray"><div><strong>{comparison.length} de 3 productos seleccionados</strong><span>{comparison.map(id=>catalogProducts.find(p=>p.id===id)?.name).filter(Boolean).join(" · ")}</span></div><button type="button" className="button secondary" onClick={()=>setComparison([])}>Limpiar</button><button type="button" className="button primary" disabled={comparison.length<2} onClick={()=>setCompareOpen(true)}>Comparar</button></aside>}{compareOpen&&<ProductComparison products={catalogProducts.filter(p=>comparison.includes(p.id))} onClose={()=>setCompareOpen(false)}/>}</div>;
}

const supplierProducts=getSupplierProducts;

export function CementSuppliers(){const offers=useSupplierOffers();const providers=useProviders();return <><section className="cement-supplier-grid">{providers.map(s=><article className="panel cement-supplier-card" key={s.slug}><div className="supplier-cover">{s.banner&&<img src={s.banner} alt="" loading="lazy"/>}<span>{s.initials}</span></div><div className="supplier-card-body"><p className="eyebrow">{s.businessType} · {s.companySize}</p><h2>{s.name}</h2><p className="muted">{s.area}</p><p>{s.description}</p><div className="supplier-facts"><span>★ {s.score}<small>Calificación</small></span><Link className="supplier-product-count" href={marketplaceHref({supplier:s.slug,completeCatalog:true})}>{supplierProducts(s.slug,offers).length} productos<small>Ver en Marketplace →</small></Link></div><p className="supplier-brands">{[...new Set(supplierProducts(s.slug,offers).map(p=>p.brand))].slice(0,6).join(" · ")}</p><Link className="button primary full" href={`/proveedores/${s.slug}`}>Ver proveedor y productos →</Link></div></article>)}</section><SupplierProductIndex/></>}

export function CementSupplierProfile({slug}:{slug:string}){
 const offers=useSupplierOffers();
 const providers=useProviders();
 const supplier=providers.find(s=>s.slug===slug);if(!supplier)return <section className="panel"><h2>Proveedor no encontrado</h2><Link href="/proveedores">Volver a proveedores</Link></section>;
 return <><Link className="text-link" href="/proveedores">← Todos los proveedores</Link><section className="supplier-hero panel cement-profile"><span className="supplier-logo big" style={{background:supplier.color}}>{supplier.initials}</span><div><h2>{supplier.name}</h2><p>{supplier.businessType} · {supplier.companySize}</p><p>{supplier.area}</p></div><Link className="button primary" href={marketplaceHref({supplier:slug,completeCatalog:true})}>Ver marketplace</Link></section><section className="two-col"><article className="panel"><p className="eyebrow">Sobre el proveedor</p><h2>Abastecimiento para cada etapa de obra</h2><p className="supplier-description">{supplier.description}</p><div className="supplier-profile-details"><span><strong>Zona de operación</strong>{supplier.address}</span><span><strong>Horario de atención</strong>{supplier.hours}</span><span><strong>Marcas disponibles</strong>{[...new Set(supplierProducts(slug,offers).map(p=>p.brand))].join(" · ")}</span></div></article><article className="panel"><p className="eyebrow">Condiciones de compra</p><h2>Entrega y pago protegido</h2><div className="supplier-profile-details"><span><strong>Próxima entrega estimada</strong>{supplier.arrival}</span><span><strong>Modalidades</strong>Flete a obra · Retiro en depósito · Compra por pack</span><span><strong>Pago</strong>ARGt con Belo · Reserva de fondos contra entrega</span></div></article></section><section><div className="section-head"><div><p className="eyebrow">Catálogo del proveedor</p><h2><Link className="supplier-product-count" href={marketplaceHref({supplier:slug,completeCatalog:true})}>{supplierProducts(slug,offers).length} productos para tu obra ↗</Link></h2></div></div><SupplierProductIndex key={slug} supplierSlug={slug}/></section></>;
}
