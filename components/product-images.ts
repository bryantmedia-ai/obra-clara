export function productImage(image:string){
 if(!image)return '/products/product-placeholder.svg';
 if(image.startsWith('https://')||image.startsWith('data:image/'))return image;
 if(image.startsWith('/'))return image;
 return '/products/'+image.replace(/^products\//,'');
}
