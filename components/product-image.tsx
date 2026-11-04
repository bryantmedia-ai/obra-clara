"use client";
import type {ImgHTMLAttributes} from 'react';
import {productImage} from './product-images';
export function ProductImage({source,alt,...props}:Omit<ImgHTMLAttributes<HTMLImageElement>,'src'|'onError'>&{source?:string;alt:string}){return <img {...props} src={productImage(source??'')} alt={alt} loading={props.loading??'lazy'} onError={e=>{const image=e.currentTarget;if(image.src.endsWith('/products/product-placeholder.svg'))return;image.src='/products/product-placeholder.svg';}}/>;}
