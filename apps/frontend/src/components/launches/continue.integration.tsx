'use client';

/**
 * DIVERGÊNCIA DO UPSTREAM — fork do Media Hub.
 *
 * Esta é a única tela que o usuário final vê fora do Media Hub durante a
 * conexão de um canal: o OAuth da Meta volta para cá (o `redirect_uri`
 * registrado no app aponta para este domínio), o token é trocado aqui e só
 * então o navegador segue para o `returnURL` do Media Hub.
 *
 * Por isso ela foi neutralizada: saíram as manchas roxo/rosa e o spinner
 * #612BD3 do Postiz, entraram os tokens do produto (#050506 / #F5F5F7 /
 * #0A84FF) e os textos passaram a ser pt-BR literais — sem `useT`, porque a
 * tradução em inglês venceria o texto padrão.
 *
 * A marca do Media Hub aparece no topo (ver o layout desta rota): quem acabou de
 * autorizar a conta na Meta precisa reconhecer para onde está voltando.
 *
 * Ao rebasear no upstream, conferir se estes quatro estados (carregando, erro,
 * conta conectada e seleção de conta) continuam existindo.
 */

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { HttpStatusCode } from 'axios';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';
import { continueProviderList } from '@gitroom/frontend/components/new-launch/providers/continue-provider/list';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useVariables } from '@gitroom/react/helpers/variable.context';

/**
 * Para onde mandar quem chega ao fim desta tela sem um retorno em mãos (um F5
 * depois que o `redirect:{state}` saiu do Redis, por exemplo). Fixo porque este
 * fork serve uma instância só, dedicada ao Media Hub.
 */
const MEDIA_HUB_URL = 'https://mediahub.social';

interface TwoStepState {
  integrationId: string;
  onboarding: boolean;
  pages: any[];
  returnURL?: string;
}

interface SuccessState {
  message: string;
}

