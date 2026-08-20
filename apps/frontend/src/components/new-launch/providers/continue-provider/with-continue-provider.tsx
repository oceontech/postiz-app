'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

const SWR_OPTIONS = {
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  revalidateOnReconnect: false,
  refreshInterval: 0,
};

export interface ContinueProviderProps {
  onSave: (data: any) => Promise<void>;
  existingId: string[];
  initialData?: any[];
  isSaving?: boolean;
}

export interface EmptyStateMessage {
  key: string;
  text: string;
}

export interface ContinueProviderConfig<TItem, TSelection> {
  endpoint: string;
  swrKey: string;
  titleKey: string;
  titleDefault: string;
  emptyStateMessages: EmptyStateMessage[];
  getSelectionValue: (item: TItem) => TSelection;
  transformSaveData: (selection: TSelection) => any;
  renderItem: (item: TItem, isSelected: boolean) => ReactNode;
  isSelected: (item: TItem, selection: TSelection | null) => boolean;
  getItemId: (item: TItem) => string;
}

export function withContinueProvider<TItem, TSelection>(
  config: ContinueProviderConfig<TItem, TSelection>
): FC<ContinueProviderProps> {
  const {
    endpoint,
    swrKey,
    titleDefault,
    emptyStateMessages,
    getSelectionValue,
    transformSaveData,
    renderItem,
    isSelected,
    getItemId,
  } = config;

  return function ContinueProviderComponent(props: ContinueProviderProps) {
    const { onSave, existingId, initialData, isSaving } = props;
    const call = useCustomProviderFunction();
    const [selection, setSelection] = useState<TSelection | null>(null);

    const loadData = useCallback(async () => {
      // Skip fetch if initial data was provided
      if (initialData) {
        return initialData;
      }
      try {
        return await call.get(endpoint);
      } catch (e) {
        // Handle error silently
      }
    }, [initialData]);

    const { data, isLoading } = useSWR(
      initialData ? null : swrKey,
      loadData,
      SWR_OPTIONS
    );

    const resolvedData = initialData || data;

    const handleSelect = useCallback(
      (item: TItem) => () => {
        setSelection(getSelectionValue(item));
      },
      []
    );

    const handleSave = useCallback(async () => {
      if (selection) {
        await onSave(transformSaveData(selection));
      }
    }, [onSave, selection]);

    const filteredData = useMemo(() => {
      return (
        (resolvedData as TItem[])?.filter(
          (item) => !existingId.includes(getItemId(item))
        ) || []
      );
    }, [resolvedData, existingId]);

    if (!isLoading && !resolvedData?.length) {
      return (
        <div className="text-center flex flex-col justify-center items-center gap-[8px] text-[15px] sm:text-[17px] leading-[24px] py-[40px]">
          {emptyStateMessages.map((msg, index) => (
            <span key={msg.key}>
              {msg.text}
              {index < emptyStateMessages.length - 1 && (
                <>
                  <br />
                  <br />
                </>
              )}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[16px]">
        {/* Fork Media Hub: o texto vem cru do provider, sem `t()`. Esta tela
            aparece no meio da conexão de um canal do Media Hub, cujo idioma é
            pt-BR; a tradução em inglês do Postiz venceria o texto padrão. */}
        <div className="text-[14px] font-medium">{titleDefault}</div>
        {/* Duas colunas no celular, mais conforme a tela cresce. A grade rola
            dentro do cartão, para o botão nunca ficar abaixo da dobra quando a
            conta tem trinta páginas. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 select-none cursor-pointer gap-[10px] max-h-[52vh] overflow-y-auto overflow-x-hidden pr-[4px]">
          {filteredData.map((item) => (
            <div
              key={getItemId(item)}
              // Fork Media Hub: cartão sem borda, num tom acima do fundo — é
              // assim que superfície clicável se anuncia no painel do produto.
              // Selecionado ganha o azul de ação em fundo suave, que é sinal
              // mais forte que uma borda de 1px e não mexe no tamanho da caixa.
              className={clsx(
                'flex flex-col w-full min-w-0 text-center gap-[8px] p-[10px] rounded-[12px] transition-colors',
                isSelected(item, selection)
                  ? 'bg-[rgba(10,132,255,0.18)]'
                  : 'bg-[#202023] hover:bg-[#29292D]'
              )}
              onClick={handleSelect(item)}
            >
              {renderItem(item, isSelected(item, selection))}
            </div>
          ))}
        </div>
        {/* A linha de rodapé do cartão: marca à esquerda, ação à direita. No
            celular a marca sai daqui (ela emoldura o cartão, ver
            `continue.integration`) e o botão ocupa a largura toda, onde o
            polegar mira uma faixa e não um botão de 120 px encostado à borda. */}
        <div className="flex items-center justify-between gap-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mediahub-logo.png" alt="Media Hub" className="hidden sm:block h-[22px] w-auto" />
          <Button
            className="rounded-[10px] w-full sm:w-auto"
            disabled={!selection || isSaving}
            loading={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Conectando…' : 'Conectar'}
          </Button>
        </div>
      </div>
    );
  };
}
