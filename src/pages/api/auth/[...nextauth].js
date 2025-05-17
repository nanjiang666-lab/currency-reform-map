import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name:'管理员登录',
      credentials:{
        email:{label:'邮箱',type:'text'},
        password:{label:'密码',type:'password'}
      },
      async authorize(creds){
        if(creds.email===process.env.ADMIN_EMAIL
           && creds.password===process.env.ADMIN_PASSWORD){
          return {name:'Admin',email:creds.email};
        }
        return null;
      }
    })
  ],
  session:{strategy:'jwt'},
  secret:process.env.NEXTAUTH_SECRET
});
