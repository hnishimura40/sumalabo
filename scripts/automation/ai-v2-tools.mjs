export function selectToolCards(model,policy,registry){
  const categoryIds=[...new Set(policy.toolMappings.filter(m=>m.tags.some(tag=>(model.tags||[]).includes(tag))).flatMap(m=>m.categories))];
  return categoryIds.map(id=>registry.categories?.[id]).filter(card=>{
    if(!card||card.status!=='published'||card.imageVerified!==true||!card.headline||!card.issue||!card.model||!/^\/articles\/[a-z0-9-]+\/$/.test(card.href))return false;
    try{const image=new URL(card.imageUrl);return ['tshop.r10s.jp','thumbnail.image.rakuten.co.jp','image.rakuten.co.jp'].includes(image.hostname)&&image.protocol==='https:'&&!image.username&&!image.password;}catch{return false;}
  }).slice(0,2);
}
export function publishedPickEntry(review,snapshot,receipt,category){
  const selected=review.picks?.default;if(selected?.status!=='selected')return null;
  const product=review.products.find(p=>p.id===selected.productId);
  if(!product?.image?.imageUrl||!selected.claim)throw Error('published_pick_photo_required');
  return {categoryId:category.id,status:'published',headline:selected.claim.split('。')[0],model:product.model,imageUrl:product.image.imageUrl,imageVerified:true,issue:snapshot.updatedOn.slice(0,7).replace('/','.'),href:'/articles/'+category.articleSlug+'/',publishedVersion:receipt.version};
}