export const ContinueIntegration: FC<{
  provider: string;
  searchParams: any;
  logged: boolean;
}> = (props) => {
  const { provider, searchParams, logged } = props;
  const { push } = useRouter();
  const fetch = useFetch();
  const { extensionId, backendUrl } = useVariables();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [twoStepState, setTwoStepState] = useState<TwoStepState | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to handle navigation - redirects if logged or returnURL exists, otherwise shows inline
  const navigateOrShow = useCallback(
    (path: string, returnURL: string | undefined, successMessage: string) => {
      if (returnURL) {
        // If returnURL exists, always redirect to it with the path params
        const params = path.includes('?') ? path.split('?')[1] : '';
        push(params ? `${returnURL}?${params}` : returnURL);
        return;
      }

      // Fork Media Hub: SEM returnURL a gente termina aqui mesmo, nunca no
      // painel (`/launches`).
      //
      // O upstream empurra o usuário logado para o painel quando não há
      // returnURL, e é o que acontecia num F5 nesta tela: o `redirect:{state}`
      // já foi consumido do Redis, então o retorno some e a pessoa cai dentro do
      // Postiz. Quem conecta um canal usa o Media Hub e não faz ideia de que
      // esta instância existe — nem deve fazer.
      setSuccessState({ message: successMessage });
    },
    [push]
  );
  const modifiedParams = useMemo(() => {
    if (provider === 'mewe') {
      return {
        state: searchParams.state || '',
        code: searchParams.loginRequestToken || '',
        refresh: searchParams.refresh || '',
      };
    }
    if (provider === 'x') {
      return {
        state: searchParams.oauth_token || '',
        code: searchParams.oauth_verifier || '',
        refresh: searchParams.refresh || '',
      };
    }

    if (provider === 'vk') {
      return {
        ...searchParams,
        state: searchParams.state || '',
        code: searchParams.code + '&&&&' + searchParams.device_id,
      };
    }

    if (provider === 'mewe') {
      const hash =
        typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
      const hashParams = new URLSearchParams(hash);
      return {
        state: hashParams.get('state') || searchParams.state || '',
        code: hashParams.get('loginRequestToken') || '',
        refresh: searchParams.refresh || '',
      };
    }

    return searchParams;
  }, []);

  useEffect(() => {
    (async () => {
      const timezone = String(dayjs.tz().utcOffset());

      // Try public endpoint first (handles both public and fallback scenarios)
      let data = await fetch(`/integrations/social-connect/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ ...modifiedParams, timezone }),
      });

      // If public endpoint fails with specific errors, try authenticated endpoint
      if (data.status === HttpStatusCode.BadRequest) {
        const errorData = await data.json().catch(() => ({}));
        // "Invalid connection type" means this wasn't started as a public flow
        if (
          errorData.message?.includes('Invalid connection type') ||
          errorData.message?.includes('Invalid or expired state')
        ) {
          data = await fetch(`/integrations/social-connect/${provider}`, {
            method: 'POST',
            body: JSON.stringify({ ...modifiedParams, timezone }),
          });
        }
      }

      if (data.status === HttpStatusCode.PreconditionFailed) {
        const { returnURL } = await data.json().catch(() => ({}));
        navigateOrShow(
          `/launches?precondition=true`,
          returnURL,
          'Precondition failed'
        );
        return;
      }

      if (data.status === HttpStatusCode.NotAcceptable) {
        const { msg, returnURL } = await data.json();
        navigateOrShow(`/launches?msg=${msg}`, returnURL, msg);
        return;
      }

      if (
        data.status !== HttpStatusCode.Ok &&
        data.status !== HttpStatusCode.Created
      ) {
        const errorData = await data.json().catch(() => ({}));
        setErrorMessage(
          errorData.message || errorData.msg || 'Could not add provider'
        );
        setError(true);
        return;
      }

      const {
        inBetweenSteps,
        id,
        onboarding: resOnboarding,
        pages,
        returnURL,
        extensionToken,
      } = await data.json();
      const onboarding = resOnboarding || searchParams.onboarding === 'true';

      // Store refresh token in extension for background cookie refresh
      if (
        extensionToken &&
        extensionId &&
        typeof chrome !== 'undefined' &&
        chrome?.runtime?.sendMessage
      ) {
        try {
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: 'STORE_REFRESH_TOKEN',
              provider,
              integrationId: id,
              jwt: extensionToken,
              backendUrl,
            },
            () => {}
          );
        } catch {
          // Silently ignore — extension may not be available
        }
      }

      // If it's a two-step provider, show the selection UI inline
      if (inBetweenSteps && !searchParams.refresh) {
        setTwoStepState({
          integrationId: id,
          onboarding,
          pages: pages || [],
          returnURL,
        });
        return;
      }

      navigateOrShow(
        `/launches?added=${provider}&msg=Channel Updated${
          onboarding ? '&onboarding=true' : ''
        }`,
        returnURL,
        'Channel Updated'
      );
    })();
  }, []);

  const onSave = useCallback(
    async (data: any) => {
      if (!twoStepState) return;

      setIsSaving(true);

      try {
        // Fork Media Hub: o caminho NÃO pode ser escolhido pelo cookie.
        //
        // A rota autenticada resolve a organização pelo cookie `auth` do
        // navegador. Quem conecta pelo Media Hub nunca tem sessão aqui — exceto
        // quem um dia entrou no painel do Postiz, e aí `logged` mandava a
        // chamada para a rota autenticada, que procurava a integração na
        // organização do painel em vez da organização da agência dona dela.
        // Resultado: 404 no último passo de uma conexão que já tinha dado certo
        // na Meta, e tela congelada (o `customFetch` devolve uma promessa que
        // nunca resolve quando a resposta é recusada).
        //
        // Com `state` na URL, o fluxo veio de fora e a organização certa está no
        // Redis, atrás da rota pública. A autenticada continua como segunda
        // tentativa, para não quebrar quem usa o painel do Postiz de verdade.
        const publicEndpoint = `/integrations/public/provider/${twoStepState.integrationId}/connect`;
        const authedEndpoint = `/integrations/provider/${twoStepState.integrationId}/connect`;
        const candidates = modifiedParams?.state
          ? logged
            ? [publicEndpoint, authedEndpoint]
            : [publicEndpoint]
          : [authedEndpoint];

        let response: Response | null = null;
        for (const endpoint of candidates) {
          response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ ...modifiedParams, ...data }),
          });

          if (
            response.status === HttpStatusCode.Ok ||
            response.status === HttpStatusCode.Created
          ) {
            break;
          }
        }

        if (
          !response ||
          (response.status !== HttpStatusCode.Ok &&
            response.status !== HttpStatusCode.Created)
        ) {
          const errorData = await response?.json().catch(() => ({}));
          setErrorMessage(
            errorData?.message || 'Não foi possível concluir a conexão do canal.'
          );
          setError(true);
          return;
        }

        navigateOrShow(
          `/launches?added=${provider}&msg=Channel Added${
            twoStepState.onboarding ? '&onboarding=true' : ''
          }`,
          twoStepState.returnURL,
          'Channel Added'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [twoStepState, fetch, modifiedParams, provider, navigateOrShow]
  );

  const Provider = useMemo(() => {
    return (
      continueProviderList[provider as keyof typeof continueProviderList] ||
      null
    );
  }, [provider]);

  const providerDisplayName = useMemo(() => {
    const names: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      'linkedin-page': 'LinkedIn',
      youtube: 'YouTube',
      gmb: 'Google Business',
      tumblr: 'Tumblr',
    };
    return names[provider] || provider;
  }, [provider]);

  // Success state for non-logged users without returnURL
  if (successState) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#F5F5F7] relative overflow-hidden">
        <div className="relative z-10 text-center">
          <div className="w-[80px] h-[80px] mx-auto mb-[24px] rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-[40px] h-[40px] text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-[28px] font-semibold mb-[12px]">
            Conta conectada
          </div>
          <div className="text-[16px] text-[#A1A1AA] max-w-[400px]">
            {successState.message ||
              `Sua conta do ${providerDisplayName} foi conectada. Você já pode fechar esta janela.`}
          </div>
          <a
            href={MEDIA_HUB_URL}
            className="mt-[24px] inline-flex h-[40px] items-center rounded-[10px] bg-[#0A84FF] px-[24px] text-[14px] font-medium text-white"
          >
            Voltar ao Media Hub
          </a>
        </div>
      </div>
    );
  }

  // Show the two-step selection UI
  //
  // Uma coluna que cresce até um limite legível e respira nas bordas. A tela
  // antiga travava em 550 px no desktop e encostava nas margens no celular — e
  // muita conexão acontece no celular.
  if (twoStepState && Provider) {
    return (
      <div className="flex flex-1 flex-col justify-center text-[#F5F5F7] px-[16px] py-[24px] sm:px-[24px] sm:py-[40px]">
        {/* No celular a marca emoldura o cartão: símbolo em cima, nome embaixo.
            No desktop ela entra dentro do cartão, na linha do botão — ver
            `with-continue-provider`. */}
        <header className="flex justify-center pb-[20px] sm:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mediahub-icon.png" alt="Media Hub" className="h-[36px] w-auto" />
        </header>

        <div className="relative z-10 w-full max-w-[860px] mx-auto">
          <div className="bg-[#161618] rounded-[16px] p-[20px] sm:p-[28px] flex flex-col gap-[20px] sm:gap-[24px]">
            <div className="flex flex-col gap-[8px] text-center">
              <h1 className="text-[20px] sm:text-[24px] font-semibold">Escolha a conta</h1>
              <p className="text-[13px] sm:text-[14px] text-[#A1A1AA]">
                {`Selecione a página ou conta do ${providerDisplayName} que você quer conectar.`}
              </p>
            </div>

            <IntegrationContext.Provider
              value={{
                date: newDayjs(),
                value: [],
                allIntegrations: [],
                integration: {
                  editor: 'normal',
                  additionalSettings: '',
                  display: '',
                  time: [{ time: 0 }],
                  id: twoStepState.integrationId,
                  type: '',
                  name: '',
                  picture: '',
                  inBetweenSteps: true,
                  changeNickName: false,
                  changeProfilePicture: false,
                  identifier: provider,
                },
              }}
            >
              <Provider
                onSave={onSave}
                existingId={[]}
                initialData={twoStepState.pages}
                isSaving={isSaving}
              />
            </IntegrationContext.Provider>
          </div>
        </div>

        <footer className="flex justify-center pt-[20px] sm:hidden">
          <span className="text-[15px] font-medium tracking-[0.01em] text-[#F5F5F7]">media hub</span>
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#F5F5F7] relative overflow-hidden">
        <div className="relative z-10 text-center">
          <div className="w-[80px] h-[80px] mx-auto mb-[24px] rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-[40px] h-[40px] text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-[28px] font-semibold mb-[12px]">
            Não foi possível conectar
          </div>
          <div className="text-[16px] text-[#A1A1AA] max-w-[400px]">
            {errorMessage || 'Algo deu errado na autorização. Volte e tente de novo.'}
          </div>
          <a
            href={MEDIA_HUB_URL}
            className="mt-[24px] inline-flex h-[40px] items-center rounded-[10px] bg-[#0A84FF] px-[24px] text-[14px] font-medium text-white"
          >
            Voltar ao Media Hub
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex flex-1 items-center justify-center text-[#F5F5F7] relative overflow-hidden">
      <div className="relative z-10 text-center">
        <div className="text-[28px] font-semibold mb-[12px]">
          Conectando sua conta
        </div>
        <div className="text-[16px] text-[#A1A1AA]">
          Isso leva alguns segundos. Não feche esta janela.
        </div>
        {/* Loading spinner */}
        <div className="mt-[32px] flex justify-center">
          <div className="w-[48px] h-[48px] border-[3px] border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};
