"use client";
import {toggleFavorite,useFavorites} from "./favorites-store";
export function FavoriteButton({itemId,name}:{itemId:string;name:string}){
 const selected=useFavorites().includes(itemId);
 return <button type="button" className={`favorite-button${selected?" is-favorite":""}`} aria-pressed={selected} aria-label={`${selected?"Quitar de":"Agregar a"} favoritos: ${name}`} title={selected?"Quitar de favoritos":"Agregar a favoritos"} onClick={()=>toggleFavorite(itemId)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg></button>;
}
