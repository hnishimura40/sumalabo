import {absoluteUrl,buildBreadcrumbSchema,ORGANIZATION_ID,WEBSITE_ID} from './structured-data';
import publication from '../data/ai-guide-publication.json';
import {featured} from '../data/ai-featured';

export function buildAiGuideSchema(title=publication.title,description=publication.description,path='/ai/',current='AI比較') {
 const root=path==='/ai/';
 return {
  '@context':'https://schema.org',
  '@graph':[
   buildBreadcrumbSchema(root?[{name:'AI比較'}]:[{name:'AI比較',path:'/ai/'},{name:current}]),
   {'@type':'CollectionPage','@id':absoluteUrl(path)+'#webpage',url:absoluteUrl(path),name:title,description,inLanguage:'ja',isPartOf:{'@id':WEBSITE_ID},publisher:{'@id':ORGANIZATION_ID},...(root?{datePublished:publication.datePublished,dateModified:publication.dateModified,mainEntity:{'@type':'ItemList',name:'主要6サービスの比較',itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:featured.length,itemListElement:featured.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:absoluteUrl(`/ai/#major-detail-${p.id}`)}))}}:{})}
  ]
 };
}
