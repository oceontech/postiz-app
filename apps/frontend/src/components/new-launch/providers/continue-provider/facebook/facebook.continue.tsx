'use client';

import { withContinueProvider } from '../with-continue-provider';

interface FacebookItem {
  id: string;
  username: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
}

export const FacebookContinue = withContinueProvider<FacebookItem, string>({
  endpoint: 'pages',
  swrKey: 'load-facebook-pages',
  titleKey: 'select_page',
  titleDefault: 'Escolha a página:',
  emptyStateMessages: [
    {
      key: 'we_couldn_t_find_any_business_connected_to_the_selected_pages',
      text: 'Nenhuma conta comercial ficou vinculada às páginas autorizadas.',
    },
    {
      key: 'we_recommend_you_to_connect_all_the_pages_and_all_the_businesses',
      text: 'Volte e autorize todas as páginas e todos os negócios da conta.',
    },
    {
      key: 'please_close_this_dialog_delete_your_integration_and_add_a_new_channel_again',
      text: 'Depois feche esta janela e conecte o canal de novo pelo Media Hub.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => item.id,
  transformSaveData: (selection) => ({ page: selection }),
  isSelected: (item, selection) => selection === item.id,
  renderItem: (item) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="aspect-square w-full rounded-[8px] object-cover"
        src={item.picture.data.url}
        alt=""
      />
      <div className="text-[12.5px] leading-[17px] line-clamp-2 break-words">{item.name}</div>
    </>
  ),
});
