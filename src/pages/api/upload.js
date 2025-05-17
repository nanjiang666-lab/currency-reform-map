import { put } from '@vercel/blob';
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).end();
  try{
    const {filename} = req.query;
    const blob = await put(filename,req,{access:'public',addRandomSuffix:true});
    res.status(200).json(blob);
  }catch(err){
    res.status(500).json({error:err.message});
  }
}
