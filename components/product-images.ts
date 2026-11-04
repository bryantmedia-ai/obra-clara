export function productImage(image:string){return image.startsWith("https://")?image:`/products/${image}`;}
