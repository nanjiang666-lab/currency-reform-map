import { getServerSession } from 'next-auth/next';
import authOptions from './auth/[...nextauth]';

export default async function handler(req,res){
  const session = await getServerSession(req,res,authOptions);
  if(!session||session.user.email!==process.env.ADMIN_EMAIL){
    return res.status(401).json({error:'Unauthorized'});
  }
  if(req.method==='POST'){
    console.log('事件数据：',req.body);
    return res.status(200).json({success:true});
  }
  res.status(405).end();
}

