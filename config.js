/* 2Fit · conexão com o Supabase
   Preencha com os dados do projeto: Supabase > Project Settings > API.
   - url: "Project URL"
   - anonKey: a chave "anon public"
   Essas duas informações podem ficar públicas: quem protege os dados é o login
   e as regras de segurança do supabase/setup.sql. Nunca coloque a "service_role" aqui.
   Deixando vazio, o app funciona normal, salvando só no celular. */
window.TWOFIT_SUPABASE = {
  url: '',
  anonKey: ''
};
