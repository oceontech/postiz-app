'use client';

import { withContinueProvider } from '../with-continue-provider';

interface InstagramItem {
  id: string;
  pageId: string;
  username: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
}

interface InstagramSelection {
  id: string;
  pageId: string;
}

export const InstagramContinue = withContinueProvider<
  InstagramItem,
  InstagramSelection
>({
  endpoint: 'pages',
  swrKey: 'load-instagram-pages',
  titleKey: 'select_instagram_account',
  titleDefault: 'Escolha a conta do Instagram:',
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
  getSelectionValue: (item) => ({ id: item.id, pageId: item.pageId }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
  renderItem: (item) => (
    <>
      <div>
        <img
          className="w-full max-w-[156px]"
          src={item.picture.data.url}
          alt="profile"
        />
      </div>
      <div>{item.name}</div>
    </>
  ),
});
