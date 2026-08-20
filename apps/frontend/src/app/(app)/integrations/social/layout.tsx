import { ReactNode } from 'react';

/**
 * Sem isto a aba mostra a URL crua (`postiz.mediahub.social/inte…`), que é
 * justamente o nome que o usuário não deveria ler em lugar nenhum.
 */
export const metadata = {
  title: 'Conectando sua conta · Media Hub',
};

export default async function IntegrationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-[#050506] flex flex-1 min-h-[100dvh] w-full overflow-x-hidden">
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
        /* A barra de rolagem do design system do Media Hub: fina, sem trilho,
           polegar no tom da borda forte. A do Postiz é clara e grossa e
           dominava a lateral do cartão. */
        .integration-return-scope ::-webkit-scrollbar { width: 10px; height: 10px; }
        .integration-return-scope ::-webkit-scrollbar-track { background: transparent; }
        .integration-return-scope ::-webkit-scrollbar-thumb {
          background: #3C3C42;
          border-radius: 8px;
          border: 2px solid #161618;
        }
        .integration-return-scope ::-webkit-scrollbar-thumb:hover { background: #4A4A52; }
        .integration-return-scope * { scrollbar-width: thin; scrollbar-color: #3C3C42 transparent; }

        .integration-return-scope {
          --color-primary: #0A84FF;
          --color-forth: #0A84FF;
          --color-third: #202023;
          --color-seventh: #202023;
          --color-input: #2A2A2F;
          --new-btn-text: #FFFFFF;
        }
      `}</style>
      {/*
        Sem logo: a tela é uma passagem de poucos segundos, e uma marca pequena
        no topo de uma tela vazia pesa mais do que informa. Quem precisa aparecer
        aqui é o provider que a pessoa está autorizando, não nós.
      */}
      <div className="integration-return-scope flex flex-1">{children}</div>
    </div>
  );
}
