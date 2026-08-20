import { ReactNode } from 'react';

export default async function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-[#050506] flex flex-1 min-h-screen w-screen">
      {/*
        Fork Media Hub: o miolo desta tela (a grade de páginas e o botão) é o
        `with-continue-provider`, componente compartilhado que pinta com os
        tokens do tema do Postiz — `bg-forth` no botão, `border-primary` na
        seleção. Reescrever o componente por causa de cor seria brigar com todo
        rebase futuro; redefinir as variáveis **só nesta rota** deixa o
        componente intacto e a tela com a cara do produto.
      */}
      {/* Geist é a tipografia do Media Hub (`--font-geist` no app). Aqui ela
          vem do Google Fonts porque esta rota vive no frontend do Postiz, que
          não conhece as fontes do nosso build. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap"
      />
      <style>{`
        .integration-return-scope,
        .integration-return-scope button,
        .integration-return-scope input {
          font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .integration-return-scope {
          --color-primary: #0A84FF;
          --color-forth: #0A84FF;
          --color-third: #202023;
          --color-seventh: #202023;
          --color-input: #2A2A2F;
          --new-btn-text: #FFFFFF;
        }
      `}</style>
      <div className="integration-return-scope flex flex-1 flex-col">
        {/*
          A marca fica visível durante a conexão inteira. Quem autorizou a conta
          na Meta precisa reconhecer para onde está voltando — e o revisor do App
          Review precisa ver que este passo pertence ao app submetido, não a uma
          ferramenta qualquer no meio do caminho.
        */}
        <header className="flex justify-center pt-[28px] pb-[8px]">
          <img src="/mediahub-logo.png" alt="Media Hub" className="h-[26px] w-auto" />
        </header>
        <div className="flex flex-1">{children}</div>
      </div>
    </div>
  );
}
